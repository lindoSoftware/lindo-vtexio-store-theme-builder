import type {
  ImageItem,
  ImageSelector,
  MultipleImageSelectorBlock,
} from '../../../../typings/homepage-response'
import { isWithinDateRange } from '../../../../utils/isWithinDateRange'
import { BlockProcessor } from './BlockProcessor'

// Home del celular (card 618, propuesta 4): con el primer slider de categorías van la tira de
// Ofertas antes y la grilla de categorías (lindo.category-grid) después. El Builder solo los ubica:
// se definen en el theme (store/blocks/pages/home/home-mobile.jsonc), que no se regenera, y el
// theme muestra el slider en desktop y la tira y la grilla en el celular.
export const MOBILE_OFFERS_STRIP = 'flex-layout.row#ofertas-strip'
export const MOBILE_CATEGORY_GRID = 'category-grid#home'
// Clase de la fila del primer slider (y su título): el theme la oculta en el celular, donde la
// reemplaza la grilla (vtex.flex-layout.css, .flexRow--categoriesSlider)
export const DESKTOP_ONLY_CLASS = 'categoriesSlider'

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
    const isFirst = index === 1

    if (isFirst) this.addToHome(MOBILE_OFFERS_STRIP)

    const rowProps = isFirst ? { blockClass: DESKTOP_ONLY_CLASS } : undefined

    if (selector.title) {
      this.createTitleBlock(selector.title, index, rowProps)
    }

    this.createSliderBlock(selector, index, rowProps)

    if (isFirst) this.addToHome(MOBILE_CATEGORY_GRID)
  }

  private createTitleBlock(
    title: string,
    index: number,
    rowProps?: Record<string, string>
  ): void {
    const titleBlock = `flex-layout.row#image-selector-title-${index}`
    const richTextSelector = `rich-text#image-selector-title-${index}`

    this.addToHome(titleBlock)

    this.createBlock(titleBlock, {
      blockName: titleBlock,
      children: [richTextSelector],
      ...(rowProps && { props: rowProps }),
    })

    this.createBlock(richTextSelector, {
      blockName: richTextSelector,
      props: {
        text: title,
        blockClass: 'image-selector-title',
      },
    })
  }

  private createSliderBlock(
    selector: ImageSelector,
    index: number,
    rowProps?: Record<string, string>
  ): void {
    const selectorRow = `flex-layout.row#image-selector-slider-${index}`
    const sliderSelector = `slider-layout#image-selector-${index}`

    this.addToHome(selectorRow)

    this.createBlock(selectorRow, {
      blockName: selectorRow,
      children: [sliderSelector],
      ...(rowProps && { props: rowProps }),
    })

    const imageColumns = this.createImageColumns(selector.images)

    this.createBlock(sliderSelector, {
      blockName: sliderSelector,
      props: {
        infinite: true,
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
