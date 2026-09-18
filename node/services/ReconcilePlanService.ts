import type { GeneratedFile } from '../middlewares/commands/BuildJsonCommand'
import env from '../env'
import { gitBlobSha } from '../utils/gitBlobSha'
import { normalizeRepoPath } from '../utils/normalizeRepoPath'

/** Archivo listo para commitear, con su path ya normalizado. */
interface PlannedFile {
  path: string
  content: string
}

/** Qué hay que escribir y qué hay que borrar para que el repo quede como el CMS. */
export interface ReconcilePlan {
  upserts: PlannedFile[]
  deletions: string[]
  /** Keys de `routes.json` que quedan publicadas. */
  routesFinal: string[]
  /** Keys que estaban en el repo y ya no. */
  routesRemoved: string[]
}

/** Raíz del theme: nada que el plan produzca puede caer fuera de acá. */
const THEME_ROOT = 'store/'

const ROUTES_PATH = normalizeRepoPath(env.ROUTES_FILE_PATH)

// La barra final no es cosmética: sin ella `startsWith` matchearía también
// directorios hermanos como `store/blocks/pages/customer/`.
const CUSTOM_PREFIX = normalizeRepoPath(`${env.CUSTOM_PAGE_PATH}/`)

/**
 * Compara lo que el CMS produjo contra lo que hay publicado en el repo.
 *
 * Solo lee y calcula: el commit lo hace el handler, en un único paso, para que
 * el repo nunca pase por un estado con `routes.json` apuntando a un bloque ya
 * borrado.
 */
export class ReconcilePlanService {
  public static async plan(
    ctx: Context,
    generated: GeneratedFile[]
  ): Promise<ReconcilePlan> {
    const files = this.withRoutesFile(generated)

    // El prefijo es el root del theme y no el de custom pages porque hace
    // falta el SHA de TODOS los archivos generados: sin el de routes.json,
    // custom-navbar.jsonc y home.jsonc, esos tres se verían como cambiados en
    // cada corrida.
    const { files: repoFiles, truncated } = await ctx.clients.github.listFiles(
      THEME_ROOT
    )

    if (truncated) {
      throw new Error(
        'GitHub devolvió el árbol truncado: no se puede determinar qué archivos sobran en el repo.'
      )
    }

    const generatedPaths = new Set(files.map((file) => file.path))
    const shaInRepo = new Map(repoFiles.map((file) => [file.path, file.sha]))

    const upserts = files.filter(
      (file) => shaInRepo.get(file.path) !== gitBlobSha(file.content)
    )

    // El filtro por prefijo es lo que garantiza que reconcile nunca borre nada
    // fuera de las custom pages.
    const deletions = repoFiles
      .filter((file) => file.path.startsWith(CUSTOM_PREFIX))
      .filter((file) => file.path.endsWith('.jsonc'))
      .filter((file) => !generatedPaths.has(file.path))
      .map((file) => file.path)

    const { routesFinal, routesRemoved } = await this.routeDiff(ctx, files)

    ctx.vtex.logger.info({
      message: `[ReconcilePlanService] ${upserts.length} upserts, ${deletions.length} deletions, ${routesRemoved.length} rutas dadas de baja.`,
    })

    return { upserts, deletions, routesFinal, routesRemoved }
  }

  /**
   * Normaliza los paths, garantiza que `routes.json` esté siempre presente y
   * rechaza cualquier archivo que quede fuera del theme.
   *
   * Precondición: `generated` tiene que ser la salida COMPLETA del build de
   * las tres secciones (navbar, home-page, custom pages). Pasarle un
   * subconjunto acá reescribe `routes.json` a `{}` y borra toda custom page
   * que no esté en ese subconjunto, aunque siga publicada en el CMS —quien
   * llama es el único que puede garantizar que el build fue completo.
   *
   * `CustomPageBuildJsonStrategy` no emite ningún archivo cuando no queda
   * ninguna página en pie, ni siquiera el `routes.json`. Para el modo
   * autoritativo eso significa exactamente "el CMS no tiene rutas": `{}`.
   */
  private static withRoutesFile(generated: GeneratedFile[]): PlannedFile[] {
    const files = generated.map((file) => {
      const path = normalizeRepoPath(`${file.path}/${file.filename}`)

      // `normalizeRepoPath` solo colapsa barras: un `..` literal sobrevive
      // normalizado y puede aterrizar en cualquier archivo del theme —no solo
      // fuera de `store/`— porque un `startsWith` sobre el string crudo no
      // distingue un path real de uno con navegación relativa adentro.
      if (!path.startsWith(THEME_ROOT) || path.split('/').includes('..')) {
        throw new Error(
          `El build generó un path fuera del theme: "${path}". Reconcile nunca escribe fuera de "${THEME_ROOT}".`
        )
      }

      return { path, content: file.content }
    })

    if (!files.some((file) => file.path === ROUTES_PATH)) {
      files.push({ path: ROUTES_PATH, content: '{}' })
    }

    return files
  }

  /**
   * Las rutas que quedan y las que se dan de baja. Necesita el contenido del
   * `routes.json` publicado, que el árbol no trae —solo trae el SHA—, así que
   * es la única lectura extra del plan.
   */
  private static async routeDiff(
    ctx: Context,
    files: PlannedFile[]
  ): Promise<{ routesFinal: string[]; routesRemoved: string[] }> {
    const generatedRoutes = files.find((file) => file.path === ROUTES_PATH)
    const finalRoutes = JSON.parse(generatedRoutes?.content ?? '{}')

    const published = await ctx.clients.github.getFileContent(ROUTES_PATH)

    const publishedRoutes =
      published.exists && published.content ? JSON.parse(published.content) : {}

    return {
      routesFinal: Object.keys(finalRoutes),
      routesRemoved: Object.keys(publishedRoutes).filter(
        (key) => !(key in finalRoutes)
      ),
    }
  }
}
