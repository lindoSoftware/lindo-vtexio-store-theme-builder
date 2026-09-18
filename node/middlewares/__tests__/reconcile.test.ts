import { reconcile } from '../reconcile'
import { StrapiConfigService } from '../../services/StrapiConfigService'
import {
  buildGithubCtx,
  trackedFile,
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
