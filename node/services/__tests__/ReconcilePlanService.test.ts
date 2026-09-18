import { ReconcilePlanService } from '../ReconcilePlanService'
import type { GeneratedFile } from '../../middlewares/commands/BuildJsonCommand'
import {
  buildGithubCtx,
  trackedFile,
} from '../../__tests__/helpers/github-context'

const ROUTES = 'store/routes.json'
const SUCURSALES = 'store/blocks/pages/custom/sucursales/sucursales.jsonc'
const HUERFANA = 'store/blocks/pages/custom/sucursales/sucursalesnueva.jsonc'

const routesConSucursales = JSON.stringify(
  { 'store.custom#sucursales': { path: '/sucursales' } },
  null,
  2
)

/** Los archivos que el build genera para una sola custom page publicada. */
function generatedForSucursales(content = '{"page":1}'): GeneratedFile[] {
  return [
    {
      path: 'store/blocks/pages/custom/sucursales',
      filename: 'sucursales.jsonc',
      content,
    },
    { path: 'store', filename: 'routes.json', content: routesConSucursales },
  ]
}

describe('ReconcilePlanService.plan', () => {
  it('borra la custom page huérfana que quedó en el repo', async () => {
    const { ctx } = buildGithubCtx({
      [ROUTES]: trackedFile(
        JSON.stringify(
          {
            'store.custom#sucursales': { path: '/sucursales' },
            'store.custom#sucursalesnueva': { path: '/sucursales' },
          },
          null,
          2
        )
      ),
      [SUCURSALES]: trackedFile('{"page":1}'),
      [HUERFANA]: trackedFile('{"page":2}'),
    })

    const plan = await ReconcilePlanService.plan(ctx, generatedForSucursales())

    expect(plan.deletions).toEqual([HUERFANA])
    expect(plan.routesRemoved).toEqual(['store.custom#sucursalesnueva'])
    expect(plan.routesFinal).toEqual(['store.custom#sucursales'])
  })

  it('no propone nada cuando el repo ya coincide con el CMS', async () => {
    const { ctx } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
      [SUCURSALES]: trackedFile('{"page":1}'),
    })

    const plan = await ReconcilePlanService.plan(ctx, generatedForSucursales())

    expect(plan.upserts).toEqual([])
    expect(plan.deletions).toEqual([])
    expect(plan.routesRemoved).toEqual([])
  })

  it('marca como upsert solo el archivo cuyo contenido cambió', async () => {
    const { ctx } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
      [SUCURSALES]: trackedFile('{"page":"viejo"}'),
    })

    const plan = await ReconcilePlanService.plan(ctx, generatedForSucursales())

    expect(plan.upserts.map((file) => file.path)).toEqual([SUCURSALES])
  })

  it('normaliza las barras dobles antes de comparar', async () => {
    const { ctx } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
      [SUCURSALES]: trackedFile('{"page":1}'),
    })

    // CUSTOM_PAGE_PATH termina en '/' y el path de la página empieza con '/':
    // así es como el build produce la barra doble.
    const plan = await ReconcilePlanService.plan(ctx, [
      {
        path: 'store/blocks/pages/custom//sucursales',
        filename: 'sucursales.jsonc',
        content: '{"page":1}',
      },
      { path: 'store', filename: 'routes.json', content: routesConSucursales },
    ])

    expect(plan.upserts).toEqual([])
    expect(plan.deletions).toEqual([])
  })

  it('escribe un routes.json vacío y borra todo cuando el CMS no tiene custom pages', async () => {
    const { ctx } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
      [SUCURSALES]: trackedFile('{"page":1}'),
    })

    // Sin páginas en pie, CustomPageBuildJsonStrategy no emite ningún archivo,
    // ni siquiera routes.json.
    const plan = await ReconcilePlanService.plan(ctx, [])

    expect(plan.deletions).toEqual([SUCURSALES])
    expect(plan.upserts).toEqual([{ path: ROUTES, content: '{}' }])
    expect(plan.routesFinal).toEqual([])
    expect(plan.routesRemoved).toEqual(['store.custom#sucursales'])
  })

  it('no borra nada fuera del prefijo de custom pages', async () => {
    const { ctx } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
      [SUCURSALES]: trackedFile('{"page":1}'),
      'store/blocks/header/custom-navbar.jsonc': trackedFile('{"nav":1}'),
      'store/blocks/pages/home/home.jsonc': trackedFile('{"home":1}'),
    })

    const plan = await ReconcilePlanService.plan(ctx, generatedForSucursales())

    expect(plan.deletions).toEqual([])
  })

  it('aborta si GitHub devuelve el árbol truncado', async () => {
    const { ctx, github } = buildGithubCtx({
      [ROUTES]: trackedFile(routesConSucursales),
    })

    github.listFiles.mockResolvedValue({ files: [], truncated: true })

    await expect(
      ReconcilePlanService.plan(ctx, generatedForSucursales())
    ).rejects.toThrow('truncado')
  })
})
