import { reconcile } from '../reconcile'
import { StrapiConfigService } from '../../services/StrapiConfigService'
import {
  buildGithubCtx,
  trackedFile,
  TEST_RECONCILE_TOKEN,
} from '../../__tests__/helpers/github-context'

// Va con factory y NO con `jest.spyOn`: spyOn carga el módulo real, que importa
// las estrategias y con ellas `@vtex/api` —el import que `deploy.test.ts` evita a
// propósito porque al cargarse deja un timer abierto en Jest—. La factory corta
// esa cadena también para el import que hace `reconcile.ts`.
//
// El prefijo `mock` es obligatorio: jest hoistea `jest.mock` por encima de esta
// declaración y solo admite que la factory referencie variables externas que
// empiecen así.
const mockBuild = jest.fn()

jest.mock('../../services/ReconcileContentService', () => ({
  ReconcileContentService: {
    build: (...args: unknown[]) => mockBuild(...args),
  },
}))

const ROUTES = 'store/routes.json'
const SUCURSALES = 'store/blocks/pages/custom/sucursales/sucursales.jsonc'
const HUERFANA = 'store/blocks/pages/custom/sucursales/sucursalesnueva.jsonc'

const routesConSucursales = JSON.stringify(
  { 'store.custom#sucursales': { path: '/sucursales' } },
  null,
  2
)

const generated = [
  {
    path: 'store/blocks/pages/custom/sucursales',
    filename: 'sucursales.jsonc',
    content: '{"page":1}',
  },
  { path: 'store', filename: 'routes.json', content: routesConSucursales },
]

const noop = async () => undefined

let strapi: jest.SpyInstance

beforeEach(() => {
  strapi = jest
    .spyOn(StrapiConfigService, 'getConfig')
    .mockResolvedValue({ url: 'https://strapi.test' })

  mockBuild.mockReset()
  mockBuild.mockResolvedValue(generated)
})

afterEach(() => {
  strapi.mockRestore()
})

describe('reconcile — autorización', () => {
  const repo = { [ROUTES]: trackedFile(routesConSucursales) }

  it.each([
    ['sin el header', {}],
    ['con un token incorrecto', { 'x-reconcile-token': 'otra-cosa' }],
    ['con el token vacío', { 'x-reconcile-token': '' }],
  ])('responde 401 y no toca nada %s', async (_caso, headers) => {
    const { ctx, github } = buildGithubCtx(repo, headers)

    await reconcile(ctx, noop)

    expect(ctx.status).toBe(401)
    expect(ctx.body).toEqual({ success: false, error: 'Unauthorized' })

    // Lo que importa del rechazo: no se consultó el CMS ni se tocó GitHub.
    expect(mockBuild).not.toHaveBeenCalled()
    expect(github.listFiles).not.toHaveBeenCalled()
    expect(github.commitFiles).not.toHaveBeenCalled()
  })

  it('falla cerrado si el setting no está configurado', async () => {
    const { ctx, github } = buildGithubCtx(repo)

    // El token viaja bien; es el servicio el que no tiene contra qué compararlo.
    ;(ctx.clients.apps.getAppSettings as jest.Mock).mockResolvedValue({
      githubToken: 'token',
      githubBranchName: 'staging',
    })

    await reconcile(ctx, noop)

    expect(ctx.status).toBe(401)
    expect(github.commitFiles).not.toHaveBeenCalled()
    expect(ctx.vtex.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('reconcileToken'),
      })
    )
  })

  it('deja pasar el request con el token correcto', async () => {
    const { ctx } = buildGithubCtx(repo, {
      'x-reconcile-token': TEST_RECONCILE_TOKEN,
    })

    await reconcile(ctx, noop)

    expect(ctx.status).toBe(200)
  })
})

describe('reconcile', () => {
  it('commitea una sola vez con lo que cambió y lo que sobra', async () => {
    const { ctx, github } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
      [SUCURSALES]: trackedFile('{"viejo":true}'),
      [HUERFANA]: trackedFile('{"page":2}'),
    })

    github.commitFiles.mockResolvedValue({
      status: 200,
      data: { action: 'committed', sha: 'abc123' },
    })

    await reconcile(ctx, noop)

    expect(ctx.status).toBe(200)
    expect(github.commitFiles).toHaveBeenCalledTimes(1)

    const [changes] = github.commitFiles.mock.calls[0]

    expect(changes.upserts.map((file: { path: string }) => file.path)).toEqual([
      SUCURSALES,
    ])
    expect(changes.deletions).toEqual([HUERFANA])

    expect(ctx.body).toMatchObject({
      success: true,
      committed: true,
      commitSha: 'abc123',
      files: { written: [SUCURSALES], deleted: [HUERFANA] },
      routes: { final: ['store.custom#sucursales'], removed: [] },
    })

    // El body del response no sobrevive más allá de esa noche; el log de
    // Jenkins sí. Por eso lo que se borra tiene que quedar en un warn.
    expect(ctx.vtex.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining(HUERFANA) })
    )
  })

  it('avisa con warn una ruta dada de baja aunque no haya archivo que borrar', async () => {
    const ROUTE_KEY = 'store.custom#huerfana'
    const routesConHuerfana = JSON.stringify(
      {
        'store.custom#sucursales': { path: '/sucursales' },
        [ROUTE_KEY]: { path: '/huerfana' },
      },
      null,
      2
    )

    const { ctx, github } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConHuerfana),
      [SUCURSALES]: trackedFile('{"page":1}'),
    })

    github.commitFiles.mockResolvedValue({
      status: 200,
      data: { action: 'committed', sha: 'def456' },
    })

    await reconcile(ctx, noop)

    const [changes] = github.commitFiles.mock.calls[0]

    // Sin `.jsonc` para "huerfana" en el repo no hay nada que borrar, pero la
    // key sigue en el routes.json viejo: se da de baja igual al reescribirlo.
    expect(changes.deletions).toEqual([])
    expect(ctx.body).toMatchObject({
      routes: { removed: [ROUTE_KEY] },
    })

    expect(ctx.vtex.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining(ROUTE_KEY) })
    )
  })

  it('no avisa con warn cuando el commit no borra archivos ni da de baja rutas', async () => {
    const CUSTOM_NAVBAR = 'store/blocks/header/custom-navbar.jsonc'

    mockBuild.mockResolvedValue([
      {
        path: 'store/blocks/header',
        filename: 'custom-navbar.jsonc',
        content: '{"nuevo":true}',
      },
      { path: 'store', filename: 'routes.json', content: routesConSucursales },
    ])

    const { ctx, github } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
      [CUSTOM_NAVBAR]: trackedFile('{"viejo":true}'),
    })

    github.commitFiles.mockResolvedValue({
      status: 200,
      data: { action: 'committed', sha: 'ghi789' },
    })

    await reconcile(ctx, noop)

    // Hay upsert (cambió el navbar) pero nada que borrar ni ninguna ruta dada
    // de baja: no es el caso que este warn tiene que cubrir.
    expect(github.commitFiles).toHaveBeenCalledTimes(1)
    expect(ctx.vtex.logger.warn).not.toHaveBeenCalled()
  })

  it('no commitea cuando el repo ya coincide con el CMS', async () => {
    const { ctx, github } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
      [SUCURSALES]: trackedFile('{"page":1}'),
    })

    await reconcile(ctx, noop)

    expect(github.commitFiles).not.toHaveBeenCalled()
    expect(ctx.status).toBe(200)
    expect(ctx.body).toMatchObject({
      success: true,
      committed: false,
      commitSha: null,
    })
  })

  it('responde 500 y no commitea si el CMS falla', async () => {
    const { ctx, github } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
    })

    mockBuild.mockRejectedValue(new Error('Strapi caído'))

    await reconcile(ctx, noop)

    expect(ctx.status).toBe(500)
    expect(ctx.body).toEqual({ success: false, error: 'Strapi caído' })
    expect(github.commitFiles).not.toHaveBeenCalled()
  })

  it('llama al next del middleware', async () => {
    const { ctx } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
    })

    const next = jest.fn(async () => undefined)

    await reconcile(ctx, next)

    expect(next).toHaveBeenCalled()
  })
})
