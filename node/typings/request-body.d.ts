import { SectionDataMap } from './sections-map'
export interface DeployRequestBody {
  section: keyof SectionDataMap // 🔥 solo secciones válidas
  variables?: Variables | null
}

export interface Variables {
  filters: Filters
}

export interface Filters {
  [key: string]: EqFilter
}

export interface EqFilter {
  eq: string
}
