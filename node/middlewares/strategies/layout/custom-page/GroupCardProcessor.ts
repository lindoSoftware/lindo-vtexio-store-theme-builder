import { ComponentSharedGroupCard } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'
import env from '../../../../env'

export class GroupCardProcessor extends CustomPageBlockProcessor<ComponentSharedGroupCard> {
  process(
    section: ComponentSharedGroupCard,
    pageKey: string,
    index: number
  ): void {
    const groupRow = `flex-layout.row#group-card-${index}`
    const groupCol = `flex-layout.col#group-card-${index}`

    this.addToPage(pageKey, groupRow)

    this.createBlock(groupRow, {
      blockName: groupRow,
      children: [groupCol],
      props: {
        blockClass: 'group-card-container',
      },
    })

    // Crear título si existe
    const children: string[] = []
    if (section.name) {
      const titleBlock = `rich-text#group-card-title-${index}`
      this.createBlock(titleBlock, {
        blockName: titleBlock,
        props: {
          text: section.name,
          blockClass: 'group-card-title',
        },
      })
      children.push(titleBlock)
    }

    // Procesar cada card
    section.cards.forEach((card, cardIndex) => {
      const cardRow = `flex-layout.row#group-card-${index}-card-${cardIndex}`
      children.push(cardRow)

      const cardChildren = this.processCardContent(
        card.content,
        index,
        cardIndex
      )

      this.createBlock(cardRow, {
        blockName: cardRow,
        children: cardChildren,
        props: {
          blockClass: 'group-card-item',
        },
      })
    })

    this.createBlock(groupCol, {
      blockName: groupCol,
      children,
    })
  }

  private processCardContent(
    content: any[],
    groupIndex: number,
    cardIndex: number
  ): string[] {
    const children: string[] = []

    content.forEach((item, itemIndex) => {
      if (item.appName === 'CardTextBlock') {
        const textBlock = `rich-text#group-${groupIndex}-card-${cardIndex}-text-${itemIndex}`
        this.createBlock(textBlock, {
          blockName: textBlock,
          props: {
            text: item.content,
            blockClass: `card-text-${item.variant || 'default'}`,
          },
        })
        children.push(textBlock)
      } else if (item.appName === 'CardImageBlock') {
        item.images.forEach((image: any, imgIndex: number) => {
          const imageBlock = `image#group-${groupIndex}-card-${cardIndex}-img-${itemIndex}-${imgIndex}`
          this.createBlock(imageBlock, {
            blockName: imageBlock,
            props: {
              src: env.STRAPI_URL + image.url,
              blockClass: 'card-image',
            },
          })
          children.push(imageBlock)
        })
      }
    })

    return children
  }
}
