import type { CustomPagesData } from '../typings/custompage-response'
import { BlockNameHelper } from '../utils/BlockNameHelper'
import { initGitHubClient } from '../utils/github.helper'
import env from '../env'

type Routes = Record<string, { path: string }>

/** Qué hay que sacar del store theme para dar de baja una custom page. */
export interface CustomPageRemoval {
  /** Keys de `routes.json` a dar de baja. */
  routeKeys: string[]
  /** Paths de los `.jsonc` a borrar del repo. */
  filePaths: string[]
}

const NOTHING_TO_REMOVE: CustomPageRemoval = { routeKeys: [], filePaths: [] }

/**
 * Resuelve qué archivos y rutas quedaron viejos cuando una custom page se
 * renombra o se elimina en el CMS.
 *
 * Solo lee: no borra ni commitea nada. Los cambios los aplica
 * `CommitJsonCommand` en un único commit junto con el `routes.json` nuevo, para
 * que el repo nunca quede con una ruta apuntando a un bloque inexistente.
 */
export class CustomPageRemovalService {
  /**
   * @param currentPages Páginas que se están publicando en este deploy.
   * @param previousSlug Slug con el que la página estaba publicada.
   */
  public static async plan(
    ctx: Context,
    currentPages: CustomPagesData,
    previousSlug: string
  ): Promise<CustomPageRemoval> {
    const slug = BlockNameHelper.sanitizeSlug(previousSlug)

    if (!slug) {
      ctx.vtex.logger.warn({
        message: `[CustomPageRemovalService] Invalid previousSlug: "${previousSlug}". Nothing to remove.`,
      })

      return NOTHING_TO_REMOVE
    }

    // Si el slug viejo sigue siendo el de una página publicada en este mismo
    // deploy, borrarla dejaría el theme sin la página que se acaba de generar.
    if (this.currentSlugs(currentPages).includes(slug)) {
      ctx.vtex.logger.warn({
        message: `[CustomPageRemovalService] previousSlug "${slug}" matches a page in this deploy. Nothing to remove.`,
      })

      return NOTHING_TO_REMOVE
    }

    await initGitHubClient(ctx)

    const routes = await this.readRoutes(ctx)
    const routeKey = `store.custom#${slug}`
    const route = routes?.[routeKey]

    // routes.json es la única fuente que sabe con qué path se publicó la página.
    if (!route) {
      ctx.vtex.logger.warn({
        message: `[CustomPageRemovalService] No route found for "${routeKey}". Nothing to remove.`,
      })

      return NOTHING_TO_REMOVE
    }

    const filePath = this.pageFilePath(slug, route.path)
    const file = await ctx.clients.github.getFileContent(filePath)

    // La ruta se da de baja aunque el archivo ya no esté: así un deploy que falló
    // a mitad de camino se termina de limpiar en el reintento.
    if (!file.exists) {
      ctx.vtex.logger.warn({
        message: `[CustomPageRemovalService] File ${filePath} not found. Only the route will be removed.`,
      })

      return { routeKeys: [routeKey], filePaths: [] }
    }

    ctx.vtex.logger.info({
      message: `[CustomPageRemovalService] Custom page "${slug}" will be removed: ${filePath} + route "${routeKey}".`,
    })

    return { routeKeys: [routeKey], filePaths: [filePath] }
  }

  /** Slugs normalizados de las páginas que se están publicando en este deploy. */
  private static currentSlugs(data: CustomPagesData): string[] {
    return data.customPages.map((page) =>
      BlockNameHelper.sanitizeSlug(page.slug)
    )
  }

  private static async readRoutes(ctx: Context): Promise<Routes | null> {
    const file = await ctx.clients.github.getFileContent(env.ROUTES_FILE_PATH)

    if (!file.exists || !file.content) {
      return null
    }

    return JSON.parse(file.content) as Routes
  }

  /**
   * El path se arma igual que en el build: CUSTOM_PAGE_PATH + el path publicado
   * + el slug como nombre de archivo.
   */
  private static pageFilePath(slug: string, routePath: string): string {
    return `${env.CUSTOM_PAGE_PATH}/${routePath}/${slug}.jsonc`.replace(
      /\/+/g,
      '/'
    )
  }
}
