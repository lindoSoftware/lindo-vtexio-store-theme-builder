import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { CustomPagesData } from '../../../typings/custompage-response'
import { GeneratedFile } from '../../commands/BuildJsonCommand'
import { VtexLayoutBuilder } from '../layout/VtexLayoutBuilder'
import { CustomPageBlockProcessorFactory } from '../layout/custom-page/CustomPageBlockProcessorFactory'
import env from '../../../env'

export class CustomPageBuildJsonStrategy
  implements BuildJsonStrategy<CustomPagesData>
{
  readonly section = 'custom-page' as const

  async build(data: CustomPagesData): Promise<GeneratedFile[]> {
    const generatedFiles: GeneratedFile[] = []

    // Procesar cada custom page
    for (const page of data.customPages) {
      const layoutBuilder = new VtexLayoutBuilder()
      const processorFactory = new CustomPageBlockProcessorFactory(
        layoutBuilder,
        page.slug
      )

      // Cambiar 'store.home' por el identificador de la página custom
      const pageKey = `store.custom#${page.slug}`
      layoutBuilder.initializePage(pageKey)

      if (page.title) {
        const titleRow = `flex-layout.row#title-${page.slug}`
        const titleCol = `flex-layout.col#title-${page.slug}-container`
        const titleRichText = `rich-text#title-${page.slug}`

        layoutBuilder.addBlock(pageKey, titleRow)
        layoutBuilder.setBlockConfig(titleRow, {
          blockName: titleRow,
          children: [titleCol],
        })

        layoutBuilder.setBlockConfig(titleCol, {
          blockName: titleCol,
          children: [titleRichText],
        })

        layoutBuilder.setBlockConfig(titleRichText, {
          blockName: titleRichText,
          props: {
            text: `# ${page.title}`,
            blockClass: 'custom-page-title',
          },
        })
      }

      if (page.subtitle) {
        const subtitleRow = `flex-layout.row#subtitle-${page.slug}`
        const subtitleCol = `flex-layout.col#subtitle-${page.slug}-container`
        const subtitleRichText = `rich-text#subtitle-${page.slug}`

        layoutBuilder.addBlock(pageKey, subtitleRow)
        layoutBuilder.setBlockConfig(subtitleRow, {
          blockName: subtitleRow,
          children: [subtitleCol],
        })

        layoutBuilder.setBlockConfig(subtitleCol, {
          blockName: subtitleCol,
          children: [subtitleRichText],
        })

        layoutBuilder.setBlockConfig(subtitleRichText, {
          blockName: subtitleRichText,
          props: {
            text: page.subtitle,
            blockClass: 'custom-page-subtitle',
          },
        })
      }

      // Procesar cada sección del content
      for (let i = 0; i < page.content.length; i++) {
        const section = page.content[i]
        const processor = processorFactory.getProcessor(section.appName)

        if (processor) {
          processor.process(section, pageKey, i)
        } else {
          console.warn(`No processor found for appName: ${section.appName}`)
        }
      }

      // Generar archivo para esta página
      const layout = layoutBuilder.build()
      const content = JSON.stringify(layout, null, 2)

      generatedFiles.push({
        path: `${env.CUSTOM_PAGE_PATH}${page.path}`,
        filename: `${page.slug}.jsonc`,
        content,
      })
    }

    // Generar archivo routes.json con todas las rutas
    const routesFile = await this.buildRoutesFile(data.customPages)
    generatedFiles.push(routesFile)

    return generatedFiles
  }

  private async buildRoutesFile(
    pages: CustomPagesData['customPages']
  ): Promise<GeneratedFile> {
    const routes: Record<string, { path: string }> = {}

    // Agregar todas las rutas de las páginas custom
    for (const page of pages) {
      const pageKey = `store.custom#${page.slug}`
      routes[pageKey] = {
        path: `/${page.path}`,
      }
    }

    const content = JSON.stringify(routes, null, 2)

    return {
      path: 'store',
      filename: 'routes.json',
      content,
    }
  }
}
