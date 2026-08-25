/**
 * Contexto VTEX falso con el cliente de GitHub mockeado, para los tests de los
 * comandos y del middleware de deploy.
 */

/** Forma de la respuesta de `GitHubClient.getFileContent`. */
export interface GithubFile {
  exists: boolean
  sha?: string
  content?: string
}

export interface GithubMock {
  init: jest.Mock
  getFileContent: jest.Mock
  createOrUpdateFile: jest.Mock
  commitFiles: jest.Mock
  deleteFile: jest.Mock
}

/** Cambios de una llamada a `commitFiles`. */
export interface GithubCommit {
  upserts: Array<{ path: string; content: string }>
  deletions: string[]
  message: string
}

/**
 * @param repo Contenido del repo indexado por path. Un path que no esté ahí se
 * resuelve como inexistente.
 */
export function buildGithubCtx(repo: Record<string, GithubFile> = {}): {
  ctx: Context
  github: GithubMock
} {
  const github: GithubMock = {
    init: jest.fn().mockResolvedValue(undefined),
    getFileContent: jest.fn(
      async (path: string): Promise<GithubFile> =>
        repo[path] ?? { exists: false }
    ),
    createOrUpdateFile: jest.fn().mockResolvedValue({ status: 200, data: {} }),
    commitFiles: jest
      .fn()
      .mockResolvedValue({ status: 200, data: { action: 'committed' } }),
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

/** Un archivo presente en el repo, con contenido JSON. */
export function jsonFile(content: unknown, sha = 'sha'): GithubFile {
  return { exists: true, sha, content: JSON.stringify(content) }
}

/** Los commits atómicos que hizo el deploy, en orden. */
export function commits(github: GithubMock): GithubCommit[] {
  return github.commitFiles.mock.calls.map(([changes, message]) => ({
    upserts: changes.upserts ?? [],
    deletions: changes.deletions ?? [],
    message,
  }))
}

/** El commit que tocó `routes.json`. Falla si no hubo ninguno. */
export function routesCommit(github: GithubMock): GithubCommit {
  const commit = commits(github).find((entry) =>
    entry.upserts.some((file) => file.path === 'store/routes.json')
  )

  if (!commit) {
    throw new Error('routes.json no fue commiteado')
  }

  return commit
}

/** El `routes.json` que quedó commiteado, parseado. */
export function committedRoutes(github: GithubMock): Record<string, unknown> {
  const file = routesCommit(github).upserts.find(
    (entry) => entry.path === 'store/routes.json'
  )

  return JSON.parse(file!.content)
}
