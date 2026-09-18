# Store theme builder

Servicio VTEX IO (builder `node`) que genera los archivos de layout del store theme
a partir del contenido publicado en **Strapi** y los commitea automáticamente en el
repositorio de GitHub del theme (`lindoSoftware/lindo-vtexio-store-theme`).

Flujo general:

```
Strapi (lifecycle hook)  →  Jenkins  →  POST /_v/deploy
                                        →  SectionStrategy (lee Strapi)
                                        →  BuildJsonCommand (arma los .jsonc del theme)
                                        →  CommitJsonCommand (commitea en GitHub)
```

Nadie llama al endpoint a mano: lo dispara el CMS en cada guardado. Ver
[Quién dispara el deploy](#quién-dispara-el-deploy).

## Estructura de servicio VTEX IO

```
.
├── node/
│   ├── clients/                 # Clientes externos (GitHub, Strapi GraphQL)
│   ├── middlewares/
│   │   ├── deploy.ts            # Handler de la ruta /_v/deploy
│   │   ├── commands/            # BuildJsonCommand, CommitJsonCommand
│   │   └── strategies/
│   │       ├── cms/             # Obtención de datos por sección (Strapi)
│   │       ├── builds/          # Generación de los archivos del theme
│   │       └── layout/          # VtexLayoutBuilder + processors por bloque
│   ├── resolvers/               # Resolvers de GraphQL (vacío por ahora)
│   ├── mappers/                 # Mappers (vacío por ahora)
│   ├── services/                # StrapiConfigService, CustomPageRemovalService
│   ├── typings/                 # Tipos e interfaces TypeScript
│   ├── utils/                   # helpers, constants, queries GraphQL de Strapi
│   ├── env.ts                   # Constantes de entorno (repo de GitHub, paths)
│   ├── index.ts                 # Punto de entrada del servicio
│   ├── service.json             # Configuración del servicio (rutas, replicas)
├── manifest.json                # Configuración del proyecto
├── package.json                 # Dependencias del proyecto
└── README.md                    # Documentación del proyecto
```

## Configuración (App Settings)

Se configuran en el admin de VTEX (`settingsSchema` del `manifest.json`):

| Setting | Requerido | Descripción |
| --- | --- | --- |
| `githubToken` | Sí | Token de GitHub (`ghp_...`) con permiso de escritura sobre el repo del theme |
| `githubBranchName` | Sí | Branch destino de los commits (`main`, `staging`, etc.) |
| `strapiURL` | Sí | URL base de Strapi (ej. `https://strapi-instance-url.com`) |
| `strapiToken` | No | API Token read-only de Strapi. Si se deja vacío, las queries usan el rol Public |

Constantes fijas en `node/env.ts`: `GIT_OWNER`, `GIT_REPOSITORY`, `GIT_API_URL` y
`CUSTOM_PAGE_PATH`.

## Quién dispara el deploy

El hook vive en `src/index.ts` del repo `lindo-vtexio-strapi-coco`, y el pipeline de ese
mismo repo (`jenkinsfile`) reenvía su parámetro `BODY` **verbatim** a este endpoint.

Strapi tiene suscritos exactamente tres modelos y `section` sale de
`model.uid.split('.').pop()`, así que el conjunto de requests posibles es cerrado:

| Cambio en el CMS | Payload |
| --- | --- |
| `navbar` creado o editado | `{"section":"navbar"}` |
| `home-page` creado o editado | `{"section":"home-page"}` |
| `custom-page` creada o editada | `{"section":"custom-page","variables":{"filters":{"slug":{"eq":"<slug>"}}}}` |
| `custom-page` con el slug renombrado | el anterior **+** `"previousSlug":"<slug-viejo>"` |
| `custom-page` eliminada | `{"section":"custom-page","deleted":true,"previousSlug":"<slug>"}` |

Dos huecos de ese hook, que explican buena parte del drift que se acumula en el theme:

- **No hay request de borrado para `navbar` ni `home-page`.** El `afterDelete` de Strapi
  corta para todo lo que no sea `custom-page`.
- **Una `custom-page` borrada sin slug conocido no dispara nada.** Si el slug no está ni en
  `event.state` ni en `event.result`, Strapi loguea un warning y no llama a Jenkins: la
  ruta y el `.jsonc` quedan huérfanos y ningún deploy posterior los toca.

## Endpoints disponibles

### `POST /_v/deploy`

Público. Construye y commitea el layout de una sección.

**Body**

```json
{
  "section": "custom-page",
  "variables": {
    "filters": {
      "slug": { "eq": "medios-de-pago" }
    }
  }
}
```

- `section`: `"navbar"` | `"home-page"` | `"custom-page"`
- `variables`: opcional, se pasa tal cual como variables a la query de Strapi (solo lo usa
  `custom-page`). **Si se omite**, el `$filters` de `CUSTOM_PAGE_QUERY` queda nulo, así que
  no filtra por slug. Que además traiga *todas* las custom pages depende de que la query
  tenga paginación explícita sin límite práctico —sin eso, el default de Strapi corta en 10
  (el plugin de GraphQL no define `defaultLimit` y cae al de `@strapi/utils`; el
  `defaultLimit: 25` de `config/api.ts` es de `rest`, no de GraphQL)—. Con eso, un
  `{"section":"custom-page"}` pelado regenera el layout de todas y reescribe `routes.json`
  con las rutas de todas ellas. Strapi nunca manda ese payload —siempre filtra por slug—,
  pero es válido y es la forma de republicar todo a mano.
- `previousSlug`: opcional, solo para `custom-page`. Slug con el que la página estaba
  publicada antes de renombrarla en el CMS — ver [Renombrado de custom pages](#renombrado-de-custom-pages).
- `deleted`: opcional, solo para `custom-page` y siempre junto a `previousSlug`. La
  página se eliminó del CMS: no se consulta Strapi ni se publica nada, solo se saca
  del theme — ver [Eliminación de custom pages](#eliminación-de-custom-pages).

**Respuesta OK (200)**

```json
{
  "success": true,
  "section": "custom-page",
  "variables": { "filters": { "slug": { "eq": "medios-de-pago" } } },
  "previousSlug": null,
  "removedRoutes": [],
  "data": { "customPages": [] }
}
```

`removedRoutes` lista las keys de `routes.json` que se dieron de baja en el deploy.

**Respuesta error**

```json
{ "success": false, "error": "Missing required setting: strapiURL" }
```

`400` solo en los dos casos de mal uso de `deleted`: mandarlo con una `section` distinta de
`custom-page`, o sin `previousSlug`. Son los únicos `BadRequestError` del servicio. Todo lo
demás responde `500`: JSON inválido, un `section` inexistente, un setting que falta, Strapi
caído o GitHub rechazando el commit.

### Secciones y archivos generados

| Section | Query Strapi | Archivos generados en el theme |
| --- | --- | --- |
| `navbar` | `NAVBAR_QUERY` | `store/blocks/header/custom-navbar.jsonc` |
| `home-page` | `HOME_PAGE_QUERY` | `store/blocks/pages/home/home.jsonc` |
| `custom-page` | `CUSTOM_PAGE_QUERY` | `store/blocks/pages/custom/<path>/<slug>.jsonc` + `store/routes.json` |

`routes.json` no se sobrescribe: se hace merge con el contenido existente en el repo
(las rutas nuevas pisan a las viejas en caso de conflicto). Si una sección no genera
archivos, el commit se omite por completo.

### Renombrado de custom pages

Cuando en el CMS se le cambia el slug a una custom page, el archivo publicado con el
slug viejo queda huérfano en el theme. Para limpiarlo, el CMS manda el slug anterior
en el mismo request:

```json
{
  "section": "custom-page",
  "variables": { "filters": { "slug": { "eq": "nueva-pagina" } } },
  "previousSlug": "pagina-vieja"
}
```

Con eso, `CustomPageRemovalService.plan` resuelve qué hay que sacar:

1. Busca `store.custom#<previousSlug>` en `routes.json` — es la única fuente que sabe
   con qué `path` se publicó la página vieja.
2. Devuelve la key de la ruta y el path del `.jsonc` a borrar.

El servicio **solo lee**. El borrado lo aplica `CommitJsonCommand` en el mismo commit
que escribe el `routes.json` nuevo — ver [Un solo commit por cambio](#un-solo-commit-por-cambio).

Es una operación best-effort y nunca rompe el deploy: se saltea con un warning si el
`previousSlug` no es válido, si no tiene ruta publicada, o si coincide con una de las
páginas que se acaban de publicar (borrarla dejaría el theme sin la página recién
generada). Si la ruta existe pero el `.jsonc` ya no está, la key igual se da de baja,
así un deploy que falló a mitad de camino se termina de limpiar en el reintento.

El `previousSlug` se normaliza con `BlockNameHelper.sanitizeSlug`, igual que en el
build, así que tiene que llegar tal cual estaba el slug en el CMS.

### Eliminación de custom pages

Cuando la página se borra del CMS no hay nada para publicar, solo hay que sacarla del
theme. El request lo indica con `deleted`:

```json
{
  "section": "custom-page",
  "deleted": true,
  "previousSlug": "pagina-vieja"
}
```

Con `deleted` en `true` el deploy corta por lo corto: **no consulta Strapi** (ni
siquiera necesita `strapiURL` configurado), no arma layout y no publica archivos. En un
único commit borra `store/blocks/pages/custom/<path>/<previousSlug>.jsonc` y saca su
entrada de `routes.json`, con las mismas garantías que el renombrado.

Requiere `section: "custom-page"` y un `previousSlug` no vacío; si falta alguno
responde `400`. Si el slug no tiene ruta publicada responde `200` con
`removedRoutes: []` — no es un error, la página ya no estaba.

### Un solo commit por cambio

Borrar el `.jsonc` viejo y actualizar `routes.json` tiene que ser **un único commit**.
En dos commits el repo pasa por un estado donde `routes.json` referencia un bloque que
ya no existe, y el build del theme corre sobre ese commit intermedio y falla.

La API de contenidos de GitHub solo permite un archivo por commit, así que
`GitHubClient.commitFiles` usa la Git Data API: lee el ref de la branch, arma el árbol
con todos los cambios (`sha: null` para los borrados) y crea un commit con ese árbol.
Si el árbol resultante es idéntico al actual no commitea nada, para no disparar builds
al vacío.

`routes.json` además se escribe **una sola vez por deploy**, siempre desde
`CommitJsonCommand`, y siempre como `{ ...loQueHayEnElRepo, ...lasRutasGeneradas }`
menos las keys dadas de baja. Que las rutas generadas se mergeen por encima es lo que
hace que el archivo no dependa de que la lectura de GitHub esté al día.

Un segundo componente que leyera y reescribiera el archivo en el mismo deploy no
tendría esa garantía: si su lectura llega desactualizada —la API de contenidos de
GitHub puede tardar en reflejar un commit recién hecho— escribiría un `routes.json`
sin la página que se acababa de publicar. Por eso `CustomPageRemovalService` solo
*reporta* qué dar de baja y no toca el repo.

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

`committed: false` tiene un segundo caso, con `files.written` **no vacío**: el plan detectó
diferencias, pero al momento de commitear el árbol resultante ya coincidía con el HEAD del
repo (por ejemplo, un `/_v/deploy` publicó el mismo cambio mientras tanto). `commitFiles` lo
resuelve como `skipped`, no como error.

**Respuesta error (500)**

```json
{ "success": false, "error": "Error executing Strapi GraphQL query: ..." }
```

Mismo shape que `/_v/deploy`. Este endpoint no valida body, así que nunca responde `400`.

**Es autoritativo.** `routes.json` se **reescribe** (no se mergea como en `/_v/deploy`) y
se borra todo `.jsonc` bajo `store/blocks/pages/custom/` que no corresponda a una página del
CMS. Nada fuera de `store/` se toca, y `custom-navbar.jsonc` y `home.jsonc` se sobrescriben
pero nunca se borran. Si una custom page se publica justo entre la lectura de Strapi y el
commit, su `.jsonc` queda pero pierde su entrada en `routes.json` —reconcile sobrescribe en
vez de mergear—; se autocorrige en la corrida siguiente.

Asunción: **`routes.json` es propiedad exclusiva del CMS.** Una ruta agregada a mano al
theme se pierde en la primera reconciliación.

**Todo o nada.** Las tres queries y el build ocurren en memoria; recién al final hay un
único commit. Si Strapi falla, no se commitea nada.

**Primera corrida: a mano.** Antes de dejar el cron de Jenkins suelto, correr el job con
"Build Now" una vez y revisar la respuesta —en particular `files.deleted` y
`routes.removed`— para auditar el drift real del repo contra el CMS antes de que quede
desatendido.

Diseño completo en
[`docs/superpowers/specs/2026-09-18-reconcile-endpoint-design.md`](docs/superpowers/specs/2026-09-18-reconcile-endpoint-design.md).

### Bloques soportados

Se resuelven por `appName` del contenido de Strapi:

- **Home page** (`utils/homepage-constants.ts`): `Slider`, `Cluster`, `MultipleStaticBanner`, `MultipleImageSelector`, `ImagePuzzle`.
- **Custom page** (`strategies/layout/custom-page/custompage-constants.ts`): `RichText`, `PaymentGroupCard`, `PaymentTab`, `PaymentTabGroup`, `Form`, `FAQ`, `BranchSelector`.

Un `appName` sin processor se ignora con un warning; no rompe el deploy.

## install
node version v20

```
yarn install
vtex setup
vtex link
```

## Lint y calidad

`lint.sh` es el gate de calidad del proyecto. Lo ejecuta `vtex release` a través del
script `prereleasy` del `manifest.json`, y también se puede correr a mano:

```
bash lint.sh          # gate completo (falla si algo no pasa)
bash lint.sh --fix    # aplica los fixes automáticos de eslint y sigue
```

Pasos que corre, en orden:

1. **ESLint** sobre todo el proyecto (`eslint-config-vtex`, que ya incluye Prettier
   como regla — no hay un paso de formato aparte).
2. **`tsc --noEmit`** sobre `node/tsconfig.json`.
3. **Jest** sobre `node/`.

Instala las dependencias de `.` y de `node/` solo si falta `node_modules`
(`yarn install --frozen-lockfile`, o `npm ci` si no hay yarn). Los warnings de ESLint
no bloquean; los errores sí.

Scripts sueltos disponibles en el `package.json` de la raíz: `yarn lint`,
`yarn lint:fix`, `yarn format`.

## Tests

Jest + ts-jest. Los tests viven en `node/**/__tests__/*.test.ts`.

```
cd node
yarn test
```

## DOC

https://developers.vtex.com/docs/apps/vtex.slider-layout
https://developers.vtex.com/docs/apps/vtex.store-image
