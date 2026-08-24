import { CommitJsonCommand } from '../CommitJsonCommand'
import type { GeneratedFile } from '../BuildJsonCommand'
import type { CustomPagesData } from '../../../typings/custompage-response'

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

function buildCtx(existingRoutes: Record<string, unknown> | null) {
  const github = {
    init: jest.fn().mockResolvedValue(undefined),
    getFileContent: jest.fn(async () =>
      existingRoutes
        ? {
            exists: true,
            sha: 'routes-sha',
            content: JSON.stringify(existingRoutes),
          }
        : { exists: false }
    ),
    createOrUpdateFile: jest.fn().mockResolvedValue({ status: 200, data: {} }),
    deleteFile: jest.fn().mockResolvedValue({ status: 200, data: '' }),
  }

  const ctx = {
    clients: {
      github,
      apps: {
        getAppSettings: jest.fn().mockResolvedValue({
          githubToken: 'token',
          githubBranchName: 'staging',
        }),
      },
    },
    vtex: { logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
  }

  return { ctx: ctx as unknown as Context, github }
}

const emptyData = { customPages: [] } as CustomPagesData

function committedRoutes(github: { createOrUpdateFile: jest.Mock }) {
  const call = github.createOrUpdateFile.mock.calls.find(
    ([path]: [string]) => path === ROUTES_FILE_PATH
  )

  return JSON.parse(call[1])
}

describe('CommitJsonCommand · routes.json', () => {
  it('mergea las rutas generadas y da de baja las viejas', async () => {
    const { ctx, github } = buildCtx(publishedRoutes)

    await new CommitJsonCommand(
      'custom-page',
      emptyData,
      ctx,
      [pageFile, routesFile],
      ['store.custom#sucursales']
    ).execute()

    expect(committedRoutes(github)).toEqual({
      'store.custom#faq': { path: '/faq' },
      'store.custom#sucursalesnu': { path: '/sucursales' },
    })
  })

  it('escribe solo las rutas generadas si routes.json todavía no existe', async () => {
    const { ctx, github } = buildCtx(null)

    await new CommitJsonCommand(
      'custom-page',
      emptyData,
      ctx,
      [pageFile, routesFile],
      ['store.custom#sucursales']
    ).execute()

    expect(committedRoutes(github)).toEqual(generatedRoutes)
  })

  it('nunca da de baja una ruta que se acaba de generar', async () => {
    const { ctx, github } = buildCtx(publishedRoutes)

    await new CommitJsonCommand(
      'custom-page',
      emptyData,
      ctx,
      [routesFile],
      ['store.custom#sucursalesnu']
    ).execute()

    // Object.keys en vez de toHaveProperty: jest interpreta los puntos de la
    // key como un path anidado.
    expect(Object.keys(committedRoutes(github))).toContain(
      'store.custom#sucursalesnu'
    )
  })

  it('escribe routes.json una sola vez por deploy', async () => {
    const { ctx, github } = buildCtx(publishedRoutes)

    await new CommitJsonCommand(
      'custom-page',
      emptyData,
      ctx,
      [pageFile, routesFile],
      ['store.custom#sucursales']
    ).execute()

    const routesWrites = github.createOrUpdateFile.mock.calls.filter(
      ([path]: [string]) => path === ROUTES_FILE_PATH
    )

    expect(routesWrites).toHaveLength(1)
  })

  it('limpia la ruta vieja aunque el build no haya generado archivos', async () => {
    // Caso: la página se eliminó del CMS, no hay nada nuevo para publicar.
    const { ctx, github } = buildCtx(publishedRoutes)

    await new CommitJsonCommand(
      'custom-page',
      emptyData,
      ctx,
      [],
      ['store.custom#sucursales']
    ).execute()

    expect(committedRoutes(github)).toEqual({
      'store.custom#faq': { path: '/faq' },
    })
  })

  it('no toca GitHub si no hay archivos ni rutas para dar de baja', async () => {
    const { ctx, github } = buildCtx(publishedRoutes)

    await new CommitJsonCommand('custom-page', emptyData, ctx, []).execute()

    expect(github.init).not.toHaveBeenCalled()
    expect(github.createOrUpdateFile).not.toHaveBeenCalled()
  })
})
