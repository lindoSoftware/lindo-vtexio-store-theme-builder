import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { HomePageData } from '../../../typings/homepage-response'
import type { GeneratedFile } from '../../commands/BuildJsonCommand'
import { VtexLayoutBuilder } from '../layout/VtexLayoutBuilder'
import { BlockProcessorFactory } from '../layout/home-page/BlockProcessorFactory'

export class HomePageBuildJsonStrategy
  implements BuildJsonStrategy<HomePageData>
{
  readonly section = 'home-page' as const

  constructor(private strapiURL: string) {}

  async build(data: HomePageData): Promise<GeneratedFile[]> {
    const layoutBuilder = new VtexLayoutBuilder()
    const processorFactory = new BlockProcessorFactory(
      layoutBuilder,
      this.strapiURL
    )

    // Inicializar la página home
    layoutBuilder.initializePage('store.home')

    // Procesar cada sección
    data.homePage.content.forEach((section, index) => {
      const processor = processorFactory.getProcessor(section.appName)

      if (processor) {
        processor.process(section, index)
      } else {
        console.warn(`No processor found for appName: ${section.appName}`)
      }
    })

    // Generar archivo final
    const layout = layoutBuilder.build()
    const content = JSON.stringify(layout, null, 2)

    return [
      {
        path: 'store/blocks/pages/home',
        filename: 'home.jsonc',
        content,
      },
    ]
  }
}
