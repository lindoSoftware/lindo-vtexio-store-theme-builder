import type { StrapiConfig } from '../services/StrapiConfigService'
import type { SectionDataMap } from './sections-map'

export interface SectionStrategy<TSection extends keyof SectionDataMap> {
  getData(
    ctx: Context,
    variables?: Record<string, unknown> | null,
    strapi?: StrapiConfig
  ): Promise<SectionDataMap[TSection]>
}
