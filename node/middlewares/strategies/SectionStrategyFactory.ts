import { ISectionStrategy } from './ISectionStrategy'
import { HomePageStrategy } from './HomePageStrategy'
import { NavbarStrategy } from './NavbarStrategy'
import { CustomPageStrategy } from './CustomPageStrategy'
import { SectionDataMap } from '../../typings/sections-map'

export class SectionStrategyFactory {
  static create<TSection extends keyof SectionDataMap>(
    section: TSection
  ): ISectionStrategy<SectionDataMap[TSection]> {
    switch (section) {
      case 'navbar':
        return new NavbarStrategy() as ISectionStrategy<SectionDataMap[TSection]>
      case 'custom-page':
        return new CustomPageStrategy() as ISectionStrategy<SectionDataMap[TSection]>
      case 'home-page':
        return new HomePageStrategy() as ISectionStrategy<SectionDataMap[TSection]>
      default:
        throw new Error(`Unknown section: ${section}`)
    }
  }
}
