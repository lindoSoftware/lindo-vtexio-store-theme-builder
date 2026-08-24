import { Command } from '../../typings/command'
import type { SectionDataMap } from '../../typings/sections-map'
import { initGitHubClient } from '../../utils/github.helper'
import env from '../../env'
import type { GeneratedFile } from './BuildJsonCommand'

const ROUTES_FILENAME = 'routes.json'

export class CommitJsonCommand<
  TSection extends keyof SectionDataMap = keyof SectionDataMap
> extends Command<TSection> {
  private readonly ctx: Context
  private readonly files: GeneratedFile[]
  private readonly removedRouteKeys: string[]

  constructor(
    section: TSection,
    data: SectionDataMap[TSection],
    ctx: Context,
    files: GeneratedFile[],
    removedRouteKeys: string[] = []
  ) {
    super(section, data)
    this.ctx = ctx
    this.files = files
    this.removedRouteKeys = removedRouteKeys
  }

  /**
   * Ejecuta el comando principal
   */
  public async execute(): Promise<void> {
    try {
      // Sin archivos generados ni rutas para dar de baja no hay nada que hacer:
      // se evita incluso pedir el token de GitHub.
      if (!this.files.length && !this.removedRouteKeys.length) {
        this.ctx.vtex.logger.info({
          message:
            '[CommitJsonCommand] Nothing to commit. Skipping GitHub sync.',
        })

        return
      }

      await initGitHubClient(this.ctx)

      const routesFile = this.files.find(
        (file) => file.filename === ROUTES_FILENAME
      )

      const files = this.files.filter((file) => file !== routesFile)

      // Se commitea en serie: cada commit depende del SHA que dejó el
      // anterior, así que no se pueden paralelizar.
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        await this.commitFile(file)
      }

      // routes.json se escribe una sola vez por deploy, al final: es el único
      // archivo que se arma leyendo el estado actual del repo.
      if (routesFile || this.removedRouteKeys.length) {
        await this.commitRoutesFile(routesFile?.content ?? '{}')
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
   * Escribe routes.json: merge de lo que hay en el repo con las rutas recién
   * generadas, menos las que hayan quedado viejas.
   *
   * Las rutas generadas se mergean SIEMPRE por encima de lo leído del repo. Es
   * lo que hace que una lectura desactualizada de GitHub no pueda borrar lo que
   * se acaba de publicar, y por eso este es el único lugar del deploy que
   * escribe el archivo.
   */
  private async commitRoutesFile(newContent: string): Promise<void> {
    const filePath = env.ROUTES_FILE_PATH

    try {
      // Intentar obtener el contenido actual de routes.json
      const existingContent = await this.ctx.clients.github.getFileContent(
        filePath
      )

      const newRoutes = JSON.parse(newContent)

      const existingRoutes =
        existingContent.exists && existingContent.content
          ? JSON.parse(existingContent.content)
          : {}

      // Merge: las nuevas rutas sobrescriben las existentes si hay conflicto
      const mergedRoutes: Record<string, any> = {
        ...existingRoutes,
        ...newRoutes,
      }

      for (const key of this.removedRouteKeys) {
        // Una ruta que se acaba de generar nunca se da de baja, por más que
        // venga en la lista: sería borrar la página recién publicada.
        if (key in newRoutes) continue

        delete mergedRoutes[key]
      }

      this.ctx.vtex.logger.info({
        message: `[CommitJsonCommand] Merging routes.json - Existing: ${
          Object.keys(existingRoutes).length
        }, New: ${Object.keys(newRoutes).length}, Removed: ${
          this.removedRouteKeys.length
        }, Final: ${Object.keys(mergedRoutes).length}`,
      })

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
        message: `[CommitJsonCommand] ${filePath} ${res.data.action} successfully (status: ${res.status})`,
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
