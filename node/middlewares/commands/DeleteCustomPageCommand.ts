import { Command } from '../../typings/command'
import type { CustomPagesData } from '../../typings/custompage-response'
import { BlockNameHelper } from '../../utils/BlockNameHelper'
import { initGitHubClient } from '../../utils/github.helper'
import env from '../../env'

type Routes = Record<string, { path: string }>

/**
 * Borra del store theme el `.jsonc` de una custom page que quedó vieja y expone
 * en `removedRouteKeys` la entrada de `routes.json` que hay que dar de baja.
 *
 * Se dispara cuando el request de deploy trae `previousSlug`, es decir cuando la
 * página fue renombrada (o eliminada) en el CMS. La ubicación del archivo viejo
 * se resuelve desde `routes.json`, que es la única fuente que conoce el `path`
 * con el que se publicó.
 *
 * Este comando NO escribe `routes.json`: la baja la aplica `CommitJsonCommand`
 * en el mismo merge con el que publica las rutas nuevas. De esa forma hay una
 * sola escritura del archivo por deploy y una lectura desactualizada nunca
 * puede pisar lo que se acaba de publicar.
 */
export class DeleteCustomPageCommand extends Command<'custom-page'> {
  /** Keys de `routes.json` que quedaron viejas y hay que sacar en el commit. */
  public readonly removedRouteKeys: string[] = []

  private readonly ctx: Context
  private readonly previousSlug: string

  constructor(
    section: 'custom-page',
    data: CustomPagesData,
    ctx: Context,
    previousSlug: string
  ) {
    super(section, data)
    this.ctx = ctx
    this.previousSlug = previousSlug
  }

  public async execute(): Promise<void> {
    const slug = BlockNameHelper.sanitizeSlug(this.previousSlug)

    if (!slug) {
      this.ctx.vtex.logger.warn({
        message: `[DeleteCustomPageCommand] Invalid previousSlug: "${this.previousSlug}". Nothing to delete.`,
      })

      return
    }

    // Si el slug viejo sigue siendo el de una página publicada en este mismo
    // deploy, borrarla dejaría el theme sin la página que se acaba de generar.
    if (this.currentSlugs().includes(slug)) {
      this.ctx.vtex.logger.warn({
        message: `[DeleteCustomPageCommand] previousSlug "${slug}" matches a page in this deploy. Skipping delete.`,
      })

      return
    }

    await initGitHubClient(this.ctx)

    const routes = await this.readRoutes()
    const pageKey = `store.custom#${slug}`
    const route = routes?.[pageKey]

    if (!routes || !route) {
      this.ctx.vtex.logger.warn({
        message: `[DeleteCustomPageCommand] No route found for "${pageKey}". Nothing to delete.`,
      })

      return
    }

    await this.deletePageFile(slug, route.path)

    // La ruta se da de baja aunque el archivo ya no estuviera: así un deploy que
    // falló a mitad de camino se termina de limpiar en el reintento.
    this.removedRouteKeys.push(pageKey)

    this.ctx.vtex.logger.info({
      message: `[DeleteCustomPageCommand] Custom page "${slug}" removed. Route "${pageKey}" will be dropped from routes.json.`,
    })
  }

  /** Slugs normalizados de las páginas que se están publicando en este deploy. */
  private currentSlugs(): string[] {
    return this.data.customPages.map((page) =>
      BlockNameHelper.sanitizeSlug(page.slug)
    )
  }

  private async readRoutes(): Promise<Routes | null> {
    const file = await this.ctx.clients.github.getFileContent(
      env.ROUTES_FILE_PATH
    )

    if (!file.exists || !file.content) {
      return null
    }

    return JSON.parse(file.content) as Routes
  }

  /**
   * Borra el `.jsonc` de la página. El path se arma igual que en el build:
   * CUSTOM_PAGE_PATH + el path publicado + el slug como nombre de archivo.
   */
  private async deletePageFile(slug: string, routePath: string): Promise<void> {
    const filePath =
      `${env.CUSTOM_PAGE_PATH}/${routePath}/${slug}.jsonc`.replace(/\/+/g, '/')

    const file = await this.ctx.clients.github.getFileContent(filePath)

    if (!file.exists || !file.sha) {
      this.ctx.vtex.logger.warn({
        message: `[DeleteCustomPageCommand] File ${filePath} not found. Only the route will be removed.`,
      })

      return
    }

    const res = await this.ctx.clients.github.deleteFile(filePath, file.sha)

    if (res?.data?.error) {
      this.ctx.vtex.logger.error({
        message: `[DeleteCustomPageCommand] Error deleting file: ${filePath}`,
        error: res.data.error,
      })
      throw res.data.error
    }

    this.ctx.vtex.logger.info({
      message: `[DeleteCustomPageCommand] Deleted file: ${filePath}`,
    })
  }
}
