/**
 * Constantes de tipos de bloques para la Home Page
 */
export const HOMEPAGE_APPNAMES = {
  SLIDER: 'Slider',
  CLUSTER: 'Cluster',
  MULTIPLE_STATIC_BANNER: 'MultipleStaticBanner',
  MULTIPLE_IMAGE_SELECTOR: 'MultipleImageSelector',
} as const

export type HomePageAppName =
  (typeof HOMEPAGE_APPNAMES)[keyof typeof HOMEPAGE_APPNAMES]

/**
 * Constantes de tipos de Cluster
 */
export const CLUSTER_TYPES = {
  COLLECTION: 'Collection',
  CATEGORY: 'Category',
} as const

export type ClusterType = (typeof CLUSTER_TYPES)[keyof typeof CLUSTER_TYPES]
