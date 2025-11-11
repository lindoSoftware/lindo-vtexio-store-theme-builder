/**
 * Respuesta GraphQL completa desde Strapi
 */
export interface HomePageGraphQLResponse {
  data: HomePageData
}

/**
 * Nodo principal "homePage"
 */
export interface HomePageData {
  homePage: {
    content: HomePageContentBlock[]
  }
}

/**
 * Unión discriminada de bloques
 */
export type HomePageContentBlock =
  | SliderBlock
  | ClusterBlock
  | MultipleStaticBannerBlock

/**
 * Bloque tipo "Slider" (carrusel de banners)
 */
export interface SliderBlock {
  appName: typeof HOMEPAGE_APPNAMES.SLIDER
  height: number
  preload: boolean
  banners: Banner[]
}

/**
 * Banner individual dentro de un bloque "Slider"
 */
export interface Banner {
  desktopImage: ImageResource
  mobileImage: ImageResource
  link: string
  beginning: string // ISO 8601
  expiration: string // ISO 8601
}

/**
 * Bloque tipo "Cluster" (colecciones o categorías)
 */
export interface ClusterBlock {
  appName: typeof HOMEPAGE_APPNAMES.CLUSTER
  title: string | null
  type: ClusterType
  typeNumber: number
  beginning: string // ISO 8601
  expiration: string // ISO 8601
}

/**
 * Bloque tipo "MultipleStaticBanner"
 */
export interface MultipleStaticBannerBlock {
  appName: typeof HOMEPAGE_APPNAMES.MULTIPLE_STATIC_BANNER
  staticBanners: StaticBannerGroup[]
}

/**
 * Grupo de banners estáticos (una fila o conjunto de banners)
 */
export interface StaticBannerGroup {
  name: string
  beginning: string // ISO 8601
  expiration: string // ISO 8601
  columnGap: number
  rowGap: number
  banners: StaticBanner[]
}

/**
 * Banner individual dentro de un bloque "MultipleStaticBanner"
 */
export interface StaticBanner {
  image: ImageResource
  mobileImage: ImageResource | null
  link: string
}

/**
 * Recurso de imagen genérico
 */
export interface ImageResource {
  url: string
}
