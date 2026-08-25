import { EventEmitter } from 'events'

import { deploy } from '../deploy'
import { StrapiConfigService } from '../../services/StrapiConfigService'
import {
  buildGithubCtx,
  committedRoutes,
  jsonFile,
  routesCommit,
} from '../../__tests__/helpers/github-context'

// El flujo de borrado no toca el CMS. Mockear la factory lo deja explícito y de
// paso evita cargar @vtex/api, que al importarse deja un timer abierto.
jest.mock('../strategies/cms/SectionStrategyFactory', () => ({
  SectionStrategyFactory: {
    create: () => {
      throw new Error('El flujo de borrado no debería consultar el CMS')
    },
  },
}))

const ROUTES_FILE_PATH = 'store/routes.json'
const OLD_PAGE_FILE =
  'store/blocks/pages/custom/pagina-vieja/pagina-vieja.jsonc'

const publishedRoutes = {
  'store.custom#pagina-vieja': { path: '/pagina-vieja' },
  'store.custom#faq': { path: '/faq' },
}

function requestFor(body: Record<string, unknown>) {
  const { ctx, github } = buildGithubCtx({
    [ROUTES_FILE_PATH]: jsonFile(publishedRoutes, 'routes-sha'),
    [OLD_PAGE_FILE]: jsonFile({}, 'page-sha'),
  })

  ;(ctx as any).req = fakeRequest(body)

  return { ctx, github }
}

/**
 * Request mínimo para `readRequestBodyAsJSON`: emite el body en el próximo tick,
 * una vez que el middleware ya registró sus listeners.
 */
function fakeRequest(body: Record<string, unknown>) {
  const req = new EventEmitter()

  process.nextTick(() => {
    req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })

  return req
}

const noop = async () => undefined

describe('deploy · custom-page eliminada', () => {
  it('borra el archivo y la ruta sin consultar Strapi', async () => {
    const strapi = jest.spyOn(StrapiConfigService, 'getConfig')
    const { ctx, github } = requestFor({
      section: 'custom-page',
      deleted: true,
      previousSlug: 'pagina-vieja',
    })

    await deploy(ctx, noop)

    expect(ctx.status).toBe(200)
    expect(strapi).not.toHaveBeenCalled()

    // El .jsonc y el routes.json se van en un solo commit: si fueran dos, el
    // theme buildearía el intermedio con una ruta apuntando a un bloque que ya
    // no está.
    expect(routesCommit(github).deletions).toEqual([OLD_PAGE_FILE])
    expect(committedRoutes(github)).toEqual({
      'store.custom#faq': { path: '/faq' },
    })

    expect(ctx.body).toMatchObject({
      success: true,
      section: 'custom-page',
      deleted: true,
      previousSlug: 'pagina-vieja',
      removedRoutes: ['store.custom#pagina-vieja'],
    })

    strapi.mockRestore()
  })

  it('responde ok sin tocar el repo si la página ya no está publicada', async () => {
    const { ctx, github } = requestFor({
      section: 'custom-page',
      deleted: true,
      previousSlug: 'jamas-existio',
    })

    await deploy(ctx, noop)

    expect(ctx.status).toBe(200)
    expect(github.commitFiles).not.toHaveBeenCalled()
    expect(github.createOrUpdateFile).not.toHaveBeenCalled()
    expect(ctx.body).toMatchObject({ removedRoutes: [] })
  })

  it('responde 400 si deleted llega en otra sección', async () => {
    const { ctx, github } = requestFor({
      section: 'home-page',
      deleted: true,
      previousSlug: 'pagina-vieja',
    })

    await deploy(ctx, noop)

    expect(ctx.status).toBe(400)
    expect(ctx.body).toMatchObject({ success: false })
    expect(github.commitFiles).not.toHaveBeenCalled()
  })

  it('responde 400 si deleted llega sin previousSlug', async () => {
    const { ctx, github } = requestFor({
      section: 'custom-page',
      deleted: true,
    })

    await deploy(ctx, noop)

    expect(ctx.status).toBe(400)
    expect(github.commitFiles).not.toHaveBeenCalled()
  })
})
