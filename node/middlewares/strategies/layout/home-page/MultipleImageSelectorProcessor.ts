import type {
  ImageItem,
  ImageSelector,
  MultipleImageSelectorBlock,
} from '../../../../typings/homepage-response'
import { isWithinDateRange } from '../../../../utils/isWithinDateRange'
import { BlockProcessor } from './BlockProcessor'

export class MultipleImageSelectorProcessor extends BlockProcessor<MultipleImageSelectorBlock> {
  public process(section: MultipleImageSelectorBlock): void {
    const validSelectors = section.imageSelectors.filter((s) =>
      isWithinDateRange(s.beginning, s.expiration)
    )

    if (validSelectors.length === 0) return

    validSelectors.forEach((selector, index) => {
      this.processSelector(selector, index + 1)
    })
  }

  private processSelector(selector: ImageSelector, index: number): void {
    if (selector.title) {
      this.createTitleBlock(selector.title, index)
    }

    this.createSliderBlock(selector, index)
  }

  private createTitleBlock(title: string, index: number): void {
    const titleBlock = `flex-layout.row#image-selector-title-${index}`
    const richTextSelector = `rich-text#image-selector-title-${index}`

    this.addToHome(titleBlock)

    this.createBlock(titleBlock, {
      blockName: titleBlock,
      children: [richTextSelector],
    })

    this.createBlock(richTextSelector, {
      blockName: richTextSelector,
      props: {
        text: title,
        blockClass: 'image-selector-title',
      },
    })
  }

  private createSliderBlock(selector: ImageSelector, index: number): void {
    const selectorRow = `flex-layout.row#image-selector-slider-${index}`
    const sliderSelector = `slider-layout#image-selector-${index}`

    this.addToHome(selectorRow)

    this.createBlock(selectorRow, {
      blockName: selectorRow,
      children: [sliderSelector],
    })

    const imageColumns = this.createImageColumns(selector.images)

    this.createBlock(sliderSelector, {
      blockName: sliderSelector,
      props: {
        infinity: true,
        showPaginationDots: 'never',
        itemsPerPage: {
          desktop: selector.itemsPerPageDesktop,
          tablet: selector.itemsPerPageTablet,
          phone: selector.itemsPerPageMobile,
        },
      },
      children: imageColumns,
    })
  }

  private createImageColumns(images: ImageItem[]): string[] {
    return images.map((image, i) => {
      const col = `flex-layout.col#item${i + 1}`
      const link = `link#item${i + 1}`

      this.createBlock(col, {
        blockName: col,
        props: {
          horizontalAlign: 'center',
          verticalAlign: 'middle',
        },
        children: [link],
      })

      const linkChildren = this.createLinkChildren(image, i)

      this.createBlock(link, {
        blockName: link,
        children: linkChildren,
        props: {
          href: image.link ?? '',
        },
      })

      return col
    })
  }

  private createLinkChildren(image: ImageItem, index: number): string[] {
    const children: string[] = []

    if (image.image) {
      const imageBlock = `image#img${index + 1}`

      this.createBlock(imageBlock, {
        blockName: imageBlock,
        props: {
          src: this.strapiURL + image.image.url,
          width: 65,
          height: 65,
        },
      })
      children.push(imageBlock)
    }

    if (image.text) {
      const textBlock = `rich-text#title${index + 1}`

      this.createBlock(textBlock, {
        blockName: textBlock,
        props: {
          text: image.text,
          blockClass: 'imageText',
        },
      })
      children.push(textBlock)
    }

    return children
  }
}
