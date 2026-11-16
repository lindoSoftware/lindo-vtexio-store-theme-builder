import { CUSTOM_PAGE_QUERY, HOME_PAGE_QUERY, NAVBAR_QUERY } from '../queries'

describe('CUSTOM_PAGE_QUERY', () => {
  it('pide paginación explícita en customPages', () => {
    // Sin este argumento, Strapi cae a su default de 10 resultados (ver el
    // comentario en queries.ts) y ReconcileContentService deja de traer todas
    // las custom pages sin que nada lo avise. Este test no valida el valor
    // exacto —eso lo hace la verificación manual documentada en el reporte de
    // la review—, solo que el argumento sigue estando.
    expect(CUSTOM_PAGE_QUERY).toMatch(
      /customPages\(filters:\s*\$filters,\s*pagination:\s*\{[^}]*limit[^}]*\}\)/
    )
  })

  it('no vuelve a usar limit: -1', () => {
    // -1 se probó explícitamente contra knex + mysql2 (el cliente de este
    // proyecto) y no se comporta como "sin límite": se pasa tal cual a la
    // cláusula SQL LIMIT, que MySQL rechaza. Ese truco es específico de
    // SQLite. Si alguien lo reintroduce, este test tiene que fallar.
    expect(CUSTOM_PAGE_QUERY).not.toMatch(/limit:\s*-1/)
  })

  it('pide el título del video con alias (videoTitle)', () => {
    // Tab.title es String! y Video.title es String: en la misma unión GraphQL
    // rechaza la query entera ("Fields \"title\" conflict…") y falla el
    // deploy de TODAS las custom pages. Por eso el de Video va con alias.
    const video = CUSTOM_PAGE_QUERY.match(
      /\.\.\. on ComponentSharedVideo \{([^}]*)\}/
    )

    expect(video).not.toBeNull()
    expect(video![1]).toMatch(/videoTitle:\s*title/)
    expect(video![1]).not.toMatch(/^\s*title\s*$/m)
  })
})

// Listas anidadas que Strapi 5 pagina (lo dice su schema: aceptan `pagination`).
// Sin límite explícito cortan en 10 sin avisar: pasó con los 18 logos de
// "En la sucursal" en medios-pago (llegaban 10).
const PAGINATED_LISTS = [
  'banners',
  'cards',
  'faqs',
  'imageSelectors',
  'images',
  'links',
  'staticBanners',
  'steps',
  'tabs',
]

describe.each([
  ['HOME_PAGE_QUERY', HOME_PAGE_QUERY],
  ['NAVBAR_QUERY', NAVBAR_QUERY],
  ['CUSTOM_PAGE_QUERY', CUSTOM_PAGE_QUERY],
])('%s', (_name, query) => {
  it.each(PAGINATED_LISTS)('pide %s con paginación explícita', (field) => {
    expect(query).not.toMatch(new RegExp(`\\b${field}\\s*\\{`))
  })
})

