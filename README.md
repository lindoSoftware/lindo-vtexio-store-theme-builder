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
│   ├── services/                # Lógica de servicios (StrapiConfigService)
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

**Respuesta OK (200)**

```json
{
  "success": true,
  "section": "custom-page",
  "variables": { "filters": { "slug": { "eq": "medios-de-pago" } } },
  "previousSlug": null,
  "data": { "customPages": [] }
}
```

**Respuesta error (500)**

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

Con eso, después de publicar la página nueva, `DeleteCustomPageCommand`:

1. Busca `store.custom#<previousSlug>` en `routes.json` — es la única fuente que sabe
   con qué `path` se publicó la página vieja.
2. Borra `store/blocks/pages/custom/<path>/<previousSlug>.jsonc`.
3. Commitea `routes.json` sin esa entrada.

El borrado corre **después** del commit de la página nueva: si publicarla falla, la
vieja sigue en pie. Es una operación best-effort y nunca rompe el deploy — se saltea
con un warning si el `previousSlug` no es válido, si no tiene ruta publicada, o si
coincide con una de las páginas que se acaban de publicar (borrarla dejaría el theme
sin la página recién generada). Si la ruta existe pero el `.jsonc` ya no está, igual
se limpia la entrada de `routes.json`.

El `previousSlug` se normaliza con `BlockNameHelper.sanitizeSlug`, igual que en el
build, así que tiene que llegar tal cual estaba el slug en el CMS.

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
