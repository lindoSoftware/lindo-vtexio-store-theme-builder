import { Command } from '../../typings/command'
import type { SectionDataMap } from '../../typings/sections-map'
import { initGitHubClient } from '../../utils/github.helper'
import env from '../../env'
import type { CustomPageRemoval } from '../../services/CustomPageRemovalService'
import type { GeneratedFile } from './BuildJsonCommand'

const ROUTES_FILENAME = 'routes.json'

const NOTHING_TO_REMOVE: CustomPageRemoval = { routeKeys: [], filePaths: [] }

export class CommitJsonCommand<
  TSection extends keyof SectionDataMap = keyof SectionDataMap
> extends Command<TSection> {
  private readonly ctx: Context
  private readonly files: GeneratedFile[]
  private readonly removal: CustomPageRemoval

  constructor(
    section: TSection,
    data: SectionDataMap[TSection],
    ctx: Context,
    files: GeneratedFile[],
    removal: CustomPageRemoval = NOTHING_TO_REMOVE
  ) {
    super(section, data)
    this.ctx = ctx
    this.files = files
    this.removal = removal
  }

  /** Si hay algo para dar de baja del theme. */
  private get hasRemovals(): boolean {
    return Boolean(
      this.removal.routeKeys.length || this.removal.filePaths.length
    )
  }

  /**
   * Ejecuta el comando principal
   */
  public async execute(): Promise<void> {
    try {
      // Sin archivos generados ni rutas para dar de baja no hay nada que hacer:
      // se evita incluso pedir el token de GitHub.
      if (!this.files.length && !this.hasRemovals) {
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
      if (routesFile || this.hasRemovals) {
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
   * Commitea routes.json —merge de lo que hay en el repo con las rutas recién
   * generadas, menos las que hayan quedado viejas— y en el MISMO commit borra
   * los `.jsonc` de las páginas dadas de baja.
   *
   * Que sea un solo commit es lo que evita que el repo pase por un estado con
   * `routes.json` apuntando a un bloque ya borrado: el theme buildea ese commit
   * intermedio y falla.
   *
   * Las rutas generadas se mergean SIEMPRE por encima de lo leído del repo. Es
   * lo que hace que una lectura desactualizada de GitHub no pueda borrar lo que
   * se acaba de publicar, y por eso este es el único lugar del deploy que
   * escribe el archivo.
   */
  private async commitRoutesFile(newContent: string): Promise<void> {
    const filePath = env.ROUTES_FILE_PATH

    try {
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

      for (const key of this.removal.routeKeys) {
        // Una ruta que se acaba de generar nunca se da de baja, por más que
        // venga en la lista: sería borrar la página recién publicada.
        if (key in newRoutes) continue

        delete mergedRoutes[key]
      }

      this.ctx.vtex.logger.info({
        message: `[CommitJsonCommand] Committing routes.json - Existing: ${
          Object.keys(existingRoutes).length
        }, New: ${Object.keys(newRoutes).length}, Removed routes: ${
          this.removal.routeKeys.length
        }, Deleted files: ${this.removal.filePaths.length}, Final: ${
          Object.keys(mergedRoutes).length
        }`,
      })

      const res = await this.ctx.clients.github.commitFiles(
        {
          upserts: [
            { path: filePath, content: JSON.stringify(mergedRoutes, null, 2) },
          ],
          deletions: this.removal.filePaths,
        },
        this.commitMessage()
      )

      if (res?.data?.error) {
        this.ctx.vtex.logger.error({
          message: `[CommitJsonCommand] Error committing routes.json`,
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

  private commitMessage(): string {
    if (!this.removal.filePaths.length) {
      return 'Automated update routes.json'
    }

    return `Automated update routes.json and remove ${this.removal.filePaths.length} stale custom page(s)`
  }
}
