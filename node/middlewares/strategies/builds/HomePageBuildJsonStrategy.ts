import { BuildJsonStrategy } from './BuildJsonStrategy'
import { HomePageData } from '../../../typings/homepage-response'

export class HomePageBuildJsonStrategy
  implements BuildJsonStrategy<HomePageData> {
  async build(data: HomePageData): Promise<void> {
    console.log('🏠 Building JSON for Home Page:', JSON.stringify(data.homePage))
    for (const section of data.homePage.content) {
      console.log('  Section:', section.appName)
    }
  }
}
