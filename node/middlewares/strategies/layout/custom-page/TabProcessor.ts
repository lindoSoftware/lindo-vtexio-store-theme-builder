import { ComponentSharedTab } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'
import env from '../../../../env'

export class TabProcessor extends CustomPageBlockProcessor<ComponentSharedTab> {
  process(section: ComponentSharedTab, pageKey: string, index: number): void {
    const tabRow = this.generateBlockName('flex-layout.row', `tab-${index}`)
    const tabLayout = this.generateBlockName('tab-layout', `tab-${index}`)

    this.addToPage(pageKey, tabRow)

    this.createBlock(tabRow, {
      blockName: tabRow,
      children: [tabLayout],
      props: {
        blockClass: 'tab-container',
      },
    })

    // Crear tab layout con tab-list y tab-content
    const tabListBlock = this.generateBlockName('tab-list', `tab-${index}`)
    const tabContentBlock = this.generateBlockName(
      'tab-content',
      `tab-${index}`
    )

    this.createBlock(tabLayout, {
      blockName: tabLayout,
      children: [tabListBlock, tabContentBlock],
      props: {
        blockClass: 'custom-tab',
        defaultActiveTabId: `tab-${index}-item-0`,
      },
    })

    // Crear tab list (header del tab)
    const tabListItem = this.generateBlockName(
      'tab-list.item',
      `tab-${index}-item-0`
    )

    this.createBlock(tabListBlock, {
      blockName: tabListBlock,
      children: [tabListItem],
    })

    this.createBlock(tabListItem, {
      blockName: tabListItem,
      props: {
        tabId: `tab-${index}-item-0`,
        label: section.title,
        ...(section.icon && { icon: section.icon }),
      },
    })

    // Crear tab content con las cards
    const tabContentItem = this.generateBlockName(
      'tab-content.item',
      `tab-${index}-item-0`
    )

    this.createBlock(tabContentBlock, {
      blockName: tabContentBlock,
      children: [tabContentItem],
    })

    const cardChildren = this.processCards(section.cards, index)

    this.createBlock(tabContentItem, {
      blockName: tabContentItem,
      props: {
        tabId: `tab-${index}-item-0`,
      },
      children: cardChildren,
    })
  }

  private processCards(cards: any[], tabIndex: number): string[] {
    const children: string[] = []

    cards.forEach((card, cardIndex) => {
      const cardRow = this.generateBlockName(
        'flex-layout.row',
        `tab-${tabIndex}-card-${cardIndex}`
      )
      children.push(cardRow)

      const cardChildren = this.processCardContent(
        card.content,
        tabIndex,
        cardIndex
      )

      this.createBlock(cardRow, {
        blockName: cardRow,
        children: cardChildren,
        props: {
          blockClass: 'tab-card-item',
        },
      })
    })

    return children
  }

  private processCardContent(
    content: any[],
    tabIndex: number,
    cardIndex: number
  ): string[] {
    const children: string[] = []

    content.forEach((item, itemIndex) => {
      if (item.appName === 'CardTextBlock') {
        const textBlock = this.generateBlockName(
          'rich-text',
          `tab-${tabIndex}-card-${cardIndex}-text-${itemIndex}`
        )
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
          const imageBlock = this.generateBlockName(
            'image',
            `tab-${tabIndex}-card-${cardIndex}-img-${itemIndex}-${imgIndex}`
          )
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
