export interface DeployRequestBody {
  section: string
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
