/**
 * Contexto VTEX falso con el cliente de GitHub mockeado, para los tests de los
 * comandos y del middleware de deploy.
 */

import { gitBlobSha } from '../../utils/gitBlobSha'

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
  listFiles: jest.Mock
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
/** Secreto que el ctx de test manda y que los settings mockeados esperan. */
export const TEST_RECONCILE_TOKEN = 'token-de-test'

export function buildGithubCtx(
  repo: Record<string, GithubFile> = {},
  /** Headers del request. Por defecto, los de un reconcile autorizado. */
  headers: Record<string, string> = {
    'x-reconcile-token': TEST_RECONCILE_TOKEN,
  }
): {
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
    listFiles: jest.fn(async (prefix: string) => ({
      files: Object.entries(repo)
        .filter(([path, file]) => file.exists && path.startsWith(prefix))
        .map(([path, file]) => ({
          path,
          sha: file.sha ?? gitBlobSha(file.content ?? ''),
        })),
      truncated: false,
    })),
  }

  const ctx = {
    clients: {
      github,
      apps: {
        getAppSettings: jest.fn().mockResolvedValue({
          githubToken: 'token',
          githubBranchName: 'staging',
          reconcileToken: TEST_RECONCILE_TOKEN,
        }),
      },
    },
    vtex: { logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
    // Koa normaliza el nombre a minúsculas; `ctx.get` es case-insensitive.
    get: (field: string) => headers[field.toLowerCase()] ?? '',
  }

  return { ctx: ctx as unknown as Context, github }
}

/** Un archivo presente en el repo, con contenido JSON. */
export function jsonFile(content: unknown, sha = 'sha'): GithubFile {
  return { exists: true, sha, content: JSON.stringify(content) }
}

/**
 * Un archivo del repo cuyo `sha` es el real de su contenido. `jsonFile` usa un
 * sha de fantasía, que alcanza para los tests que solo leen contenido pero no
 * para los que comparan si un archivo cambió.
 */
export function trackedFile(content: string): GithubFile {
  return { exists: true, sha: gitBlobSha(content), content }
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
