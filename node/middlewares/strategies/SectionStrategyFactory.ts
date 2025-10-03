import { ISectionStrategy } from './ISectionStrategy'
import { HomePageStrategy } from './HomePageStrategy'

export class SectionStrategyFactory {
  static create(section: string): ISectionStrategy {
    switch (section) {
      case 'home-page':
        return new HomePageStrategy()
      default:
        throw new Error(`No existe estrategia para la sección "${section}"`)
    }
  }
}