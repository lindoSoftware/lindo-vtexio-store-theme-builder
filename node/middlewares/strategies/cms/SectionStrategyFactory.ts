import { HomePageStrategy } from './HomePageStrategy'
import { NavbarStrategy } from './NavbarStrategy'
import { CustomPageStrategy } from './CustomPageStrategy'
import { SectionDataMap } from '../../../typings/sections-map'
import { SectionStrategy } from '../../../typings/section-strategy'

const strategies = {
  navbar: NavbarStrategy,
  'custom-page': CustomPageStrategy,
  'home-page': HomePageStrategy,
} as const

export class SectionStrategyFactory {
  static create<TSection extends keyof SectionDataMap>(
    section: TSection
  ): SectionStrategy<TSection> {
    const StrategyClass = strategies[section]

    if (!StrategyClass) {
      throw new Error(`No strategy found for section: ${section}`)
    }

    return new StrategyClass() as SectionStrategy<TSection>
  }
}
