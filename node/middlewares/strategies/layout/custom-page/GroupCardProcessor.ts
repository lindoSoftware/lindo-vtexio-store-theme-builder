import type { ComponentSharedGroupCard } from '../../../../typings/custompage-response'
import { mapCardContent } from '../../../../utils/card.helper'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

export class GroupCardProcessor extends CustomPageBlockProcessor<ComponentSharedGroupCard> {
  public process(
    section: ComponentSharedGroupCard,
    pageKey: string,
    index: number
  ): void {
    const blockName = this.generateBlockName(
      'payment-methods-cardgroup',
      `group-card-${index}`
    )

    this.createBlock(blockName, {
      blockName,
      props: {
        content: [
          {
            name: section.name,
            appName: 'CardGroup',
            cardGroupLayout: section.cardGroupLayout,
            // lindo.payment-method lee `layout`: sin esto side_by_side nunca se aplica
            layout: section.cardGroupLayout ?? 'full_width',
            cards: section.cards.map((card) => ({
              content: mapCardContent(card.content, this.strapiURL),
            })),
          },
        ],
      },
    })

    this.addToPage(pageKey, blockName)
  }
}
