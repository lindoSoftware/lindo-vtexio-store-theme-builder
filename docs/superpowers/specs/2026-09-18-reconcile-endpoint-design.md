# `POST /_v/reconcile` — reconciliación CMS → store theme

**Fecha:** 2026-09-18
**Estado:** diseño aprobado, sin implementar
**Plan:** `docs/superpowers/plans/2026-09-18-reconcile-endpoint.md`
**Repos que toca:** `lindo-vtexio-store-theme-builder` (el endpoint), `lindo-vtexio-strapi-coco` (el job de Jenkins)

## Problema

El deploy actual es incremental: cada save en Strapi dispara un `POST /_v/deploy` que
regenera **una** sección. Eso deja dos huecos que el theme acumula como drift:

1. **Un fallo se queda.** Si el trigger de Strapi no corre (Jenkins caído, `JENKINS_URL_BASE`
   sin setear, el warning de `custom-page` borrada sin slug), esa sección queda vieja en el
   repo y nada la vuelve a tocar.
2. **`routes.json` solo crece.** `CommitJsonCommand` lo mergea con lo que hay en el repo, y
   la única forma de sacar una entrada es que el request traiga `previousSlug`. Si ese dato
   se pierde, la ruta y su `.jsonc` quedan huérfanos para siempre.

El drift ya existe. En la rama `lindoqa` de `lindo-vtexio-store-theme`:

```json
{
  "store.custom#sucursales":      { "path": "/sucursales" },
  "store.custom#sucursalesnueva": { "path": "/sucursales" }
}
```

Dos rutas al mismo path, y los dos `.jsonc` conviviendo en
`store/blocks/pages/custom/sucursales/`. Es el residuo de un rename que no se limpió.

## Solución

Un endpoint nuevo que lee **todo** el CMS y deja el repo exactamente en ese estado, en un
único commit. Se dispara por cron desde Jenkins. No reemplaza al deploy incremental: lo
corrige cuando se desincroniza.

### Alcance

**Entra:** las tres secciones que el CMS publica hoy (`navbar`, `home-page`, `custom-page`),
el borrado de custom pages huérfanas, y la reescritura autoritativa de `routes.json`.

**No entra:** cambios en `/_v/deploy` ni en ninguna de sus piezas; hooks nuevos en Strapi;
modos parciales (`sections`, `dryRun`); asincronía.

## Contrato

### Request

```http
POST /_v/reconcile
Content-Type: application/json

{}
```

Sin parámetros. El body puede estar ausente o vacío; cualquier campo que llegue se ignora.
No hay validación de body, así que este endpoint nunca responde 400.

### Response — 200

```json
{
  "success": true,
  "committed": true,
  "commitSha": "a1b2c3d",
  "files": {
    "written": [
      "store/blocks/header/custom-navbar.jsonc",
      "store/blocks/pages/home/home.jsonc",
      "store/blocks/pages/custom/sucursales/sucursales.jsonc",
      "store/routes.json"
    ],
    "deleted": [
      "store/blocks/pages/custom/sucursales/sucursalesnueva.jsonc"
    ]
  },
  "routes": {
    "final":   ["store.custom#sucursales"],
    "removed": ["store.custom#sucursalesnueva"]
  }
}
```

Sin drift, el plan queda vacío —ningún archivo difiere y no hay nada que borrar— y no se
llega a commitear. El endpoint responde igual con 200:

```json
{
  "success": true,
  "committed": false,
  "commitSha": null,
  "files":  { "written": [], "deleted": [] },
  "routes": { "final": ["store.custom#sucursales"], "removed": [] }
}
```

`routes.final` refleja el estado del CMS aunque no se haya commiteado: es lo que el cron
reporta como "así quedó". `files.written` y `files.deleted` listan solo lo que **cambió**
—ver *Cómo se calcula el diff* más abajo—, para que un build sin cambios se lea como tal.

### Response — 500

El mismo shape que usa `/_v/deploy` hoy:

```json
{ "success": false, "error": "Error executing Strapi GraphQL query: ..." }
```

### Atomicidad

Las tres queries a Strapi y el build entero ocurren en memoria. Recién al final hay **un**
`commitFiles`. Si cualquiera de las tres queries falla, o falta un setting, no se commitea
nada y el repo queda exactamente como estaba. No existe el estado "reconcilié dos secciones
de tres".

## Semántica autoritativa

| Path | Política |
| --- | --- |
| `store/routes.json` | **Reescrito.** Queda con exactamente las keys derivadas del CMS. |
| `store/blocks/pages/custom/**/*.jsonc` | **Borrado** todo el que no corresponda a una página del CMS. |
| `store/blocks/header/custom-navbar.jsonc` | Sobrescrito. Nunca borrado. |
| `store/blocks/pages/home/home.jsonc` | Sobrescrito. Nunca borrado. |
| Cualquier otro path del repo | Intocado. |

Diferencia clave con `CommitJsonCommand`: **no hay merge**. No se lee el `routes.json` del
repo para combinarlo; se escribe el del CMS y punto.

### Asunción explícita

**`routes.json` es propiedad exclusiva del CMS.** Hoy es cierto —en `lindoqa` el archivo
solo contiene keys `store.custom#*`— pero si alguien agrega a mano una ruta al theme, la
primera reconciliación la borra. Si en algún momento el theme necesita rutas propias, hay
que mover esas keys a otro archivo o acotar la reescritura al prefijo `store.custom#`.

### Casos que esto arregla y el incremental no

- **Rename de slug sin `previousSlug`** (el caso `sucursalesnueva`): el archivo viejo ya no
  está en el set generado, así que se borra.
- **Cambio de `path`** de una página: el `.jsonc` vieja vive en otro directorio y el
  incremental ni lo mira. Acá el diff del árbol lo encuentra.
- **CMS sin custom pages.** `CustomPageBuildJsonStrategy` no emite ningún archivo cuando no
  queda ninguna página en pie (ni siquiera `routes.json`). Reconcile trata ese caso como
  `routes.json = {}` y borra todos los `.jsonc` del prefijo custom.
- **Páginas con slug inválido.** `BlockNameHelper.sanitizeSlug` las descarta; sin archivo ni
  ruta generados, reconcile borra lo que hubiera quedado publicado de ellas.

## Arquitectura

### Piezas nuevas

| Archivo | Responsabilidad |
| --- | --- |
| `node/middlewares/reconcile.ts` | Handler de la ruta. Orquesta, arma la respuesta, mapea errores. |
| `node/services/ReconcileContentService.ts` | Lee las tres secciones del CMS en paralelo y arma todos los `GeneratedFile[]`, reusando las estrategias existentes. |
| `node/services/ReconcilePlanService.ts` | De los `GeneratedFile[]` + el árbol actual del repo saca `{ upserts, deletions, routesFinal, routesRemoved }`. Solo lee y calcula; no commitea. |
| `node/utils/gitBlobSha.ts` | El SHA de blob de git de un contenido, para comparar contra el del árbol. Ver *Cómo se calcula el diff*. |
| `GitHubClient.listFiles(prefix)` | `git.getTree({ recursive: true })` sobre el branch, filtrado por prefijo. Devuelve el path y el SHA de blob de cada archivo, más el flag `truncated`. Una sola llamada. |
| `node/utils/normalizeRepoPath.ts` | Única forma de armar un path del repo. Ver *Normalización de paths*. |

### Piezas reusadas sin cambios

`SectionStrategyFactory`, `BuildJsonStrategyFactory`, `VtexLayoutBuilder`, todos los
processors de layout (home-page y custom-page), `BlockNameHelper`, `StrapiConfigService`,
`GitHubClient.commitFiles`, `initGitHubClient`.

### Piezas que NO se tocan

`middlewares/deploy.ts` y `commands/BuildJsonCommand.ts`. El comportamiento del camino
incremental queda idéntico mientras el modo autoritativo se estabiliza.

### Refactor acotado

`commands/CommitJsonCommand.ts` y `services/CustomPageRemovalService.ts` cambian su
`.replace(/\/+/g, '/')` inline por el helper compartido. Es equivalente salvo por el strip
de la barra inicial, que hoy ninguno de los dos necesita porque sus paths arrancan en
`store/`. Entra en el alcance porque es justamente la trampa que el código nuevo podía
repetir: el arreglo tiene que estar en un solo lugar o vuelve a aparecer.

No se crea un `Command` nuevo: la clase base `Command` se construye con `(section, data)` y
reconcile no tiene una sola sección. El handler llama `commitFiles` directo.

### Normalización de paths

`CUSTOM_PAGE_PATH` termina en `/`, y el `path` que el editor carga en Strapi puede venir con
barra inicial o sin ella. Cuando viene con, `${CUSTOM_PAGE_PATH}${page.path}` produce una
barra doble; `CustomPageRemovalService.pageFilePath` directamente la genera siempre, porque
concatena `CUSTOM_PAGE_PATH` + `/` + un `routePath` que ya trae la suya.

Hoy eso no rompe nada porque `CommitJsonCommand` normaliza justo antes de commitear. El
riesgo es que un consumidor nuevo se olvide: comparar
`store/blocks/pages/custom//sucursales/x.jsonc` contra el árbol no matchea, y el diff
reportaría todo como cambiado.

```ts
export const normalizeRepoPath = (path: string): string =>
  path.replace(/\/+/g, '/').replace(/^\//, '')
```

Colapsa cualquier corrida de barras a una sola **y** saca la inicial: `//store/x` colapsado
queda `/store/x`, que la API de GitHub rechaza. Todo path que se compare contra el árbol,
se commitee o se borre pasa por acá.

### Flujo

1. `StrapiConfigService.getConfig(ctx)` — `strapiURL` (requerido) y `strapiToken` (opcional).
2. `Promise.all` de las tres `SectionStrategy`:
   - `NavbarStrategy.getData(ctx, null, strapi)`
   - `HomePageStrategy.getData(ctx, null, strapi)`
   - `CustomPageStrategy.getData(ctx, **undefined**, strapi)` — sin `variables`, el
     `$filters` de `CUSTOM_PAGE_QUERY` queda nulo, pero eso solo saca el filtro por slug.
     Lo que garantiza que vuelvan **todas** las páginas es que la query trae paginación
     explícita sin límite práctico (`pagination: { limit: 2147483647 }`): sin eso, el
     default de Strapi corta en 10 —el plugin de GraphQL no define `defaultLimit` y cae
     al `10` de `@strapi/utils`; el `defaultLimit: 25` de `config/api.ts` es de `rest` y
     esta query nunca lo lee.
3. Las tres `BuildJsonStrategy` sobre esa data → un `GeneratedFile[]` único.
4. `initGitHubClient(ctx)` y `ReconcilePlanService.plan(ctx, generatedFiles)`:
   - separa el `routes.json` generado (o `{}` si no se emitió) — ese es el contenido final;
   - `listFiles('store/')` — el prefijo es `store/` y no el de custom pages porque el SHA
     hace falta para **todos** los archivos generados: sin el de `routes.json`, el de
     `custom-navbar.jsonc` y el de `home.jsonc`, esos tres se verían como cambiados en cada
     corrida;
   - `getFileContent('store/routes.json')` para poder reportar `routes.removed`, que
     necesita el contenido y no solo el SHA;
   - `deletions` = los `.jsonc` **bajo `CUSTOM_PAGE_PATH`** que no están en el set generado;
     el filtro por ese prefijo es lo que garantiza que reconcile no borre nada fuera de las
     custom pages;
   - `upserts` = los archivos generados cuyo contenido **difiere** del repo;
   - `routesRemoved` = las keys que estaban en el `routes.json` del repo y no en el nuevo
     (solo informativo; el archivo se reescribe entero igual).
5. Si `upserts` y `deletions` quedaron vacíos, se devuelve `committed: false` sin tocar
   GitHub. Si no, `commitFiles({ upserts, deletions }, mensaje)` — un commit.
6. Respuesta.

### Cómo se calcula el diff

`git.getTree` ya devuelve el SHA de blob de cada archivo, y ese SHA es
`sha1("blob " + length + "\0" + content)`. Calcularlo localmente sobre el contenido
generado y compararlo con el del árbol dice, sin una sola llamada extra, qué archivos
cambiaron de verdad.

Eso es lo que hace honesto el `files.written` de la respuesta, y lo que permite salir sin
commitear cuando no hay drift. `commitFiles` igual hace su propio no-op si el árbol
resultante coincide, pero depender de eso dejaría a la respuesta sin saber qué informar.

Los dos lados de la comparación pasan por `normalizeRepoPath` (ver *Normalización de
paths*): los paths generados traen barras dobles con frecuencia y los del árbol nunca, así
que sin normalizar no matchea nada y todo se vería como cambiado.

**Costo de red:** 3 llamadas a Strapi + 1 `getTree` + 1 `getFileContent` del `routes.json`,
más 5 del commit (`getRef`, `getCommit`, `createTree`, `createCommit`, `updateRef`) solo si
hay algo que commitear. Constante respecto de la cantidad de páginas: 5 llamadas cuando no
hay drift, 10 cuando lo hay.

**Mensaje de commit:** `Reconcile store theme with CMS (N files, M deletions)`.

**Caveat de `getTree`:** la API de GitHub trunca el árbol arriba de ~100k entradas y marca
`truncated: true`. Con un árbol truncado no se puede afirmar qué sobra, así que
`ReconcilePlanService` debe **abortar** si `truncated` viene en `true`, en vez de borrar con
información incompleta. El repo del theme está órdenes de magnitud por debajo de ese límite;
la guarda es para que un futuro crecimiento falle ruidoso y no borre de más.

## Configuración

### `node/service.json`

```json
{
  "timeout": 60,
  "routes": {
    "deploy":    { "path": "/_v/deploy",    "public": true, "method": "POST" },
    "reconcile": { "path": "/_v/reconcile", "public": false, "method": "POST",
                   "policies": [{ "effect": "allow", "actions": ["post"],
                                  "principals": ["vrn:vtex.vtex-id:*:*:*:user/vtexappkey-lindoqa-*"] }],
                   "rateLimitPerReplica": { "concurrent": 1 } }
  }
}
```

Tres cosas que conviene tener escritas, porque no son obvias:

- **`timeout` es del servicio, no de la ruta.** En `@vtex/api`, `timeout` vive en
  `RawServiceJSON` y `ServiceRoute` solo acepta `path`, `public`, `smartcache`,
  `extensible`, `settingsType` y `rateLimitPerReplica`. Subirlo a 60s lo sube también para
  `/_v/deploy`. Es aceptable: un timeout es un techo, no una demora. El costo real es que
  un request colgado ocupa un worker 60s en vez de 10.
- **Una ruta privada sin `policies` no la llama nadie.** `public: false` por sí solo no
  "pide login": deja la ruta inaccesible para todos, usuarios admin incluidos. Habilitar a
  alguien requiere una *resource-based policy*, y ni usuarios ni appKeys entran por
  defecto. El principal usa el servicio `vtex.vtex-id` y el path `user/{email}` o
  `user/vtexappkey-{account}-{hash}`; el wildcard de arriba cubre cualquier appKey de
  `lindoqa`. Quien llama manda `X-VTEX-API-AppKey` y `X-VTEX-API-AppToken`, y el rechazo
  ocurre en el borde, antes del handler: un 403 no trae el `{success:false}` del servicio.
- **`rateLimitPerReplica` sí es por ruta, pero por réplica.** `concurrent: 1` limita las
  reconciliaciones simultáneas dentro de una réplica; `minReplicas` es 2, así que dos
  reconciliaciones en réplicas distintas pueden seguir corriendo al mismo tiempo. Reduce la
  ventana de la carrera, no la elimina. El `updateRef` de `commitFiles` no manda `force`,
  así que la que pierde la carrera falla ahí y responde 500 —cuesta una corrida fallida, no
  corrompe el repo.

### Settings de la app

Ninguno nuevo. Usa los mismos cuatro del `settingsSchema` del `manifest.json`:
`strapiURL`, `strapiToken` (opcional), `githubToken`, `githubBranchName`.

## Job de Jenkins

Vive en `lindo-vtexio-strapi-coco`, al lado del `jenkinsfile` actual, como
`jenkinsfile.reconcile`. **Strapi no participa:** no hay lifecycle hook nuevo,
`JENKINS_JOB_PATH` no cambia, y el job se dispara solo por cron.

```groovy
pipeline {
    agent any

    triggers { cron('H 3 * * *') }

    environment {
        API_POST_URL = "https://staging--lindoqa.myvtex.com/_v/reconcile"
        MAIL_TO = "rubeng@lindo.la"
    }

    stages {
        stage('Reconcile CMS -> Store Theme') {
            steps {
                withCredentials([
                    string(credentialsId: 'vtex-app-key', variable: 'VTEX_APP_KEY'),
                    string(credentialsId: 'vtex-app-token', variable: 'VTEX_APP_TOKEN'),
                ]) {
                    script {
                        // La ruta es privada: sin estos headers VTEX responde 403
                        // en el borde y el handler ni se ejecuta.
                        //
                        // validResponseCodes abarca todo por la misma razon que en
                        // jenkinsfile: si httpRequest tira la excepcion se pierde el
                        // cuerpo, y el motivo real viene en {success:false, error}.
                        def response = httpRequest(
                            url: API_POST_URL,
                            httpMode: 'POST',
                            contentType: 'APPLICATION_JSON',
                            requestBody: '{}',
                            customHeaders: [
                                [name: 'X-VTEX-API-AppKey', value: VTEX_APP_KEY, maskValue: true],
                                [name: 'X-VTEX-API-AppToken', value: VTEX_APP_TOKEN, maskValue: true],
                            ],
                            consoleLogResponseBody: true,
                            validResponseCodes: '100:599'
                        )

                        if (response.status < 200 || response.status >= 300) {
                            env.API_ERROR_MESSAGE = "❌ VTEX IO respondio ${response.status}: ${response.content}"
                            error(env.API_ERROR_MESSAGE)
                        }

                        echo "Reconcile OK: ${response.content}"
                    }
                }
            }
        }
    }

    post {
        failure {
            script {
                // Sin SMTP configurado el mail falla y enmascara el error real.
                try {
                    mail to: "${MAIL_TO}",
                         subject: "🚨 Reconcile fallo: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                         body: "URL: ${env.BUILD_URL}\n\n${env.API_ERROR_MESSAGE ?: 'sin detalle'}"
                } catch (mailErr) {
                    echo "⚠️ No se pudo enviar el mail: ${mailErr.getMessage()}"
                }
            }
        }
    }
}
```

Diferencias con el pipeline actual: **sin parámetros** (no hay `BODY` ni `BRANCH_NAME`),
con `triggers`, y con credenciales —el de deploy pega contra una ruta pública y no manda
ninguna—.

`Dockerfile.jenkins` suma `credentials-binding`, que aporta el paso `withCredentials`.
`workflow-aggregator`, `http_request` y `mailer` ya estaban.

### Alta del job

Igual que el actual —el pipeline script se pega a mano, no se carga desde SCM—, salvo que
no hay parámetros que declarar. Antes hay que cargar dos credenciales de tipo *secret
text*, con IDs `vtex-app-key` y `vtex-app-token`: son la appKey/appToken de una integración
de la cuenta `lindoqa` con permiso sobre el workspace. El mismo par ya vive en el `.env` de
Strapi como `VTEX_APP_KEY`/`VTEX_APP_TOKEN`.

Un paso que se olvida fácil:

> En Jenkins, el `cron` de un job Pipeline **se registra recién después del primer build
> manual**, porque hasta entonces Jenkins no evaluó el bloque `triggers`. Después de crear
> el job hay que darle "Build Now" una vez.

Correr el job a mano es también la forma de auditar el drift antes de dejar el cron suelto:
la respuesta lista exactamente qué se borró.

## Testing

`ReconcilePlanService` con el árbol del repo y los `GeneratedFile[]` mockeados:

- huérfano con ruta **y** archivo — el caso `sucursalesnueva` real;
- huérfano con archivo pero sin ruta en `routes.json`;
- página nueva que todavía no está en el repo;
- página que cambió de `path` (archivo viejo en otro directorio);
- CMS sin custom pages → `routes.json` queda `{}` y se borran todos los `.jsonc` del prefijo;
- sin drift → `upserts` y `deletions` vacíos (comparando SHA de blob calculado localmente);
- un archivo cuyo contenido cambió → entra en `upserts`, el resto no;
- paths con barras dobles → se normalizan antes de comparar, no se reportan como cambiados;
- `getTree` truncado → tira, no borra.

`reconcile.ts` con los clients mockeados, reusando `node/__tests__/helpers/github-context.ts`:

- happy path → un solo `commitFiles`, respuesta bien formada;
- fallo de una query de Strapi → 500 y **cero** llamadas a `commitFiles`;
- plan vacío → `committed: false` y **cero** llamadas a `commitFiles`.

`normalizeRepoPath`, unitario: barras dobles y triples colapsadas, barra inicial removida,
path ya limpio que queda igual, string vacío.

Los tests que hoy existen de `CommitJsonCommand` y `CustomPageRemovalService` tienen que
seguir pasando sin cambios: el refactor es equivalente en comportamiento para sus entradas.

Sin tests de integración contra GitHub ni Strapi reales.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Reescribir `routes.json` borra rutas escritas a mano en el theme | Hoy no existen. Documentado como asunción; si aparecen, acotar la reescritura al prefijo `store.custom#`. |
| Un CMS vacío o mal respondido borra todo el contenido custom | Las queries que fallan abortan sin commitear. Pero un Strapi que responde `{ customPages: [] }` legítimamente sí vacía el theme — es el comportamiento pedido. El primer run manual es la oportunidad de verificarlo. |
| El timeout de 60s aplica también a `/_v/deploy` | Es un techo, no una demora. Impacto: un request colgado ocupa un worker 60s. |
| Dos reconciliaciones concurrentes | `rateLimitPerReplica: { concurrent: 1 }` reduce la ventana, pero es por réplica y `minReplicas` es 2, así que no la elimina. La que pierde la carrera falla en el `updateRef` (sin `force`) y responde 500: una corrida fallida, no un repo corrupto. |
| El endpoint es destructivo | **Cerrado** (2026-09-21): la ruta pasó a `public: false` con una policy que solo habilita a las appKeys de `lindoqa`, y Jenkins llama con `X-VTEX-API-AppToken`. Ya no alcanza con conocer la URL del workspace. `/_v/deploy` sigue público a propósito: solo agrega contenido, y cerrarlo obligaría a tocar el job que ya corre en producción. |
| El token de la appKey vive en Jenkins | Credencial de tipo *secret text*, inyectada con `withCredentials` y enmascarada en los headers. Quien tenga acceso al job puede accionar el reconcile — es el mismo nivel de confianza que ya tiene el job de deploy. |

## Trabajo futuro (fuera de este spec)

- Que `/_v/deploy` pase a ser un caso particular de reconcile y se borre la duplicación
  entre `CommitJsonCommand` y el camino nuevo.
- Que el reconcile corra sobre más de un branch/workspace.

## Apéndice — la API actual, relevada

Los cinco payloads que `triggerJenkinsBuild` (en `lindo-vtexio-strapi-coco/src/index.ts`)
puede emitir hacia `/_v/deploy`. `section` sale de `model.uid.split('.').pop()`, y los
modelos suscritos son solo tres, así que la lista es cerrada:

| Origen | Payload |
| --- | --- |
| `navbar` → `afterCreate` / `afterUpdate` | `{"section":"navbar"}` |
| `home-page` → `afterCreate` / `afterUpdate` | `{"section":"home-page"}` |
| `custom-page` → `afterCreate` / `afterUpdate` | `{"section":"custom-page","variables":{"filters":{"slug":{"eq":"<slug>"}}}}` |
| `custom-page` con slug renombrado | el anterior **+** `"previousSlug":"<slug-viejo>"` |
| `custom-page` → `afterDelete` | `{"section":"custom-page","deleted":true,"previousSlug":"<slug>"}` |

`afterDelete` corta para todo lo que no sea `custom-page`, así que no existe un request de
borrado de `navbar` ni de `home-page`. Si en el borrado no hay slug (ni en `event.state` ni
en `event.result`), Strapi loguea un warning y no dispara nada — uno de los caminos por los
que aparece el drift que este endpoint corrige.

| `section` | Query | Archivos que commitea |
| --- | --- | --- |
| `navbar` | `NAVBAR_QUERY` | `store/blocks/header/custom-navbar.jsonc` |
| `home-page` | `HOME_PAGE_QUERY` | `store/blocks/pages/home/home.jsonc` |
| `custom-page` | `CUSTOM_PAGE_QUERY($filters)` | `store/blocks/pages/custom/<path>/<slug>.jsonc` (uno por página) + `store/routes.json` (mergeado) |

Detalle que no estaba documentado y que este diseño aprovecha: **`variables` es opcional**.
`CustomPageStrategy` lo pasa tal cual al client, y el `$filters` de `CUSTOM_PAGE_QUERY` es
nullable, así que un `{"section":"custom-page"}` sin `variables` no filtra por slug. Que
además traiga **todas** las páginas depende de que la query tenga paginación explícita sin
límite práctico —agregada en este mismo cambio—: sin ella, el default de Strapi corta en 10
(el plugin de GraphQL no define `defaultLimit` y cae al de `@strapi/utils`; el
`defaultLimit: 25` de `config/api.ts` es de `rest`, no de GraphQL). Strapi nunca emite ese
payload —siempre filtra por slug—, pero es el mecanismo sobre el que se apoya el paso 2 del
flujo de reconcile.
