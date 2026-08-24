import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { CustomPagesData } from '../../../typings/custompage-response'
import { GeneratedFile } from '../../commands/BuildJsonCommand'
import { VtexLayoutBuilder } from '../layout/VtexLayoutBuilder'
import { CustomPageBlockProcessorFactory } from '../layout/custom-page/CustomPageBlockProcessorFactory'
import { BlockNameHelper } from '../../../utils/BlockNameHelper'
import env from '../../../env'

type CustomPage = CustomPagesData['customPages'][number]

/** Página custom junto a su slug ya normalizado. */
interface NormalizedPage {
  page: CustomPage
  slug: string
}

export class CustomPageBuildJsonStrategy
  implements BuildJsonStrategy<CustomPagesData>
{
  readonly section = 'custom-page' as const

  constructor(private strapiURL: string) {}

  async build(data: CustomPagesData): Promise<GeneratedFile[]> {
    const generatedFiles: GeneratedFile[] = []
    const pages = this.normalizePages(data.customPages)

    // Si ninguna página quedó en pie no hay nada para escribir: se evita incluso
    // el routes.json para no generar un commit sin cambios.
    if (!pages.length) {
      console.warn('No valid custom pages to build. Skipping deploy.')
      return generatedFiles
    }

    // Procesar cada custom page
    for (const { page, slug } of pages) {
      const layoutBuilder = new VtexLayoutBuilder()
      const processorFactory = new CustomPageBlockProcessorFactory(
        layoutBuilder,
        slug,
        this.strapiURL
      )

      // Cambiar 'store.home' por el identificador de la página custom
      const pageKey = `store.custom#${slug}`
      layoutBuilder.initializePage(pageKey)

      if (page.title) {
        const titleRow = `flex-layout.row#title-${slug}`
        const titleCol = `flex-layout.col#title-${slug}-container`
        const titleRichText = `rich-text#title-${slug}`

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
        const subtitleRow = `flex-layout.row#subtitle-${slug}`
        const subtitleCol = `flex-layout.col#subtitle-${slug}-container`
        const subtitleRichText = `rich-text#subtitle-${slug}`

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
        filename: `${slug}.jsonc`,
        content,
      })
    }

    // Generar archivo routes.json con todas las rutas
    const routesFile = await this.buildRoutesFile(pages)
    generatedFiles.push(routesFile)

    return generatedFiles
  }

  /**
   * Normaliza el slug de cada página y descarta las que no dejan ningún
   * carácter válido al sanitizar (ej: "###"). Esas páginas se ignoran por
   * completo —ni archivo ni ruta— y el resto del deploy sigue su curso.
   *
   * El slug normalizado se usa para el pageKey, los nombres de bloque, la key
   * de routes.json y el nombre del archivo, para que todo quede consistente
   * aunque el slug de Strapi traiga mayúsculas o caracteres no válidos.
   */
  private normalizePages(pages: CustomPage[]): NormalizedPage[] {
    const normalized: NormalizedPage[] = []

    for (const page of pages) {
      const slug = BlockNameHelper.sanitizeSlug(page.slug)

      if (!slug) {
        console.warn(
          `Skipping custom page with invalid slug: "${page.slug}" (path: "${page.path}")`
        )
        continue
      }

      normalized.push({ page, slug })
    }

    return normalized
  }

  private async buildRoutesFile(
    pages: NormalizedPage[]
  ): Promise<GeneratedFile> {
    const routes: Record<string, { path: string }> = {}

    // Agregar todas las rutas de las páginas custom
    for (const { page, slug } of pages) {
      const pageKey = `store.custom#${slug}`
      routes[pageKey] = {
        path: `/${page.path}`.replace(/\/+/g, '/'),
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
