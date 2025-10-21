import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { HomePageData } from '../../../typings/homepage-response'
import { GeneratedFile } from '../../commands/BuildJsonCommand'

export class HomePageBuildJsonStrategy implements BuildJsonStrategy<HomePageData> {
  readonly section = 'home-page' as const

  async build(data: HomePageData): Promise<GeneratedFile[]> {
    const blocks = data.homePage.content.map((section) => section.appName)

    const layoutJson = {
      'store.home': {
        parent: {
          storeWrapper: 'storeWrapper',
        },
        blocks,
      },
    }

    // 💬 Agregar comentario y formatear
    const content = `${JSON.stringify(layoutJson, null, 2)}`
    return [{ filename: 'home-page.jsonc', content }]
  }
}