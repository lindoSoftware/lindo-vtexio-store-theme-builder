import type { SectionDataMap } from './sections-map'

export interface DeployRequestBody {
  section: keyof SectionDataMap // 🔥 solo secciones válidas
  variables?: Variables | null
  /**
   * Slug con el que la página estaba publicada antes de renombrarla en el CMS.
   * Solo aplica a `custom-page`: la página vieja se borra del store theme.
   */
  previousSlug?: string | null
  /**
   * La página se eliminó del CMS. Solo aplica a `custom-page` y requiere
   * `previousSlug`: no se consulta Strapi ni se publica nada, únicamente se saca
   * la página del store theme.
   */
  deleted?: boolean
}

export interface Variables extends Record<string, unknown> {
  filters: Filters
}

export interface Filters {
  [key: string]: EqFilter
}

export interface EqFilter {
  eq: string
}
