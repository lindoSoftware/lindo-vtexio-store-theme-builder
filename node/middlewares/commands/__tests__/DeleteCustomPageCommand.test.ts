import { DeleteCustomPageCommand } from '../DeleteCustomPageCommand'
import type { CustomPagesData } from '../../../typings/custompage-response'

const ROUTES_FILE_PATH = 'store/routes.json'
const OLD_PAGE_FILE =
  'store/blocks/pages/custom/pagina-vieja/pagina-vieja.jsonc'

const routesJson = JSON.stringify({
  'store.custom#pagina-vieja': { path: '/pagina-vieja' },
  'store.custom#nueva-pagina': { path: '/nueva-pagina' },
})

/** Forma de la respuesta de `GitHubClient.getFileContent`. */
interface GithubFile {
  exists: boolean
  sha?: string
  content?: string
}

function buildCtx() {
  const github = {
    init: jest.fn().mockResolvedValue(undefined),
    getFileContent: jest.fn(async (path: string): Promise<GithubFile> => {
      if (path === ROUTES_FILE_PATH) {
        return { exists: true, sha: 'routes-sha', content: routesJson }
      }

      return { exists: true, sha: 'page-sha', content: '{}' }
    }),
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

describe('DeleteCustomPageCommand', () => {
  it('borra el .jsonc viejo y saca su ruta de routes.json', async () => {
    const { ctx, github } = buildCtx()

    await new DeleteCustomPageCommand(
      'custom-page',
      pagesWith('nueva-pagina'),
      ctx,
      'pagina-vieja'
    ).execute()

    expect(github.deleteFile).toHaveBeenCalledWith(OLD_PAGE_FILE, 'page-sha')

    const [path, content] = github.createOrUpdateFile.mock.calls[0]

    expect(path).toBe(ROUTES_FILE_PATH)
    expect(JSON.parse(content)).toEqual({
      'store.custom#nueva-pagina': { path: '/nueva-pagina' },
    })
  })

  it('normaliza el previousSlug igual que el build', async () => {
    const { ctx, github } = buildCtx()

    await new DeleteCustomPageCommand(
      'custom-page',
      pagesWith('nueva-pagina'),
      ctx,
      'Página Vieja'
    ).execute()

    // "Página Vieja" sanitizado es "p-gina-vieja", que no está en routes.json
    expect(github.deleteFile).not.toHaveBeenCalled()
    expect(github.createOrUpdateFile).not.toHaveBeenCalled()
  })

  it('no borra si el previousSlug es una página de este mismo deploy', async () => {
    const { ctx, github } = buildCtx()

    await new DeleteCustomPageCommand(
      'custom-page',
      pagesWith('pagina-vieja'),
      ctx,
      'pagina-vieja'
    ).execute()

    expect(github.init).not.toHaveBeenCalled()
    expect(github.deleteFile).not.toHaveBeenCalled()
    expect(github.createOrUpdateFile).not.toHaveBeenCalled()
  })

  it('no hace nada si el previousSlug no tiene ruta publicada', async () => {
    const { ctx, github } = buildCtx()

    await new DeleteCustomPageCommand(
      'custom-page',
      pagesWith('nueva-pagina'),
      ctx,
      'jamas-existio'
    ).execute()

    expect(github.deleteFile).not.toHaveBeenCalled()
    expect(github.createOrUpdateFile).not.toHaveBeenCalled()
  })

  it('no hace nada si el previousSlug queda vacío al sanitizar', async () => {
    const { ctx, github } = buildCtx()

    await new DeleteCustomPageCommand(
      'custom-page',
      pagesWith('nueva-pagina'),
      ctx,
      '###'
    ).execute()

    expect(github.init).not.toHaveBeenCalled()
    expect(github.getFileContent).not.toHaveBeenCalled()
  })

  it('saca la ruta aunque el archivo ya no exista en el repo', async () => {
    const { ctx, github } = buildCtx()

    github.getFileContent.mockImplementation(
      async (path: string): Promise<GithubFile> => {
        if (path === ROUTES_FILE_PATH) {
          return { exists: true, sha: 'routes-sha', content: routesJson }
        }

        return { exists: false }
      }
    )

    await new DeleteCustomPageCommand(
      'custom-page',
      pagesWith('nueva-pagina'),
      ctx,
      'pagina-vieja'
    ).execute()

    expect(github.deleteFile).not.toHaveBeenCalled()

    const [, content] = github.createOrUpdateFile.mock.calls[0]

    expect(JSON.parse(content)).toEqual({
      'store.custom#nueva-pagina': { path: '/nueva-pagina' },
    })
  })
})
