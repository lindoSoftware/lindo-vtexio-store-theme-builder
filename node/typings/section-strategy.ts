import { SectionDataMap } from './sections-map'

export interface SectionStrategy<TSection extends keyof SectionDataMap> {
  getData(
    ctx: Context,
    variables?: Record<string, unknown> | null
  ): Promise<SectionDataMap[TSection]>
}
