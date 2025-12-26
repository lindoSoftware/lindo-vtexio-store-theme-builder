import { ComponentSharedTabGroup } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'
import env from '../../../../env'

export class TabGroupProcessor extends CustomPageBlockProcessor<ComponentSharedTabGroup> {
  process(
    section: ComponentSharedTabGroup,
    pageKey: string,
    index: number
  ): void {
    const tabGroupRow = this.generateBlockName(
      'flex-layout.row',
      `tab-group-${index}`
    )
    const tabGroupLayout = this.generateBlockName(
      'tab-layout',
      `tab-group-${index}`
    )

    this.addToPage(pageKey, tabGroupRow)

    this.createBlock(tabGroupRow, {
      blockName: tabGroupRow,
      children: [tabGroupLayout],
      props: {
        blockClass: 'tab-group-container',
      },
    })

    // Crear tab layout principal
    const tabListBlock = this.generateBlockName(
      'tab-list',
      `tab-group-${index}`
    )
    const tabContentBlock = this.generateBlockName(
      'tab-content',
      `tab-group-${index}`
    )

    this.createBlock(tabGroupLayout, {
      blockName: tabGroupLayout,
      children: [tabListBlock, tabContentBlock],
      props: {
        blockClass: 'custom-tab-group',
        defaultActiveTabId: `tab-group-${index}-item-0`,
      },
    })

    // Crear tab list items (headers de todos los tabs)
    const tabListItems = section.tabs.map((tab, tabIndex) => {
      const tabListItem = this.generateBlockName(
        'tab-list.item',
        `tab-group-${index}-item-${tabIndex}`
      )

      this.createBlock(tabListItem, {
        blockName: tabListItem,
        props: {
          tabId: `tab-group-${index}-item-${tabIndex}`,
          label: tab.title,
          ...(tab.icon && { icon: tab.icon }),
        },
      })

      return tabListItem
    })

    this.createBlock(tabListBlock, {
      blockName: tabListBlock,
      children: tabListItems,
    })

    // Crear tab content items (contenido de cada tab)
    const tabContentItems = section.tabs.map((tab, tabIndex) => {
      const tabContentItem = this.generateBlockName(
        'tab-content.item',
        `tab-group-${index}-item-${tabIndex}`
      )

      const cardChildren = this.processTabCards(tab.cards, index, tabIndex)

      this.createBlock(tabContentItem, {
        blockName: tabContentItem,
        props: {
          tabId: `tab-group-${index}-item-${tabIndex}`,
        },
        children: cardChildren,
      })

      return tabContentItem
    })

    this.createBlock(tabContentBlock, {
      blockName: tabContentBlock,
      children: tabContentItems,
    })
  }

  private processTabCards(
    cards: any[],
    groupIndex: number,
    tabIndex: number
  ): string[] {
    const children: string[] = []

    cards.forEach((card, cardIndex) => {
      const cardRow = this.generateBlockName(
        'flex-layout.row',
        `tab-group-${groupIndex}-tab-${tabIndex}-card-${cardIndex}`
      )
      children.push(cardRow)

      const cardChildren = this.processCardContent(
        card.content,
        groupIndex,
        tabIndex,
        cardIndex
      )

      this.createBlock(cardRow, {
        blockName: cardRow,
        children: cardChildren,
        props: {
          blockClass: 'tab-group-card-item',
        },
      })
    })

    return children
  }

  private processCardContent(
    content: any[],
    groupIndex: number,
    tabIndex: number,
    cardIndex: number
  ): string[] {
    const children: string[] = []

    content.forEach((item, itemIndex) => {
      if (item.appName === 'CardTextBlock') {
        const textBlock = this.generateBlockName(
          'rich-text',
          `tab-group-${groupIndex}-tab-${tabIndex}-card-${cardIndex}-text-${itemIndex}`
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
            `tab-group-${groupIndex}-tab-${tabIndex}-card-${cardIndex}-img-${itemIndex}-${imgIndex}`
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
