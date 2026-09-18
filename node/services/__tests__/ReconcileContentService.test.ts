import { ReconcileContentService } from '../ReconcileContentService'
import type { StrapiConfig } from '../StrapiConfigService'

// El prefijo `mock` no es cosmético: jest hoistea `jest.mock` por encima de
// estas declaraciones, y solo deja que la factory referencie variables externas
// cuyo nombre empiece así. Sin el prefijo el test explota con un ReferenceError.
const mockGetData = jest.fn()
const mockBuild = jest.fn()

jest.mock('../../middlewares/strategies/cms/SectionStrategyFactory', () => ({
  SectionStrategyFactory: {
    create: (section: string) => ({
      getData: (...args: unknown[]) => mockGetData(section, ...args),
    }),
  },
}))

jest.mock(
  '../../middlewares/strategies/builds/BuildJsonStrategyFactory',
  () => ({
    BuildJsonStrategyFactory: {
      create: (section: string) => ({
        build: (data: unknown) => mockBuild(section, data),
      }),
    },
  })
)

const strapi: StrapiConfig = { url: 'https://strapi.test', token: 'tok' }
const ctx = {} as Context

beforeEach(() => {
  mockGetData.mockReset()
  mockBuild.mockReset()
  mockGetData.mockImplementation(async (section: string) => ({ section }))
  mockBuild.mockImplementation(async (section: string) => [
    { path: `store/${section}`, filename: `${section}.jsonc`, content: '{}' },
  ])
})

describe('ReconcileContentService.build', () => {
  it('lee las tres secciones y junta todos los archivos', async () => {
    const files = await ReconcileContentService.build(ctx, strapi)

    expect(mockGetData.mock.calls.map(([section]) => section)).toEqual([
      'navbar',
      'home-page',
      'custom-page',
    ])

    expect(files.map((file) => file.filename)).toEqual([
      'navbar.jsonc',
      'home-page.jsonc',
      'custom-page.jsonc',
    ])
  })

  it('pide las custom pages sin filtros, para traerlas todas', async () => {
    await ReconcileContentService.build(ctx, strapi)

    const call = mockGetData.mock.calls.find(
      ([section]) => section === 'custom-page'
    )

    // El segundo argumento de getData son las `variables` de la query: en
    // undefined, el $filters queda nulo. Que Strapi devuelva todas las
    // páginas depende además de la paginación explícita de CUSTOM_PAGE_QUERY
    // (ver queries.test.ts); sin ella, omitir `variables` no alcanzaría.
    expect(call?.[2]).toBeUndefined()
  })

  it('propaga el error si una sección falla y no devuelve nada parcial', async () => {
    mockGetData.mockImplementation(async (section: string) => {
      if (section === 'home-page') throw new Error('Strapi caído')

      return { section }
    })

    await expect(ReconcileContentService.build(ctx, strapi)).rejects.toThrow(
      'Strapi caído'
    )
  })
})
