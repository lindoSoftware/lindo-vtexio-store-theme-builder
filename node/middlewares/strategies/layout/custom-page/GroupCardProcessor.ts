import { ComponentSharedGroupCard } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

export class GroupCardProcessor extends CustomPageBlockProcessor<ComponentSharedGroupCard> {
  process(
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
            cards: section.cards.map((card) => ({
              content: card.content,
            })),
          },
        ],
      },
    })

    this.addToPage(pageKey, blockName)
  }
}
