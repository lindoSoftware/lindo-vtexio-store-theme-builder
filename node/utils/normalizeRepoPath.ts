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
