export interface CustomPageVariables {
  filters?: CustomPageFilters
}

export interface CustomPageFilters {
  slug?: {
    eq?: string
  }
}
