import type {
  MultipleStaticBannerBlock,
  StaticBannerGroup,
} from '../../../../typings/homepage-response'
import { isWithinDateRange } from '../../../../utils/isWithinDateRange'
import { BlockProcessor } from './BlockProcessor'

export class MultipleStaticBannerProcessor extends BlockProcessor<MultipleStaticBannerBlock> {
  // Numeración de toda la home: con dos componentes MultipleStaticBanner, el índice del grupo
  // dentro de cada uno se repetía (static-banner-1) y el segundo pisaba al primero
  private counter = 0

  public process(section: MultipleStaticBannerBlock): void {
    const validBanners = section.staticBanners.filter((b) =>
      isWithinDateRange(b.beginning, b.expiration)
    )

    if (validBanners.length === 0) return

    validBanners.forEach((bannerGroup) => {
      this.counter++
      this.processBannerGroup(bannerGroup, this.counter)
    })
  }

  private processBannerGroup(
    bannerGroup: StaticBannerGroup,
    index: number
  ): void {
    const rowId = `static-banner-${index}`
    const staticBannerRow = `flex-layout.row#${rowId}`
    const staticBannerList = `list-context.image-list#${rowId}`
    const sliderLayoutPropsRow = `slider-layout#${rowId}`

    this.addToHome(staticBannerRow)

    this.createBlock(staticBannerRow, {
      blockName: staticBannerRow,
      children: [staticBannerList],
    })

    this.createBlock(staticBannerList, {
      blockName: staticBannerList,
      children: [sliderLayoutPropsRow],
      props: {
        preload: true,
        images: bannerGroup.banners.map((b) => ({
          image: this.strapiURL + b.image.url,
          mobileImage: b.mobileImage
            ? this.strapiURL + b.mobileImage.url
            : this.strapiURL + b.image.url,
          link: {
            url: b.link ?? '',
            openNewTab: false,
          },
          // Texto alternativo de la imagen
          ...(b.text ? { description: b.text } : {}),
        })),
      },
    })

    this.createBlock(sliderLayoutPropsRow, {
      blockName: sliderLayoutPropsRow,
      props: {
        infinite: true,
        showPaginationDots: 'never',
        blockClass: `mh${bannerGroup.columnGap}-mv${bannerGroup.rowGap}`,
        itemsPerPage: {
          desktop: bannerGroup.banners.length,
          tablet: 1,
          phone: 1,
        },
      },
    })
  }
}
