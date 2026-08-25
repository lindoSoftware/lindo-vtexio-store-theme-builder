# Store theme builder

Servicio VTEX IO (builder `node`) que genera los archivos de layout del store theme
a partir del contenido publicado en **Strapi** y los commitea automáticamente en el
repositorio de GitHub del theme (`lindoSoftware/lindo-vtexio-store-theme`).

Flujo general:

```
POST /_v/deploy  →  SectionStrategy (lee Strapi)
                 →  BuildJsonCommand (arma los .jsonc del theme)
                 →  CommitJsonCommand (commitea en GitHub)
```

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
├── graphql/
│   ├── schema.graphql           # Esquema GraphQL
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
- `variables`: opcional, se pasa como variables a la query de Strapi (solo lo usa `custom-page`).
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

`400` si el request está mal formado, `500` si falló el deploy:

```json
{ "success": false, "error": "Missing required setting: strapiURL" }
```

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

### Bloques soportados

Se resuelven por `appName` del contenido de Strapi:

- **Home page** (`utils/homepage-constants.ts`): `Slider`, `Cluster`, `MultipleStaticBanner`, `MultipleImageSelector`, `ImagePuzzle`.
- **Custom page** (`strategies/layout/custom-page/custompage-constants.ts`): `RichText`, `PaymentGroupCard`, `PaymentTab`, `PaymentTabGroup`, `Form`, `FAQ`, `BranchSelector`.

Un `appName` sin processor se ignora con un warning; no rompe el deploy.

## Graphql disponibles


## Queries

ConfigView
```
query {
  configView {
    websiteEnabled
    substitutionCriteriaEnabled
    addToCartWithSellerEnabled
		incrementerInputEnabled
    cartsByCategories
  }
}
```

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
