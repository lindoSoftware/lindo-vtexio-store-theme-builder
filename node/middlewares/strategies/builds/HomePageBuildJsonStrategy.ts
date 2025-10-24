// src/node/build/strategies/HomePageBuildJsonStrategy.ts
import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { HomePageData } from '../../../typings/homepage-response'
import { GeneratedFile } from '../../commands/BuildJsonCommand'

export class HomePageBuildJsonStrategy implements BuildJsonStrategy<HomePageData> {
  readonly section = 'home-page' as const

  async build(data: HomePageData): Promise<GeneratedFile[]> {
    const layoutJson: Record<string, any> = {
      'store.home': {
        parent: { storeWrapper: 'storeWrapper' },
        blocks: [],
      },
    }

    let sliderIndex = 0
    let clusterIndex = 0
    
    for (const section of data.homePage.content) {
      switch (section.appName) {
        // 🧱 Caso 1: Slider
        case 'Slider': {
          sliderIndex++
          const bannerRow = `flex-layout.row#banner-${sliderIndex}`
          const imageList = `list-context.image-list#banner-${sliderIndex}`

          // 1️⃣ Agregar bloque raíz del home
          layoutJson['store.home'].blocks.push(bannerRow)

          // 2️⃣ Crear bloque para la fila (row)
          layoutJson[bannerRow] = {
            children: [imageList],
          }

          // 3️⃣ Crear bloque para image-list
          layoutJson[imageList] = {
            children: ['slider-layout#banner'],
            props: {
              height: section.height,
              preload: section.preload,
              images: section.banners.map(b => ({
                image: b.desktopImage.url,
                mobileImage: b.mobileImage.url,
              })),
            },
          }

          break
        }

        // 🧩 Caso 2: Cluster
        case 'Cluster': {
          clusterIndex++
          const clusterRow = `flex-layout.row#cluster-${clusterIndex}`
          layoutJson['store.home'].blocks.push(clusterRow)

          layoutJson[clusterRow] = {
            children: section.title,
            props: {
              title: section.title,
            },
          }

          break
        }
      }
    }

    // 🧾 Generar JSONC con comentario superior
    const content =
      `// Layout generado dinámicamente para Home Page\n` +
      JSON.stringify(layoutJson, null, 2)

    const files: GeneratedFile[] = [
      {
        filename: 'home-page.jsonc',
        content,
      },
    ]

    console.log('✅ Generated home-page.jsonc:')
    console.log(JSON.stringify(layoutJson, null, 2))

    return files
  }
}
