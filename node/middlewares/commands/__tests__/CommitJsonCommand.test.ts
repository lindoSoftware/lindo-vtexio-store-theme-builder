import { CommitJsonCommand } from '../CommitJsonCommand'
import type { GeneratedFile } from '../BuildJsonCommand'
import type { CustomPagesData } from '../../../typings/custompage-response'
import {
  buildGithubCtx,
  commits,
  committedRoutes,
  jsonFile,
  routesCommit,
} from '../../../__tests__/helpers/github-context'

const ROUTES_FILE_PATH = 'store/routes.json'

/** routes.json tal como quedó en el repo antes de este deploy. */
const publishedRoutes = {
  'store.custom#sucursales': { path: '/sucursales' },
  'store.custom#faq': { path: '/faq' },
}

/** routes.json generado por el build para la página renombrada. */
const generatedRoutes = {
  'store.custom#sucursalesnu': { path: '/sucursales' },
}

const routesFile: GeneratedFile = {
  path: 'store',
  filename: 'routes.json',
  content: JSON.stringify(generatedRoutes),
}

const pageFile: GeneratedFile = {
  path: 'store/blocks/pages/custom/sucursales',
  filename: 'sucursalesnu.jsonc',
  content: '{}',
}

const emptyData = { customPages: [] } as CustomPagesData

const OLD_PAGE_FILE = 'store/blocks/pages/custom/sucursales/sucursales.jsonc'

/** Plan de baja de la página renombrada. */
const removal = {
  routeKeys: ['store.custom#sucursales'],
  filePaths: [OLD_PAGE_FILE],
}

function commit(
  ctx: Context,
  files: GeneratedFile[],
  plan = { routeKeys: [] as string[], filePaths: [] as string[] }
) {
  return new CommitJsonCommand(
    'custom-page',
    emptyData,
    ctx,
    files,
    plan
  ).execute()
}

describe('CommitJsonCommand · routes.json', () => {
  it('mergea las rutas generadas y da de baja las viejas', async () => {
    const { ctx, github } = buildGithubCtx({
      [ROUTES_FILE_PATH]: jsonFile(publishedRoutes),
    })

    await commit(ctx, [pageFile, routesFile], removal)

    expect(committedRoutes(github)).toEqual({
      'store.custom#faq': { path: '/faq' },
      'store.custom#sucursalesnu': { path: '/sucursales' },
    })
  })

  it('escribe solo las rutas generadas si routes.json todavía no existe', async () => {
    const { ctx, github } = buildGithubCtx()

    await commit(ctx, [pageFile, routesFile], removal)

    expect(committedRoutes(github)).toEqual(generatedRoutes)
  })

  it('nunca da de baja una ruta que se acaba de generar', async () => {
    const { ctx, github } = buildGithubCtx({
      [ROUTES_FILE_PATH]: jsonFile(publishedRoutes),
    })

    await commit(ctx, [routesFile], {
      routeKeys: ['store.custom#sucursalesnu'],
      filePaths: [],
    })

    // Object.keys en vez de toHaveProperty: jest interpreta los puntos de la
    // key como un path anidado.
    expect(Object.keys(committedRoutes(github))).toContain(
      'store.custom#sucursalesnu'
    )
  })

  it('escribe routes.json una sola vez por deploy', async () => {
    const { ctx, github } = buildGithubCtx({
      [ROUTES_FILE_PATH]: jsonFile(publishedRoutes),
    })

    await commit(ctx, [pageFile, routesFile], removal)

    expect(commits(github)).toHaveLength(1)
  })

  it('borra el .jsonc viejo en el MISMO commit que routes.json', async () => {
    // El commit del borrado por separado deja el repo con routes.json apuntando
    // a un bloque inexistente, y el build del theme corre sobre ese estado.
    const { ctx, github } = buildGithubCtx({
      [ROUTES_FILE_PATH]: jsonFile(publishedRoutes),
    })

    await commit(ctx, [pageFile, routesFile], removal)

    expect(routesCommit(github).deletions).toEqual([OLD_PAGE_FILE])
    expect(github.deleteFile).not.toHaveBeenCalled()
  })

  it('no borra archivos si no hay nada dado de baja', async () => {
    const { ctx, github } = buildGithubCtx({
      [ROUTES_FILE_PATH]: jsonFile(publishedRoutes),
    })

    await commit(ctx, [pageFile, routesFile])

    expect(routesCommit(github).deletions).toEqual([])
  })

  it('limpia la ruta vieja aunque el build no haya generado archivos', async () => {
    // Caso: la página se eliminó del CMS, no hay nada nuevo para publicar.
    const { ctx, github } = buildGithubCtx({
      [ROUTES_FILE_PATH]: jsonFile(publishedRoutes),
    })

    await commit(ctx, [], removal)

    expect(committedRoutes(github)).toEqual({
      'store.custom#faq': { path: '/faq' },
    })
  })

  it('no toca GitHub si no hay archivos ni rutas para dar de baja', async () => {
    const { ctx, github } = buildGithubCtx({
      [ROUTES_FILE_PATH]: jsonFile(publishedRoutes),
    })

    await commit(ctx, [])

    expect(github.init).not.toHaveBeenCalled()
    expect(github.createOrUpdateFile).not.toHaveBeenCalled()
    expect(github.commitFiles).not.toHaveBeenCalled()
  })
})
