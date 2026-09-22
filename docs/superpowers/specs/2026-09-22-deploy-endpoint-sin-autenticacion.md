# `/_v/deploy` sin autenticación — hallazgo de seguridad

**Fecha:** 2026-09-22
**Rama revisada:** `staging` contra `main`
**Estado:** abierto, sin arreglar
**Severidad:** alta
**Confianza:** 9/10

---

## Resumen

`/_v/deploy` es una ruta pública sin ningún control de acceso, y en esta rama se le
agregó un camino que **borra archivos** del repo del theme. Cualquiera en internet que
conozca la URL del workspace puede dar de baja custom pages y escribir commits en
`lindoSoftware/lindo-vtexio-store-theme` usando el `githubToken` de la app.

Lo que hace que esto sea un hallazgo de *esta* rama y no una deuda vieja: hasta que se
sumó el borrado, la justificación de dejar el endpoint abierto era cierta. El README la
sigue afirmando, y ya no vale:

> `/_v/deploy` no lleva token: solo agrega contenido, y sumarle uno obligaría a tocar el
> job que ya corre en producción.
> — `README.md:285`

El control que falta acá existe a tres líneas de distancia, en el handler hermano.
`reconcile.ts` lo implementó justamente porque el endpoint borra.

## Alcance de la revisión

`origin/main` (`101dfb2e`) es un esqueleto vacío de VTEX IO: `service.json` tiene
`"routes": {}`, `index.ts` tiene `routes: {}`, y no existen ni `clients/github.ts` ni
los middlewares. Todo el servicio es nuevo respecto de `main`, así que el camino
destructivo entra en alcance aunque sea anterior al trabajo de reconcile. Dentro de la
rama, llegó con `9272af4b` ("Implement cleanup for renamed custom pages") y el manejo
posterior de `deleted`.

## La cadena, verificada

Cada eslabón se confirmó leyendo el código.

**1. La ruta es pública y no hay auth en ningún punto de la cadena.**

- `node/service.json:9-13` — `{"path": "/_v/deploy", "public": true, "method": "POST"}`,
  sin `policies`.
- `node/index.ts:36-39` — el wiring es `deploy: [deploy]`, un solo middleware. No hay
  nada antes.
- `node/middlewares/deploy.ts:16-37` — el handler lee el body y despacha. No hay
  `ctx.get(...)`, ni chequeo contra settings, ni verificación de identidad.
- `manifest.json:14-28` — solo políticas de `outbound-access`, nada por ruta.

**2. Un body con `deleted: true` llega a un borrado real en GitHub.**

- `deploy.ts:21-23` — `params.deleted` truthy despacha a `removeCustomPage`.
- `deploy.ts:92-136` — valida únicamente que `section === 'custom-page'` y que
  `previousSlug` no esté vacío. Los dos los manda el atacante.
- `CustomPageRemovalService.ts:32-90` — sanitiza el slug, lee `store/routes.json`,
  resuelve `store.custom#<slug>` y devuelve rutas y paths a borrar.
- `CommitJsonCommand.ts:172-180` — `commitFiles({ upserts: [routes.json], deletions })`.
- `clients/github.ts:168-257` — commit real por la Git Data API: `createTree` con
  entradas `sha: null` para las bajas, `createCommit`, `updateRef` sobre
  `heads/${branch}` del repo del theme (`node/env.ts:3-4`).

**3. La ruta es alcanzable desde internet.** Lo afirma el propio README en `265-273`:
"`public: true` es lo que hace que una ruta se publique en el dominio de la tienda", y
lista `https://staging--lindoqa.myvtex.com/_v/deploy`.

## Explotación

```sh
curl -X POST https://staging--lindoqa.myvtex.com/_v/deploy \
  -H 'Content-Type: application/json' \
  -d '{"section":"custom-page","deleted":true,"previousSlug":"<slug>"}'
```

Cada llamada commitea la baja del `.jsonc` de esa página y saca `store.custom#<slug>` de
`store/routes.json`. La página queda fuera del aire y el commit queda firmado con el
token de la app. Iterando sobre los slugs se bajan todas las custom pages.

No hace falta adivinar slugs: son visibles desde el storefront por construcción —son la
key de la ruta y el nombre del archivo— y además la respuesta 200 devuelve
`removedRoutes`, así que el endpoint sirve de oráculo de enumeración de sí mismo.

## Qué acota el daño

Dos cosas, que reducen el radio pero no refutan el hallazgo:

- `sanitizeSlug` (`node/utils/BlockNameHelper.ts:19-26`) recorta a `[a-z0-9-]`, así que
  no hay path traversal por el slug.
- El path del archivo a borrar sale de `route.path` leído del propio `routes.json` del
  repo (`CustomPageRemovalService.ts:113-117`), no del input. **No se pueden borrar paths
  arbitrarios**, solo custom pages legítimamente publicadas.

Vale anotar que la guarda de `CustomPageRemovalService.ts:49`
(`currentSlugs(...).includes(slug)`) es **inerte** en este camino, porque
`removeCustomPage` fija `data = { customPages: [] }` en `deploy.ts:109`. Está para el
caso del rename, no protege acá.

## Arreglo propuesto

Proteger **toda la ruta**, no solo los requests con `deleted: true`. Los helpers ya
existen en `node/middlewares/reconcile.ts:24-84`: `secretsMatch` y `UnauthorizedError`,
contra un setting de la app. Sumar el header al pipeline de deploy en
`lindo-vtexio-strapi-coco/jenkinsfile` es un cambio chico.

`publishSection` (`deploy.ts:43-86`) necesita lo mismo: también está sin autenticar, un
`{"section":"custom-page"}` pelado regenera y commitea todas las custom pages, y la
respuesta 200 devuelve el payload completo del CMS (`deploy.ts:84`).

Corregir de paso la justificación de `README.md:285`, que quedó vieja.

**Nota de coordinación:** tocar esto obliga a tocar el job de Jenkins que ya corre en
producción, que es exactamente lo que se quiso evitar cuando se decidió dejarlo abierto.
Los dos cambios tienen que salir juntos, o el CMS deja de deployar.

## Evaluado y descartado

**Echo del payload del CMS en la respuesta 200** (`deploy.ts:84`). La mecánica es real
—se devuelve `data`, la ruta no está autenticada, y sin `variables` la query sale sin
filtro con `pagination: { limit: 2147483647 }`—, pero el impacto no se sostiene.
`strapiToken` es **opcional**, no privilegiado: `StrapiConfigService.ts:15` usa
`getSetting` y `manifest.json:50-53` lo documenta como "Opcional: si se deja vacío las
queries usan el rol Public". Y `custom-page` tiene `draftAndPublish: false`
(`lindo-vtexio-strapi-coco/src/api/custom-page/content-types/custom-page/schema.json:10-12`),
así que no hay borradores que filtrar. Lo que se expone es contenido de storefront que
ese mismo request compila a `.jsonc` públicos. Es, como mucho, una línea de
endurecimiento sobre el hallazgo de arriba.

**Path traversal por el campo `page.path` del CMS**
(`CustomPageBuildJsonStrategy.ts:117` → `CommitJsonCommand.ts:94` →
`github.createOrUpdateFile`). `page.path` es texto libre y, a diferencia de `slug`, no se
sanitiza nunca; `normalizeRepoPath` deja pasar los segmentos `..`. **No es explotable:**
`@octokit/endpoint` expande el template `{path}` con expansión simple, así que cada `/`
viaja como `%2F` y el traversal nunca resuelve a un archivo real. El lado del borrado
además exige `getFileContent().exists`. Un `..` en `page.path` sí aborta el reconcile por
el throw de `withRoutesFile`, pero eso es disponibilidad y quedó fuera de alcance.

## Lo que se revisó y salió limpio

La autorización nueva de `/_v/reconcile` (`node/middlewares/reconcile.ts:53-84`) falla
cerrado si falta el setting, compara en tiempo constante sobre SHA-256 de los dos lados
—evitando correctamente el throw por largos distintos de `timingSafeEqual`—, rechaza
antes de leer el CMS o tocar GitHub, y `ctx.get()` devuelve `''` para un header ausente,
así que la ausencia nunca matchea un secreto no vacío.

`ReconcilePlanService.withRoutesFile` (`node/services/ReconcilePlanService.ts:97-119`)
contiene todos los paths generados a `store/` y rechaza segmentos `..`; las bajas están
acotadas por prefijo y extensión a `store/blocks/pages/custom/**.jsonc`.

Sin secretos hardcodeados, sin sinks de inyección de comandos, plantillas o SQL, sin
`eval`, `child_process` ni `fs` en el servicio, y sin tokens en logs ni en respuestas.

## Residual

El único eslabón que no se pudo ejecutar acá es la semántica de plataforma de VTEX para
`public: true`. El README del repo la afirma e imprime la URL pública del dominio de la
tienda, así que la duda es chica, pero se confirma en un minuto pegándole al endpoint sin
credenciales desde fuera de la red.
