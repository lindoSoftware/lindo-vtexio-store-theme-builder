import { NavbarBuildJsonStrategy } from './NavbarBuildJsonStrategy'
import { CustomPageBuildJsonStrategy } from './CustomPageBuildJsonStrategy'
import { HomePageBuildJsonStrategy } from './HomePageBuildJsonStrategy'
import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { SectionDataMap } from '../../../typings/sections-map'

const strategyMap = {
  navbar: NavbarBuildJsonStrategy,
  'custom-page': CustomPageBuildJsonStrategy,
  'home-page': HomePageBuildJsonStrategy,
} as const

export class BuildJsonStrategyFactory {
  public static create<TSection extends keyof typeof strategyMap>(
    section: TSection,
    strapiURL: string
  ): BuildJsonStrategy<SectionDataMap[TSection]> {
    const Strategy = strategyMap[section]

    return new Strategy(strapiURL) as BuildJsonStrategy<
      SectionDataMap[TSection]
    >
  }
}
