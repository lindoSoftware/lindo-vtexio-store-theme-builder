import { SliderBlock } from '../../../../typings/homepage-response'
import { isWithinDateRange } from '../../../../utils/isWithinDateRange'
import { BlockProcessor } from './BlockProcessor'

export class SliderBlockProcessor extends BlockProcessor<SliderBlock> {
  private counter = 0

  process(section: SliderBlock): void {
    const validBanners = section.banners.filter((b) =>
      isWithinDateRange(b.beginning, b.expiration)
    )

    if (validBanners.length === 0) return

    this.counter++
    const bannerRow = `flex-layout.row#banner-${this.counter}`
    const imageList = `list-context.image-list#banner-${this.counter}`

    this.addToHome(bannerRow)

    this.createBlock(bannerRow, {
      blockName: bannerRow,
      children: [imageList],
    })

    this.createBlock(imageList, {
      blockName: imageList,
      children: ['slider-layout#slider'],
      props: {
        height: section.height,
        preload: section.preload,
        images: validBanners.map((b) => ({
          image: this.strapiURL + b.desktopImage.url,
          mobileImage: this.strapiURL + b.mobileImage.url,
          link: {
            url: b.link ?? '',
            openNewTab: false,
          },
        })),
      },
    })
  }
}
