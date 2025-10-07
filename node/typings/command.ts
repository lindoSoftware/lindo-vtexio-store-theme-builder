import { SectionDataMap } from './sections-map'

export abstract class Command<
  TSection extends keyof SectionDataMap = keyof SectionDataMap
> {
  protected readonly section: TSection
  protected readonly data: SectionDataMap[TSection]

  constructor(section: TSection, data: SectionDataMap[TSection]) {
    this.section = section
    this.data = data
  }

  abstract execute(): Promise<void>
}
