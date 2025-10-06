import { ISectionStrategy } from './ISectionStrategy'
import { HomePageStrategy } from './HomePageStrategy'
import { NavbarStrategy } from './NavbarStrategy'
import { CustomPageStrategy } from './CustomPageStrategy'

export class SectionStrategyFactory {
  static create(section: string): ISectionStrategy {
    switch (section) {
      case 'home-page':
        return new HomePageStrategy()
      case 'custom-page':
        return new CustomPageStrategy()
      case 'navbar':
        return new NavbarStrategy()
      default:
        throw new Error(`No existe estrategia para la sección "${section}"`)
    }
  }
}
