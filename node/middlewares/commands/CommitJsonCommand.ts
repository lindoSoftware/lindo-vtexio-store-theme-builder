import { Command } from '../../typings/command'
import type { SectionDataMap } from '../../typings/sections-map'
import { initGitHubClient } from '../../utils/github.helper'
import type { GeneratedFile } from './BuildJsonCommand'

export class CommitJsonCommand<
  TSection extends keyof SectionDataMap = keyof SectionDataMap
> extends Command<TSection> {
  private readonly ctx: Context
  private readonly files: GeneratedFile[]

  constructor(
    section: TSection,
    data: SectionDataMap[TSection],
    ctx: Context,
    files: GeneratedFile[]
  ) {
    super(section, data)
    this.ctx = ctx
    this.files = files
  }

  /**
   * Ejecuta el comando principal
   */
  public async execute(): Promise<void> {
    try {
      // Sin archivos generados no hay nada para commitear: se evita incluso
      // pedir el token de GitHub.
      if (!this.files.length) {
        this.ctx.vtex.logger.info({
          message:
            '[CommitJsonCommand] No files to commit. Skipping GitHub sync.',
        })

        return
      }

      await initGitHubClient(this.ctx)

      // Se commitea en serie: cada commit depende del SHA que dejó el
      // anterior, así que no se pueden paralelizar.
      for (const file of this.files) {
        // eslint-disable-next-line no-await-in-loop
        await this.commitFile(file)
      }

      this.ctx.vtex.logger.info({
        message: `[CommitJsonCommand] Successfully committed ${this.files.length} files.`,
      })
    } catch (error: any) {
      this.ctx.vtex.logger.error({
        message: '[CommitJsonCommand] Failed to commit files.',
        error: error.message,
        stack: error.stack,
      })
      throw error
    }
  }

  /**
   * Crea o actualiza un archivo en GitHub
   */
  private async commitFile(file: GeneratedFile): Promise<void> {
    const filePath = `${file.path}/${file.filename}`.replace(/\/+/g, '/')

    this.ctx.vtex.logger.info({
      message: `[CommitJsonCommand] Syncing file: ${filePath}`,
    })

    // Manejo especial para routes.json
    if (file.filename === 'routes.json') {
      await this.commitRoutesFile(filePath, file.content)

      return
    }

    // Commit normal para otros archivos
    const res = await this.ctx.clients.github.createOrUpdateFile(
      filePath,
      file.content
    )

    if (res?.data?.error) {
      this.ctx.vtex.logger.error({
        message: `[CommitJsonCommand] Error syncing file: ${filePath}`,
        error: res.data.error,
      })
      throw res.data.error
    }

    this.ctx.vtex.logger.info({
      message: `[CommitJsonCommand] File ${filePath} ${res.data.action} successfully (status: ${res.status})`,
    })
  }

  /**
   * Maneja el merge de routes.json con el contenido existente
   */
  private async commitRoutesFile(
    filePath: string,
    newContent: string
  ): Promise<void> {
    try {
      // Intentar obtener el contenido actual de routes.json
      const existingContent = await this.ctx.clients.github.getFileContent(
        filePath
      )

      let mergedRoutes: Record<string, any> = {}

      // Si el archivo existe, hacer merge
      if (existingContent.exists && existingContent.content) {
        const existingRoutes = JSON.parse(existingContent.content)
        const newRoutes = JSON.parse(newContent)

        // Merge: las nuevas rutas sobrescriben las existentes si hay conflicto
        mergedRoutes = {
          ...existingRoutes,
          ...newRoutes,
        }

        this.ctx.vtex.logger.info({
          message: `[CommitJsonCommand] Merging routes.json - Existing: ${
            Object.keys(existingRoutes).length
          }, New: ${Object.keys(newRoutes).length}, Final: ${
            Object.keys(mergedRoutes).length
          }`,
        })
      } else {
        // Si no existe, usar el contenido nuevo directamente
        mergedRoutes = JSON.parse(newContent)
        this.ctx.vtex.logger.info({
          message: `[CommitJsonCommand] Creating new routes.json with ${
            Object.keys(mergedRoutes).length
          } routes`,
        })
      }

      // Commit del contenido mergeado
      const finalContent = JSON.stringify(mergedRoutes, null, 2)
      const res = await this.ctx.clients.github.createOrUpdateFile(
        filePath,
        finalContent
      )

      if (res?.data?.error) {
        this.ctx.vtex.logger.error({
          message: `[CommitJsonCommand] Error syncing routes.json`,
          error: res.data.error,
        })
        throw res.data.error
      }

      this.ctx.vtex.logger.info({
        message: `[CommitJsonCommand] routes.json ${res.data.action} successfully (status: ${res.status})`,
      })
    } catch (error: any) {
      this.ctx.vtex.logger.error({
        message: `[CommitJsonCommand] Error processing routes.json`,
        error: error.message,
      })
      throw error
    }
  }
}
