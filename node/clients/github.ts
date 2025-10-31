import { ExternalClient } from '@vtex/api'
import { Octokit } from '@octokit/rest'
import type { IOContext, InstanceOptions, IOResponse } from '@vtex/api'
import ENV from '../env'

export default class GitHubClient extends ExternalClient {
  private octokit: Octokit

  constructor(context: IOContext, options?: InstanceOptions) {
    super(ENV.GIT_API_URL ?? '', context, options)
    this.octokit = new Octokit({ auth: '' })
  }

  public async init(token: string) {
    this.octokit = new Octokit({ auth: token })
  }

  // Obtener contenido de un archivo
  private async getFileContent(
    path: string
  ): Promise<{ sha?: string; exists: boolean }> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: ENV.GIT_OWNER ?? '',
        repo: ENV.GIT_REPOSITORY ?? '',
        path,
        ref: ENV.GIT_BRANCH ?? 'main',
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
      const fileInfo = await this.getFileContent(path)
      const isUpdate = fileInfo.exists
      const sha = fileInfo.sha

      // ✅ Si el archivo existe, obtener su contenido actual
      if (isUpdate) {
        const { data } = await this.octokit.repos.getContent({
          owner: ENV.GIT_OWNER ?? '',
          repo: ENV.GIT_REPOSITORY ?? '',
          path,
          ref: ENV.GIT_BRANCH ?? 'main',
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
        branch: ENV.GIT_BRANCH ?? 'main',
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

  // Eliminar un archivo
  public async deleteFile(path: string, sha: string): Promise<IOResponse<any>> {
    try {
      const response = await this.octokit.repos.deleteFile({
        owner: ENV.GIT_OWNER ?? '',
        repo: ENV.GIT_REPOSITORY ?? '',
        path,
        message: 'Deleting file',
        sha,
        branch: ENV.GIT_BRANCH ?? 'main',
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
