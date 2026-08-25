import { CustomPageRemovalService } from '../CustomPageRemovalService'
import type { CustomPagesData } from '../../typings/custompage-response'
import {
  buildGithubCtx,
  jsonFile,
} from '../../__tests__/helpers/github-context'

const ROUTES_FILE_PATH = 'store/routes.json'
const OLD_PAGE_FILE =
  'store/blocks/pages/custom/pagina-vieja/pagina-vieja.jsonc'

const publishedRoutes = {
  'store.custom#pagina-vieja': { path: '/pagina-vieja' },
  'store.custom#nueva-pagina': { path: '/nueva-pagina' },
}

/** Repo con la página vieja publicada. */
function repoWithOldPage() {
  return buildGithubCtx({
    [ROUTES_FILE_PATH]: jsonFile(publishedRoutes, 'routes-sha'),
    [OLD_PAGE_FILE]: jsonFile({}, 'page-sha'),
  })
}

function pagesWith(...slugs: string[]): CustomPagesData {
  return {
    customPages: slugs.map(
      (slug) =>
        ({
          slug,
          path: slug,
          title: slug,
          content: [],
        } as unknown as CustomPagesData['customPages'][number])
    ),
  }
}

const NOTHING = { routeKeys: [], filePaths: [] }

describe('CustomPageRemovalService.plan', () => {
  it('resuelve el archivo y la ruta de la página vieja', async () => {
    const { ctx } = repoWithOldPage()

    const removal = await CustomPageRemovalService.plan(
      ctx,
      pagesWith('nueva-pagina'),
      'pagina-vieja'
    )

    expect(removal).toEqual({
      routeKeys: ['store.custom#pagina-vieja'],
      filePaths: [OLD_PAGE_FILE],
    })
  })

  it('no toca el repo: solo lee', async () => {
    const { ctx, github } = repoWithOldPage()

    await CustomPageRemovalService.plan(
      ctx,
      pagesWith('nueva-pagina'),
      'pagina-vieja'
    )

    expect(github.deleteFile).not.toHaveBeenCalled()
    expect(github.commitFiles).not.toHaveBeenCalled()
    expect(github.createOrUpdateFile).not.toHaveBeenCalled()
  })

  it('normaliza el previousSlug igual que el build', async () => {
    const { ctx } = repoWithOldPage()

    // "Página Vieja" sanitizado es "p-gina-vieja", que no está en routes.json
    const removal = await CustomPageRemovalService.plan(
      ctx,
      pagesWith('nueva-pagina'),
      'Página Vieja'
    )

    expect(removal).toEqual(NOTHING)
  })

  it('no da de baja una página que se publica en este mismo deploy', async () => {
    const { ctx, github } = repoWithOldPage()

    const removal = await CustomPageRemovalService.plan(
      ctx,
      pagesWith('pagina-vieja'),
      'pagina-vieja'
    )

    expect(removal).toEqual(NOTHING)
    expect(github.init).not.toHaveBeenCalled()
  })

  it('no da de baja nada si el previousSlug no tiene ruta publicada', async () => {
    const { ctx } = repoWithOldPage()

    const removal = await CustomPageRemovalService.plan(
      ctx,
      pagesWith('nueva-pagina'),
      'jamas-existio'
    )

    expect(removal).toEqual(NOTHING)
  })

  it('no lee el repo si el previousSlug queda vacío al sanitizar', async () => {
    const { ctx, github } = repoWithOldPage()

    const removal = await CustomPageRemovalService.plan(
      ctx,
      pagesWith('nueva-pagina'),
      '###'
    )

    expect(removal).toEqual(NOTHING)
    expect(github.getFileContent).not.toHaveBeenCalled()
  })

  it('da de baja la ruta aunque el archivo ya no exista en el repo', async () => {
    const { ctx } = buildGithubCtx({
      [ROUTES_FILE_PATH]: jsonFile(publishedRoutes, 'routes-sha'),
    })

    const removal = await CustomPageRemovalService.plan(
      ctx,
      pagesWith('nueva-pagina'),
      'pagina-vieja'
    )

    expect(removal).toEqual({
      routeKeys: ['store.custom#pagina-vieja'],
      filePaths: [],
    })
  })
})
