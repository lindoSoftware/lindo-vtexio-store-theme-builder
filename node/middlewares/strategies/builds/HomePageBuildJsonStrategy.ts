import env from '../../../env'
import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { ClusterBlock, HomePageData, SliderBlock } from '../../../typings/homepage-response'
import { GeneratedFile } from '../../commands/BuildJsonCommand'
import { isWithinDateRange } from '../../../utils/isWithinDateRange'
import { HOMEPAGE_APPNAMES } from '../../../utils/homepage-constants'

export class HomePageBuildJsonStrategy
  implements BuildJsonStrategy<HomePageData>
{
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
        case HOMEPAGE_APPNAMES.SLIDER: {
          const sliderSection = section as SliderBlock
          const validBanners = sliderSection.banners.filter((b) =>
            isWithinDateRange(b.beginning, b.expiration)
          )

          if (validBanners.length === 0) break

          sliderIndex++
          const bannerRow = `flex-layout.row#banner-${sliderIndex}`
          const imageList = `list-context.image-list#banner-${sliderIndex}`

          layoutJson['store.home'].blocks.push(bannerRow)

          layoutJson[bannerRow] = {
            children: [imageList],
          }

          layoutJson[imageList] = {
            children: ['slider-layout#slider'],
            props: {
              height: sliderSection.height,
              preload: sliderSection.preload,
              images: validBanners.map((b) => ({
                image: env.STRAPI_URL + b.desktopImage.url,
                mobileImage: env.STRAPI_URL + b.mobileImage.url,
                link: {
                  url: b.link ?? '',
                  openNewTab: false,
                },
              })),
            },
          }

          break
        }

        case HOMEPAGE_APPNAMES.CLUSTER: {
          const clusterSection = section as ClusterBlock
          const validSection = isWithinDateRange(
            clusterSection.beginning,
            clusterSection.expiration
          )

          if (!validSection) break

          clusterIndex++
          const clusterRow = `flex-layout.row#cluster-${clusterIndex}`
          const productList = `list-context.product-list#cluster-${clusterIndex}`

          layoutJson['store.home'].blocks.push(clusterRow)

          layoutJson[clusterRow] = {
            children: [productList],
            props: {
              blockClass: 'cluster',
            },
          }

          const props: Record<string, any> = {}
          if (clusterSection.title && clusterSection.title.trim() !== '') {
            props.title = clusterSection.title
          }
          props[clusterSection.type.toLowerCase()] = clusterSection.typeNumber.toString()

          layoutJson[productList] = {
            blocks: ['product-summary.shelf#cluster'],
            children: ['slider-layout#cluster'],
            props,
          }

          break
        }
      }
    }

    const content = JSON.stringify(layoutJson, null, 2)
    const files: GeneratedFile[] = [
      {
        path: 'store/blocks/pages/home',
        filename: 'home.jsonc',
        content,
      },
    ]

    return files
  }
}
