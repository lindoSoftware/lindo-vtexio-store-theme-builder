import { NavbarBuildJsonStrategy } from './NavbarBuildJsonStrategy'
import { CustomPageBuildJsonStrategy } from './CustomPageBuildJsonStrategy'
import { HomePageBuildJsonStrategy } from './HomePageBuildJsonStrategy'
import { BuildJsonStrategy } from './BuildJsonStrategy'
import { SectionDataMap } from '../../../typings/sections-map'

const strategyMap = {
  navbar: NavbarBuildJsonStrategy,
  'custom-page': CustomPageBuildJsonStrategy,
  'home-page': HomePageBuildJsonStrategy,
} as const

export class BuildJsonStrategyFactory {
  static create<TSection extends keyof typeof strategyMap>(
    section: TSection
  ): BuildJsonStrategy<SectionDataMap[TSection]> {
    const Strategy = strategyMap[section]
    return new Strategy() as BuildJsonStrategy<SectionDataMap[TSection]>
  }
}
