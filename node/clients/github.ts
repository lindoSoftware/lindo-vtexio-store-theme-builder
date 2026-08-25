import { ExternalClient } from '@vtex/api'
import { Octokit } from '@octokit/rest'
import type { IOContext, InstanceOptions, IOResponse } from '@vtex/api'

import ENV from '../env'

/** Archivo a crear o sobrescribir en un commit. */
export interface GitHubUpsert {
  path: string
  content: string
}

export default class GitHubClient extends ExternalClient {
  private octokit: Octokit
  private branch = 'main'

  constructor(context: IOContext, options?: InstanceOptions) {
    super(ENV.GIT_API_URL ?? '', context, options)
    this.octokit = new Octokit({ auth: '' })
  }

  public async init(token: string, branch?: string): Promise<void> {
    this.octokit = new Octokit({ auth: token })
    this.branch = branch ?? 'main'
  }

  // Obtener contenido de un archivo (método público para usar en CommitJsonCommand)
  public async getFileContent(
    path: string
  ): Promise<{ sha?: string; exists: boolean; content?: string }> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: ENV.GIT_OWNER ?? '',
        repo: ENV.GIT_REPOSITORY ?? '',
        path,
        ref: this.branch,
      })

      if ('sha' in response.data && 'content' in response.data) {
        const content = Buffer.from(response.data.content, 'base64').toString(
          'utf8'
        )

        return { sha: response.data.sha, exists: true, content }
      }

      return { exists: false }
    } catch (error: any) {
      if (error.status === 404) {
        return { exists: false }
      }

      throw error
    }
  }

  // Obtener solo información básica del archivo (privado, para uso interno)
  private async getFileInfo(
    path: string
  ): Promise<{ sha?: string; exists: boolean }> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: ENV.GIT_OWNER ?? '',
        repo: ENV.GIT_REPOSITORY ?? '',
        path,
        ref: this.branch,
      })

      if ('sha' in response.data) {
        return { sha: response.data.sha, exists: true }
      }

      return { exists: false }
    } catch (error: any) {
      if (error.status === 404) {
        return { exists: false }
      }

      throw error
    }
  }

  // Crear o actualizar un archivo (según exista o no)
  public async createOrUpdateFile(
    path: string,
    content: string,
    message?: string
  ): Promise<IOResponse<any>> {
    try {
      const fileInfo = await this.getFileInfo(path)
      const isUpdate = fileInfo.exists
      const { sha } = fileInfo

      // ✅ Si el archivo existe, obtener su contenido actual
      if (isUpdate) {
        const { data } = await this.octokit.repos.getContent({
          owner: ENV.GIT_OWNER ?? '',
          repo: ENV.GIT_REPOSITORY ?? '',
          path,
          ref: this.branch,
        })

        if ('content' in data && typeof data.content === 'string') {
          const remoteContent = Buffer.from(data.content, 'base64').toString(
            'utf8'
          )

          // 🔍 Comparar el contenido actual con el nuevo
          if (remoteContent.trim() === content.trim()) {
            return {
              status: 200,
              data: {
                action: 'skipped',
                reason: 'No changes detected',
              },
              headers: {},
            }
          }
        }
      }

      // ✅ Si llegó hasta acá, o el archivo no existe o cambió
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: ENV.GIT_OWNER ?? '',
        repo: ENV.GIT_REPOSITORY ?? '',
        path,
        message:
          message || (isUpdate ? 'Automated update file' : 'Creating new file'),
        content: Buffer.from(content).toString('base64'),
        branch: this.branch,
        ...(isUpdate && { sha }),
      })

      return {
        status: 200,
        data: {
          action: isUpdate ? 'updated' : 'created',
          ...response.data,
        },
        headers: response.headers as IOResponse<string>['headers'],
      }
    } catch (error: any) {
      return {
        status: error?.status || 500,
        data: { error },
        headers: {},
      }
    }
  }

  /**
   * Aplica varios cambios en un único commit, usando la Git Data API.
   *
   * La API de contenidos solo permite un archivo por commit, y eso deja el repo
   * en estados intermedios inconsistentes —por ejemplo un `routes.json` que
   * apunta a un bloque ya borrado— que disparan builds del theme condenados a
   * fallar. Acá el árbol se arma completo y se commitea de una vez.
   *
   * Si el árbol resultante es idéntico al actual no se commitea nada, para no
   * generar builds al vacío.
   */
  public async commitFiles(
    changes: { upserts?: GitHubUpsert[]; deletions?: string[] },
    message: string
  ): Promise<IOResponse<any>> {
    const owner = ENV.GIT_OWNER ?? ''
    const repo = ENV.GIT_REPOSITORY ?? ''

    const upserts = changes.upserts ?? []
    const deletions = changes.deletions ?? []

    if (!upserts.length && !deletions.length) {
      return { status: 200, data: { action: 'skipped' }, headers: {} }
    }

    try {
      // El ref siempre devuelve el commit real de la branch, así que el árbol
      // base nunca queda desactualizado.
      const { data: ref } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${this.branch}`,
      })

      const parentSha = ref.object.sha

      const { data: parent } = await this.octokit.git.getCommit({
        owner,
        repo,
        commit_sha: parentSha,
      })

      const tree = [
        ...upserts.map((file) => ({
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          content: file.content,
        })),
        // sha en null es como la API expresa "borrar este path".
        ...deletions.map((path) => ({
          path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: null,
        })),
      ]

      const { data: newTree } = await this.octokit.git.createTree({
        owner,
        repo,
        base_tree: parent.tree.sha,
        tree,
      })

      if (newTree.sha === parent.tree.sha) {
        return {
          status: 200,
          data: { action: 'skipped', reason: 'No changes detected' },
          headers: {},
        }
      }

      const { data: commit } = await this.octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [parentSha],
      })

      const response = await this.octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${this.branch}`,
        sha: commit.sha,
      })

      return {
        status: 200,
        data: { action: 'committed', sha: commit.sha },
        headers: response.headers as IOResponse<string>['headers'],
      }
    } catch (error: any) {
      return {
        status: error?.status || 500,
        data: { error },
        headers: {},
      }
    }
  }

  // Eliminar un archivo
  public async deleteFile(path: string, sha: string): Promise<IOResponse<any>> {
    try {
      const response = await this.octokit.repos.deleteFile({
        owner: ENV.GIT_OWNER ?? '',
        repo: ENV.GIT_REPOSITORY ?? '',
        path,
        message: 'Deleting file',
        sha,
        branch: this.branch,
      })

      return {
        status: 200,
        data: '',
        headers: response.headers as IOResponse<string>['headers'],
      }
    } catch (error: any) {
      return {
        status: error?.status || 500,
        data: { error },
        headers: {},
      }
    }
  }
}
