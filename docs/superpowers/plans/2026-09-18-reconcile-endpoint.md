# Reconcile endpoint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar `POST /_v/reconcile`, que lee todo el CMS de Strapi y deja el store theme exactamente en ese estado en un único commit.

**Architecture:** Un handler nuevo orquesta tres servicios: `ReconcileContentService` lee las tres secciones del CMS y arma los archivos reusando las estrategias que ya existen; `ReconcilePlanService` compara esos archivos contra el árbol del repo y produce `{ upserts, deletions }`; el handler commitea una sola vez con `GitHubClient.commitFiles`. El camino incremental (`/_v/deploy`) no cambia de comportamiento.

**Tech Stack:** TypeScript 5.5 (`strict`, target ES2019), VTEX IO builder `node` 7.x (`@vtex/api` 7), Octokit REST 18, Jest 29 + ts-jest.

**Spec:** `docs/superpowers/specs/2026-09-18-reconcile-endpoint-design.md`

## Global Constraints

- Todos los comandos de test corren desde `node/`: `yarn test`. El gate completo es `bash lint.sh` desde la raíz (ESLint → `tsc --noEmit` → Jest).
- `tsconfig.json` tiene `strict`, `noImplicitReturns`, `noUnusedLocals` y `noUnusedParameters` activos: un import o un parámetro sin usar rompe el build.
- Target ES2019: `Array.prototype.flat` está disponible, `Object.hasOwn` y `Array.prototype.at` no.
- El código y los comentarios del repo están en castellano. Los mensajes de commit, en inglés.
- **Ningún archivo fuera de `store/` se toca nunca.** Los borrados se limitan a `.jsonc` bajo `env.CUSTOM_PAGE_PATH`.
- `env.ts` es la única fuente de paths: `CUSTOM_PAGE_PATH = 'store/blocks/pages/custom/'`, `ROUTES_FILE_PATH = 'store/routes.json'`.
- Los tests existentes de `CommitJsonCommand` y `CustomPageRemovalService` tienen que seguir pasando **sin modificarlos**. Son la verificación de que el refactor de la Task 1 es equivalente.

---

### Task 1: `normalizeRepoPath` y el refactor de sus dos consumidores

Hoy `CommitJsonCommand` y `CustomPageRemovalService` normalizan paths con un `.replace(/\/+/g, '/')` inline cada uno. El código nuevo necesita exactamente lo mismo, y una tercera copia es la forma segura de que en algún momento las tres se desincronicen.

**Files:**
- Create: `node/utils/normalizeRepoPath.ts`
- Test: `node/utils/__tests__/normalizeRepoPath.test.ts`
- Modify: `node/middlewares/commands/CommitJsonCommand.ts` (el `commitFile`, donde arma `filePath`)
- Modify: `node/services/CustomPageRemovalService.ts` (el método privado `pageFilePath`)

**Interfaces:**
- Consumes: nada.
- Produces: `normalizeRepoPath(path: string): string`.

- [ ] **Step 1: Escribir el test que falla**

Crear `node/utils/__tests__/normalizeRepoPath.test.ts`:

```ts
import { normalizeRepoPath } from '../normalizeRepoPath'

describe('normalizeRepoPath', () => {
  it('colapsa barras repetidas', () => {
    expect(normalizeRepoPath('store/blocks//pages///custom/x.jsonc')).toBe(
      'store/blocks/pages/custom/x.jsonc'
    )
  })

  it('saca la barra inicial', () => {
    expect(normalizeRepoPath('/store/routes.json')).toBe('store/routes.json')
  })

  it('saca la barra inicial que queda al colapsar', () => {
    expect(normalizeRepoPath('//store/routes.json')).toBe('store/routes.json')
  })

  it('deja igual un path que ya está limpio', () => {
    expect(normalizeRepoPath('store/routes.json')).toBe('store/routes.json')
  })

  it('es idempotente', () => {
    const once = normalizeRepoPath('//store//routes.json')

    expect(normalizeRepoPath(once)).toBe(once)
  })

  it('soporta el string vacío', () => {
    expect(normalizeRepoPath('')).toBe('')
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Desde `node/`:

```bash
yarn test utils/__tests__/normalizeRepoPath.test.ts
```

Esperado: FAIL, `Cannot find module '../normalizeRepoPath'`.

- [ ] **Step 3: Implementar**

Crear `node/utils/normalizeRepoPath.ts`:

```ts
/**
 * Única forma de armar un path del repo.
 *
 * `CUSTOM_PAGE_PATH` termina en `/` y el `path` que el editor carga en Strapi
 * puede venir con barra inicial o sin ella, así que las barras dobles son
 * habituales. Los paths que devuelve el árbol de GitHub nunca las tienen: sin
 * normalizar, ninguna comparación contra el repo matchea.
 *
 * Saca además la barra inicial, porque colapsar `//store/x` deja `/store/x` y
 * la API de GitHub rechaza los paths absolutos.
 */
export function normalizeRepoPath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/^\//, '')
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
yarn test utils/__tests__/normalizeRepoPath.test.ts
```

Esperado: PASS, 6 tests.

- [ ] **Step 5: Reemplazar el replace inline de `CommitJsonCommand`**

En `node/middlewares/commands/CommitJsonCommand.ts`, agregar el import junto a los demás:

```ts
import { normalizeRepoPath } from '../../utils/normalizeRepoPath'
```

Y en `commitFile`, cambiar:

```ts
    const filePath = `${file.path}/${file.filename}`.replace(/\/+/g, '/')
```

por:

```ts
    const filePath = normalizeRepoPath(`${file.path}/${file.filename}`)
```

- [ ] **Step 6: Reemplazar el replace inline de `CustomPageRemovalService`**

En `node/services/CustomPageRemovalService.ts`, agregar el import:

```ts
import { normalizeRepoPath } from '../utils/normalizeRepoPath'
```

Y en `pageFilePath`, cambiar:

```ts
    return `${env.CUSTOM_PAGE_PATH}/${routePath}/${slug}.jsonc`.replace(
      /\/+/g,
      '/'
    )
```

por:

```ts
    return normalizeRepoPath(`${env.CUSTOM_PAGE_PATH}/${routePath}/${slug}.jsonc`)
```

- [ ] **Step 7: Correr toda la suite: el refactor no puede cambiar comportamiento**

```bash
yarn test
```

Esperado: PASS, incluidos `CommitJsonCommand.test.ts`, `CustomPageRemovalService.test.ts` y `deploy.test.ts` **sin haberlos tocado**. Si alguno falla, el refactor no es equivalente — revisar antes de seguir.

- [ ] **Step 8: Commit**

Desde la raíz del repo:

```bash
git add node/utils/normalizeRepoPath.ts node/utils/__tests__/normalizeRepoPath.test.ts node/middlewares/commands/CommitJsonCommand.ts node/services/CustomPageRemovalService.ts
git commit -m "Extract repo path normalization into a shared helper"
```

---

### Task 2: `gitBlobSha`

Para saber qué archivos cambiaron sin pedirle a GitHub el contenido de cada uno. El árbol de git ya trae el SHA de blob de cada archivo, y ese SHA es `sha1("blob " + bytes + "\0" + content)`: calcularlo localmente sobre el contenido generado y comparar da el diff exacto sin una sola llamada extra.

**Files:**
- Create: `node/utils/gitBlobSha.ts`
- Test: `node/utils/__tests__/gitBlobSha.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `gitBlobSha(content: string): string` — devuelve el SHA1 en hexadecimal, en minúsculas, igual que `git hash-object`.

- [ ] **Step 1: Escribir el test que falla**

Los valores esperados salen de `git hash-object --stdin` real, así que el test verifica compatibilidad con git, no con nuestra propia implementación.

Crear `node/utils/__tests__/gitBlobSha.test.ts`:

```ts
import { gitBlobSha } from '../gitBlobSha'

// Los esperados salen de `printf '%s' <contenido> | git hash-object --stdin`.
describe('gitBlobSha', () => {
  it('coincide con git hash-object para un JSON vacío', () => {
    expect(gitBlobSha('{}')).toBe('9e26dfeeb6e641a33dae4961196235bdb965b21b')
  })

  it('coincide con git hash-object para el string vacío', () => {
    expect(gitBlobSha('')).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
  })

  it('coincide con git hash-object para un texto simple', () => {
    expect(gitBlobSha('hola')).toBe('b8b4a4e2a5db3ebed5f5e02beb3e2d27bca9fc9a')
  })

  it('usa la longitud en bytes y no en caracteres', () => {
    // 'ñ' es 1 caracter pero 2 bytes en UTF-8. Con la longitud en caracteres el
    // header sería "blob 1\0" y el hash no coincidiría con el de git.
    expect(gitBlobSha('ñ')).toBe('aa29db9a69df4edb1eabbb5c8c850b813dd4d996')
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
yarn test utils/__tests__/gitBlobSha.test.ts
```

Esperado: FAIL, `Cannot find module '../gitBlobSha'`.

- [ ] **Step 3: Implementar**

Crear `node/utils/gitBlobSha.ts`:

```ts
import { createHash } from 'crypto'

/**
 * SHA de blob de git para un contenido: `sha1("blob " + bytes + "\0" + content)`.
 *
 * Es el mismo valor que `git.getTree` devuelve por archivo, así que comparar
 * contra él dice si un archivo generado difiere del que está publicado en el
 * repo sin pedir su contenido.
 *
 * La longitud del header va en **bytes**, no en caracteres: con contenido no
 * ASCII los dos números no coinciden y el hash dejaría de ser el de git.
 */
export function gitBlobSha(content: string): string {
  const body = Buffer.from(content, 'utf8')
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8')

  return createHash('sha1').update(Buffer.concat([header, body])).digest('hex')
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
yarn test utils/__tests__/gitBlobSha.test.ts
```

Esperado: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add node/utils/gitBlobSha.ts node/utils/__tests__/gitBlobSha.test.ts
git commit -m "Add git blob SHA helper for content comparison"
```

---

### Task 3: `GitHubClient.listFiles` y el mock compartido

Una sola llamada al árbol del repo devuelve todos los archivos con su SHA. `GitHubClient` es un wrapper fino de Octokit y en este repo no tiene tests propios (importarlo arrastra `@vtex/api`, que al cargarse deja un timer abierto en Jest); se verifica a través de los consumidores, que lo mockean. Por eso `listFiles` **no** interpreta el flag `truncated`: lo devuelve tal cual y la decisión de abortar vive en `ReconcilePlanService`, que sí está testeado.

**Files:**
- Modify: `node/clients/github.ts` (agregar el tipo `RepoFile` y el método `listFiles`)
- Modify: `node/__tests__/helpers/github-context.ts` (sumar `listFiles` al mock y el helper `trackedFile`)

**Interfaces:**
- Consumes: `gitBlobSha` de la Task 2 (solo el helper de tests).
- Produces:
  - `export interface RepoFile { path: string; sha: string }` en `node/clients/github.ts`
  - `GitHubClient.listFiles(prefix: string): Promise<{ files: RepoFile[]; truncated: boolean }>`
  - `GithubMock.listFiles: jest.Mock` en el helper de tests
  - `trackedFile(content: string): GithubFile` en el helper de tests

- [ ] **Step 1: Agregar el tipo y el método al cliente**

En `node/clients/github.ts`, junto a la interfaz `GitHubUpsert` que ya está arriba del archivo:

```ts
/** Un archivo del repo tal como lo lista el árbol de git. */
export interface RepoFile {
  path: string
  sha: string
}
```

Y como método público de `GitHubClient`, al lado de `commitFiles`:

```ts
  /**
   * Lista los archivos del branch bajo un prefijo, con el SHA de blob de cada
   * uno. Una sola llamada sin importar cuántos archivos haya.
   *
   * `truncated` viene de GitHub: arriba de ~100k entradas el árbol llega
   * incompleto. Se devuelve crudo porque quien decide qué hacer con un árbol
   * incompleto es el que lo consume, no este cliente.
   */
  public async listFiles(
    prefix: string
  ): Promise<{ files: RepoFile[]; truncated: boolean }> {
    const { data } = await this.octokit.git.getTree({
      owner: ENV.GIT_OWNER ?? '',
      repo: ENV.GIT_REPOSITORY ?? '',
      tree_sha: this.branch,
      recursive: 'true',
    })

    const files: RepoFile[] = []

    for (const entry of data.tree) {
      if (entry.type !== 'blob') continue
      if (!entry.path || !entry.sha) continue
      if (!entry.path.startsWith(prefix)) continue

      files.push({ path: entry.path, sha: entry.sha })
    }

    return { files, truncated: Boolean(data.truncated) }
  }
```

- [ ] **Step 2: Verificar que compila**

Desde la raíz:

```bash
npx tsc --noEmit -p node/tsconfig.json
```

Esperado: sin errores.

- [ ] **Step 3: Sumar `listFiles` y `trackedFile` al helper de tests**

En `node/__tests__/helpers/github-context.ts`.

Agregar el import arriba:

```ts
import { gitBlobSha } from '../../utils/gitBlobSha'
```

Agregar el campo a la interfaz `GithubMock`:

```ts
export interface GithubMock {
  init: jest.Mock
  getFileContent: jest.Mock
  createOrUpdateFile: jest.Mock
  commitFiles: jest.Mock
  deleteFile: jest.Mock
  listFiles: jest.Mock
}
```

Agregar la implementación dentro del objeto `github` de `buildGithubCtx`, después de `deleteFile`. Deriva el listado del mismo mapa `repo` que ya recibe la función, así el repo falso es consistente entre `getFileContent` y `listFiles`:

```ts
    listFiles: jest.fn(async (prefix: string) => ({
      files: Object.entries(repo)
        .filter(([path, file]) => file.exists && path.startsWith(prefix))
        .map(([path, file]) => ({
          path,
          sha: file.sha ?? gitBlobSha(file.content ?? ''),
        })),
      truncated: false,
    })),
```

Y al final del archivo, junto a `jsonFile`:

```ts
/**
 * Un archivo del repo cuyo `sha` es el real de su contenido. `jsonFile` usa un
 * sha de fantasía, que alcanza para los tests que solo leen contenido pero no
 * para los que comparan si un archivo cambió.
 */
export function trackedFile(content: string): GithubFile {
  return { exists: true, sha: gitBlobSha(content), content }
}
```

- [ ] **Step 4: Correr la suite completa: el helper lo usan los tests que ya existen**

```bash
yarn test
```

Esperado: PASS. Agregar un campo al mock no rompe nada, pero los tests actuales pasan por `buildGithubCtx` y confirman que el helper sigue bien formado.

- [ ] **Step 5: Commit**

```bash
git add node/clients/github.ts node/__tests__/helpers/github-context.ts
git commit -m "Add listFiles to the GitHub client"
```

---

### Task 4: `ReconcileContentService`

Lee las tres secciones del CMS y arma todos los archivos del theme, reusando las estrategias existentes sin tocarlas.

**Files:**
- Create: `node/services/ReconcileContentService.ts`
- Test: `node/services/__tests__/ReconcileContentService.test.ts`

**Interfaces:**
- Consumes: `SectionStrategyFactory`, `BuildJsonStrategyFactory`, `GeneratedFile` (de `../middlewares/commands/BuildJsonCommand`), `StrapiConfig` (de `./StrapiConfigService`) — todos ya existentes.
- Produces: `ReconcileContentService.build(ctx: Context, strapi: StrapiConfig): Promise<GeneratedFile[]>`

- [ ] **Step 1: Escribir el test que falla**

Se mockean las dos factories, igual que hace `deploy.test.ts`, para no cargar `@vtex/api`.

Crear `node/services/__tests__/ReconcileContentService.test.ts`:

```ts
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

jest.mock('../../middlewares/strategies/builds/BuildJsonStrategyFactory', () => ({
  BuildJsonStrategyFactory: {
    create: (section: string) => ({
      build: (data: unknown) => mockBuild(section, data),
    }),
  },
}))

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
    // undefined, el $filters queda nulo y Strapi devuelve todas las páginas.
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
yarn test services/__tests__/ReconcileContentService.test.ts
```

Esperado: FAIL, `Cannot find module '../ReconcileContentService'`.

- [ ] **Step 3: Implementar**

Crear `node/services/ReconcileContentService.ts`:

```ts
import type { GeneratedFile } from '../middlewares/commands/BuildJsonCommand'
import { BuildJsonStrategyFactory } from '../middlewares/strategies/builds/BuildJsonStrategyFactory'
import { SectionStrategyFactory } from '../middlewares/strategies/cms/SectionStrategyFactory'
import type { SectionDataMap } from '../typings/sections-map'
import type { StrapiConfig } from './StrapiConfigService'

type Section = keyof SectionDataMap

/** Las tres secciones que el CMS publica. */
const SECTIONS: Section[] = ['navbar', 'home-page', 'custom-page']

/**
 * Lee el CMS entero y arma todos los archivos del theme, reusando las mismas
 * estrategias que usa el deploy incremental.
 */
export class ReconcileContentService {
  public static async build(
    ctx: Context,
    strapi: StrapiConfig
  ): Promise<GeneratedFile[]> {
    // En paralelo: son tres queries independientes. Si una falla, `Promise.all`
    // rechaza y el reconcile entero se aborta sin commitear nada.
    const perSection = await Promise.all(
      SECTIONS.map(async (section) => this.buildSection(ctx, section, strapi))
    )

    return perSection.flat()
  }

  private static async buildSection<TSection extends Section>(
    ctx: Context,
    section: TSection,
    strapi: StrapiConfig
  ): Promise<GeneratedFile[]> {
    // `undefined` como variables es deliberado: el $filters de CUSTOM_PAGE_QUERY
    // queda nulo y Strapi devuelve todas las custom pages, que es lo que hace
    // falta para saber cuáles sobran en el repo. Las otras dos secciones lo
    // ignoran.
    const data = await SectionStrategyFactory.create(section).getData(
      ctx,
      undefined,
      strapi
    )

    return BuildJsonStrategyFactory.create(section, strapi.url).build(data)
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
yarn test services/__tests__/ReconcileContentService.test.ts
```

Esperado: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add node/services/ReconcileContentService.ts node/services/__tests__/ReconcileContentService.test.ts
git commit -m "Add service that builds every theme file from the CMS"
```

---

### Task 5: `ReconcilePlanService`

El corazón: compara los archivos generados contra el árbol del repo y decide qué escribir y qué borrar.

**Files:**
- Create: `node/services/ReconcilePlanService.ts`
- Test: `node/services/__tests__/ReconcilePlanService.test.ts`

**Interfaces:**
- Consumes: `normalizeRepoPath` (Task 1), `gitBlobSha` (Task 2), `ctx.clients.github.listFiles` (Task 3), `ctx.clients.github.getFileContent` (existente), `GeneratedFile` (existente), `env` (existente).
- Produces:
  ```ts
  export interface ReconcilePlan {
    upserts: Array<{ path: string; content: string }>
    deletions: string[]
    routesFinal: string[]
    routesRemoved: string[]
  }
  ReconcilePlanService.plan(ctx: Context, generated: GeneratedFile[]): Promise<ReconcilePlan>
  ```

- [ ] **Step 1: Escribir el test que falla**

Crear `node/services/__tests__/ReconcilePlanService.test.ts`:

```ts
import { ReconcilePlanService } from '../ReconcilePlanService'
import type { GeneratedFile } from '../../middlewares/commands/BuildJsonCommand'
import {
  buildGithubCtx,
  trackedFile,
} from '../../__tests__/helpers/github-context'

const ROUTES = 'store/routes.json'
const SUCURSALES = 'store/blocks/pages/custom/sucursales/sucursales.jsonc'
const HUERFANA =
  'store/blocks/pages/custom/sucursales/sucursalesnueva.jsonc'

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
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
yarn test services/__tests__/ReconcilePlanService.test.ts
```

Esperado: FAIL, `Cannot find module '../ReconcilePlanService'`.

- [ ] **Step 3: Implementar**

Crear `node/services/ReconcilePlanService.ts`:

```ts
import type { GeneratedFile } from '../middlewares/commands/BuildJsonCommand'
import env from '../env'
import { gitBlobSha } from '../utils/gitBlobSha'
import { normalizeRepoPath } from '../utils/normalizeRepoPath'

/** Archivo listo para commitear, con su path ya normalizado. */
interface PlannedFile {
  path: string
  content: string
}

/** Qué hay que escribir y qué hay que borrar para que el repo quede como el CMS. */
export interface ReconcilePlan {
  upserts: PlannedFile[]
  deletions: string[]
  /** Keys de `routes.json` que quedan publicadas. */
  routesFinal: string[]
  /** Keys que estaban en el repo y ya no. */
  routesRemoved: string[]
}

const ROUTES_PATH = normalizeRepoPath(env.ROUTES_FILE_PATH)
const CUSTOM_PREFIX = normalizeRepoPath(env.CUSTOM_PAGE_PATH)

/**
 * Compara lo que el CMS produjo contra lo que hay publicado en el repo.
 *
 * Solo lee y calcula: el commit lo hace el handler, en un único paso, para que
 * el repo nunca pase por un estado con `routes.json` apuntando a un bloque ya
 * borrado.
 */
export class ReconcilePlanService {
  public static async plan(
    ctx: Context,
    generated: GeneratedFile[]
  ): Promise<ReconcilePlan> {
    const files = this.withRoutesFile(generated)

    // El prefijo es `store/` y no el de custom pages porque hace falta el SHA de
    // TODOS los archivos generados: sin el de routes.json, custom-navbar.jsonc y
    // home.jsonc, esos tres se verían como cambiados en cada corrida.
    const { files: repoFiles, truncated } =
      await ctx.clients.github.listFiles('store/')

    if (truncated) {
      throw new Error(
        'GitHub devolvió el árbol truncado: no se puede determinar qué archivos sobran en el repo.'
      )
    }

    const generatedPaths = new Set(files.map((file) => file.path))
    const shaInRepo = new Map(repoFiles.map((file) => [file.path, file.sha]))

    const upserts = files.filter(
      (file) => shaInRepo.get(file.path) !== gitBlobSha(file.content)
    )

    // El filtro por prefijo es lo que garantiza que reconcile nunca borre nada
    // fuera de las custom pages.
    const deletions = repoFiles
      .filter((file) => file.path.startsWith(CUSTOM_PREFIX))
      .filter((file) => file.path.endsWith('.jsonc'))
      .filter((file) => !generatedPaths.has(file.path))
      .map((file) => file.path)

    const { routesFinal, routesRemoved } = await this.routeDiff(ctx, files)

    ctx.vtex.logger.info({
      message: `[ReconcilePlanService] ${upserts.length} upserts, ${deletions.length} deletions, ${routesRemoved.length} rutas dadas de baja.`,
    })

    return { upserts, deletions, routesFinal, routesRemoved }
  }

  /**
   * Normaliza los paths y garantiza que `routes.json` esté siempre presente.
   *
   * `CustomPageBuildJsonStrategy` no emite ningún archivo cuando no queda
   * ninguna página en pie, ni siquiera el `routes.json`. Para el modo
   * autoritativo eso significa exactamente "el CMS no tiene rutas": `{}`.
   */
  private static withRoutesFile(generated: GeneratedFile[]): PlannedFile[] {
    const files = generated.map((file) => ({
      path: normalizeRepoPath(`${file.path}/${file.filename}`),
      content: file.content,
    }))

    if (!files.some((file) => file.path === ROUTES_PATH)) {
      files.push({ path: ROUTES_PATH, content: '{}' })
    }

    return files
  }

  /**
   * Las rutas que quedan y las que se dan de baja. Necesita el contenido del
   * `routes.json` publicado, que el árbol no trae —solo trae el SHA—, así que
   * es la única lectura extra del plan.
   */
  private static async routeDiff(
    ctx: Context,
    files: PlannedFile[]
  ): Promise<{ routesFinal: string[]; routesRemoved: string[] }> {
    const generatedRoutes = files.find((file) => file.path === ROUTES_PATH)
    const finalRoutes = JSON.parse(generatedRoutes?.content ?? '{}')

    const published = await ctx.clients.github.getFileContent(ROUTES_PATH)

    const publishedRoutes =
      published.exists && published.content
        ? JSON.parse(published.content)
        : {}

    return {
      routesFinal: Object.keys(finalRoutes),
      routesRemoved: Object.keys(publishedRoutes).filter(
        (key) => !(key in finalRoutes)
      ),
    }
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
yarn test services/__tests__/ReconcilePlanService.test.ts
```

Esperado: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add node/services/ReconcilePlanService.ts node/services/__tests__/ReconcilePlanService.test.ts
git commit -m "Add reconcile plan service"
```

---

### Task 6: El handler `reconcile` y el alta de la ruta

Junta las piezas y expone el endpoint.

**Files:**
- Create: `node/middlewares/reconcile.ts`
- Create: `node/typings/reconcile-response.d.ts`
- Test: `node/middlewares/__tests__/reconcile.test.ts`
- Modify: `node/index.ts` (registrar la ruta)
- Modify: `node/service.json` (la ruta y el timeout)
- Modify: `README.md` (documentar el endpoint ya implementado)

**Interfaces:**
- Consumes: `StrapiConfigService.getConfig` (existente), `initGitHubClient` (existente), `ReconcileContentService.build` (Task 4), `ReconcilePlanService.plan` (Task 5), `ctx.clients.github.commitFiles` (existente).
- Produces: `reconcile(ctx: Context, next: () => Promise<any>): Promise<void>`, y el tipo `ReconcileResponse`.

- [ ] **Step 1: Escribir el test que falla**

Crear `node/middlewares/__tests__/reconcile.test.ts`:

```ts
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
    expect(ctx.body).toMatchObject({ success: true, committed: false, commitSha: null })
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
    const { ctx } = buildGithubCtx({ [ROUTES]: trackedFile(routesConSucursales) })
    const next = jest.fn(async () => undefined)

    await reconcile(ctx, next)

    expect(next).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
yarn test middlewares/__tests__/reconcile.test.ts
```

Esperado: FAIL, `Cannot find module '../reconcile'`.

- [ ] **Step 3: Crear el tipo de la respuesta**

Crear `node/typings/reconcile-response.d.ts`:

```ts
export interface ReconcileResponseSuccess {
  success: true
  /** `false` cuando el repo ya coincidía con el CMS y no hubo commit. */
  committed: boolean
  commitSha: string | null
  files: {
    /** Paths que cambiaron y se escribieron. */
    written: string[]
    /** Custom pages huérfanas que se borraron. */
    deleted: string[]
  }
  routes: {
    /** Keys de `routes.json` publicadas después del reconcile. */
    final: string[]
    /** Keys que se dieron de baja. */
    removed: string[]
  }
}

export interface ReconcileResponseError {
  success: false
  error: string
}

export type ReconcileResponse =
  | ReconcileResponseSuccess
  | ReconcileResponseError
```

- [ ] **Step 4: Implementar el handler**

Crear `node/middlewares/reconcile.ts`:

```ts
import type {
  ReconcileResponse,
  ReconcileResponseSuccess,
} from '../typings/reconcile-response'
import { ReconcileContentService } from '../services/ReconcileContentService'
import { ReconcilePlanService } from '../services/ReconcilePlanService'
import { StrapiConfigService } from '../services/StrapiConfigService'
import { initGitHubClient } from '../utils/github.helper'

/**
 * Deja el store theme exactamente en el estado que publica el CMS.
 *
 * A diferencia de `/_v/deploy`, que regenera una sección, acá se lee todo y se
 * escribe todo: es lo que corrige el drift que el incremental acumula cuando un
 * trigger no corre o un rename pierde su `previousSlug`.
 */
export async function reconcile(ctx: Context, next: () => Promise<any>) {
  try {
    ctx.status = 200
    ctx.body = await run(ctx)
  } catch (err: any) {
    const response: ReconcileResponse = {
      success: false,
      error: err.message ?? String(err),
    }

    ctx.status = 500
    ctx.body = response
  }

  await next()
}

async function run(ctx: Context): Promise<ReconcileResponseSuccess> {
  const strapi = await StrapiConfigService.getConfig(ctx)

  // Todo el CMS se lee y se buildea en memoria antes de tocar GitHub: si algo
  // falla acá, el repo queda exactamente como estaba.
  const generated = await ReconcileContentService.build(ctx, strapi)

  await initGitHubClient(ctx)

  const plan = await ReconcilePlanService.plan(ctx, generated)

  const report = {
    success: true as const,
    files: {
      written: plan.upserts.map((file) => file.path),
      deleted: plan.deletions,
    },
    routes: { final: plan.routesFinal, removed: plan.routesRemoved },
  }

  if (!plan.upserts.length && !plan.deletions.length) {
    ctx.vtex.logger.info({
      message: '[reconcile] El theme ya coincide con el CMS. Sin commit.',
    })

    return { ...report, committed: false, commitSha: null }
  }

  const res = await ctx.clients.github.commitFiles(
    { upserts: plan.upserts, deletions: plan.deletions },
    `Reconcile store theme with CMS (${plan.upserts.length} files, ${plan.deletions.length} deletions)`
  )

  if (res?.data?.error) {
    throw res.data.error
  }

  return {
    ...report,
    committed: res.data.action === 'committed',
    commitSha: res.data.sha ?? null,
  }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

```bash
yarn test middlewares/__tests__/reconcile.test.ts
```

Esperado: PASS, 4 tests.

- [ ] **Step 6: Registrar la ruta en el servicio**

En `node/index.ts`, agregar el import junto al de `deploy`:

```ts
import { reconcile } from './middlewares/reconcile'
```

Y el registro en `routes`:

```ts
  routes: {
    deploy: [deploy],
    reconcile: [reconcile],
  },
```

En `node/service.json`, dejar el archivo así:

```json
{
  "memory": 256,
  "ttl": 10,
  "timeout": 60,
  "minReplicas": 2,
  "maxReplicas": 10,
  "workers": 4,
  "routes": {
    "deploy": {
      "path": "/_v/deploy",
      "public": true,
      "method": "POST"
    },
    "reconcile": {
      "path": "/_v/reconcile",
      "public": true,
      "method": "POST",
      "rateLimitPerReplica": {
        "concurrent": 1
      }
    }
  }
}
```

`timeout` es del **servicio**, no de la ruta: `ServiceRoute` en `@vtex/api` no lo acepta. Subirlo a 60 lo sube también para `/_v/deploy`, que es aceptable porque es un techo y no una demora. `rateLimitPerReplica` sí es por ruta, y `concurrent: 1` evita que dos reconciliaciones calculen su plan contra el mismo commit padre.

- [ ] **Step 7: Correr el gate completo**

Desde la raíz del repo:

```bash
bash lint.sh
```

Esperado: ESLint sin errores, `tsc --noEmit` limpio, y toda la suite de Jest en verde.

- [ ] **Step 8: Documentar el endpoint en el README**

En `README.md`, reemplazar la sección `## Trabajo planificado` (que apunta al spec como no implementado) por una entrada real bajo `## Endpoints disponibles`, después de todo lo de `/_v/deploy` y antes de `### Bloques soportados`:

````markdown
### `POST /_v/reconcile`

Público, sin parámetros. Lee **todo** el CMS y deja el theme exactamente en ese estado, en
un único commit. Corrige el drift que el deploy incremental acumula: rutas huérfanas de
renames que perdieron su `previousSlug`, y secciones que se quedaron viejas porque su
trigger no corrió.

**Body:** `{}` (o ausente). Cualquier campo que llegue se ignora.

**Respuesta OK (200)**

```json
{
  "success": true,
  "committed": true,
  "commitSha": "a1b2c3d",
  "files": {
    "written": ["store/blocks/pages/custom/sucursales/sucursales.jsonc", "store/routes.json"],
    "deleted": ["store/blocks/pages/custom/sucursales/sucursalesnueva.jsonc"]
  },
  "routes": {
    "final": ["store.custom#sucursales"],
    "removed": ["store.custom#sucursalesnueva"]
  }
}
```

Si el repo ya coincide con el CMS, `committed` es `false`, `commitSha` es `null` y no se
genera ningún commit —ni build del theme—. `files.written` lista solo lo que realmente
cambió: el plan compara el SHA de blob de cada archivo generado contra el del árbol del
repo.

**Es autoritativo.** `routes.json` se **reescribe** (no se mergea como en `/_v/deploy`) y
se borra todo `.jsonc` bajo `store/blocks/pages/custom/` que no corresponda a una página del
CMS. Nada fuera de `store/` se toca, y `custom-navbar.jsonc` y `home.jsonc` se sobrescriben
pero nunca se borran.

Asunción: **`routes.json` es propiedad exclusiva del CMS.** Una ruta agregada a mano al
theme se pierde en la primera reconciliación.

**Todo o nada.** Las tres queries y el build ocurren en memoria; recién al final hay un
único commit. Si Strapi falla, no se commitea nada.

Diseño completo en
[`docs/superpowers/specs/2026-09-18-reconcile-endpoint-design.md`](docs/superpowers/specs/2026-09-18-reconcile-endpoint-design.md).
````

- [ ] **Step 9: Commit**

```bash
git add node/middlewares/reconcile.ts node/typings/reconcile-response.d.ts node/middlewares/__tests__/reconcile.test.ts node/index.ts node/service.json README.md
git commit -m "Add POST /_v/reconcile endpoint"
```

---

## Después del plan: el job de Jenkins

El pipeline vive en **otro repo** (`lindo-vtexio-strapi-coco`), así que no es una task de este plan. Una vez que el endpoint esté linkeado y probado a mano contra el workspace, queda:

1. Crear `jenkinsfile.reconcile` en ese repo — el contenido completo está en la sección *Job de Jenkins* del spec.
2. Dar de alta el job en Jenkins pegando ese script, **sin parámetros** (no lleva `BODY` ni `BRANCH_NAME`).
3. Correr "Build Now" una vez: en Jenkins el `cron` de un Pipeline se registra recién después del primer build manual.
4. Documentar el job en el README y el CLAUDE.md de `lindo-vtexio-strapi-coco`.

`Dockerfile.jenkins` no cambia: `workflow-aggregator`, `http_request` y `mailer` ya están horneados.

## Verificación manual antes del cron

El primer run tiene que ser a mano, porque es la oportunidad de ver qué borra el modo autoritativo antes de dejarlo suelto:

```bash
curl -s -X POST https://staging--lindoqa.myvtex.com/_v/reconcile \
  -H 'Content-Type: application/json' -d '{}' | jq
```

Contra el estado actual de la rama `lindoqa`, la respuesta esperada incluye
`store.custom#sucursalesnueva` en `routes.removed` y su `.jsonc` en `files.deleted`: es el
drift que motivó el endpoint. Si `files.deleted` trae algo que no esperabas, **no** des de
alta el cron y revisá el plan primero.
