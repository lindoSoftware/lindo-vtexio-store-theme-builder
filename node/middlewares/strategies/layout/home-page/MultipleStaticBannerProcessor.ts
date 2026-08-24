import type {
  MultipleStaticBannerBlock,
  StaticBannerGroup,
} from '../../../../typings/homepage-response'
import { isWithinDateRange } from '../../../../utils/isWithinDateRange'
import { BlockProcessor } from './BlockProcessor'

export class MultipleStaticBannerProcessor extends BlockProcessor<MultipleStaticBannerBlock> {
  process(section: MultipleStaticBannerBlock): void {
    const validBanners = section.staticBanners.filter((b) =>
      isWithinDateRange(b.beginning, b.expiration)
    )

    if (validBanners.length === 0) return

    validBanners.forEach((bannerGroup, index) => {
      this.processBannerGroup(bannerGroup, index + 1)
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
        })),
      },
    })

    this.createBlock(sliderLayoutPropsRow, {
      blockName: sliderLayoutPropsRow,
      props: {
        infinity: true,
        showPaginationDots: 'never',
        blockclass: `mh${bannerGroup.columnGap}-mv${bannerGroup.rowGap}`,
        itemsPerPage: {
          desktop: bannerGroup.banners.length,
          tablet: 1,
          phone: 1,
        },
      },
    })
  }
}
