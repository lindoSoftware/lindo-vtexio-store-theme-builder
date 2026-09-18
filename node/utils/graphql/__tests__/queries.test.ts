import { CUSTOM_PAGE_QUERY } from '../queries'

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
})
