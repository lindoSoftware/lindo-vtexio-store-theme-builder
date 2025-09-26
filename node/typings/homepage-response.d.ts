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
export type HomePageContentBlock = SliderBlock | ClusterBlock

/**
 * Bloque tipo "Slider" (carrusel de banners)
 */
export interface SliderBlock {
  appName: 'Slider'
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

export interface ImageResource {
  url: string
}

/**
 * Bloque tipo "Cluster" (colecciones o categorías)
 */
export interface ClusterBlock {
  appName: 'Cluster'
  title: string | null
  type: 'Collection' | 'Category' | string
  typeNumber: number
  beginning: string // ISO 8601
  expiration: string // ISO 8601
}
