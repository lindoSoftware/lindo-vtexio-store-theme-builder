import type { ComponentSharedSteps } from '../../../../typings/custompage-response'
import { mediaUrl } from '../../../../utils/card.helper'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

// Clases para estilar los pasos (vtex.flex-layout.css, vtex.store-components.css
// y vtex.rich-text.css del theme). El número de cada paso lo pone el CSS.
const STEPS_BLOCK_CLASS = 'custom-page-steps'

export class StepsProcessor extends CustomPageBlockProcessor<ComponentSharedSteps> {
  public process(
    section: ComponentSharedSteps,
    pageKey: string,
    index: number
  ): void {
    // Página -> Row -> una Col por paso -> Image + RichText (título y texto)
    const rowBlock = this.generateBlockName('flex-layout.row', `steps-${index}`)

    this.addToPage(pageKey, rowBlock)

    const stepBlocks = section.steps.map((step, i) => {
      const itemId = `${index}-${i + 1}`
      const colBlock = this.generateBlockName(
        'flex-layout.col',
        `step-${itemId}`
      )
      const children: string[] = []

      if (step.icon?.url) {
        const iconBlock = this.generateBlockName('image', `step-icon-${itemId}`)

        this.createBlock(iconBlock, {
          blockName: iconBlock,
          props: {
            src: mediaUrl(step.icon.url, this.strapiURL),
            alt: step.icon.alternativeText ?? '',
            blockClass: 'custom-page-step-icon',
          },
        })
        children.push(iconBlock)
      }

      const titleBlock = this.generateBlockName(
        'rich-text',
        `step-title-${itemId}`
      )

      this.createBlock(titleBlock, {
        blockName: titleBlock,
        props: { text: step.title, blockClass: 'custom-page-step-title' },
      })
      children.push(titleBlock)

      if (step.text) {
        const textBlock = this.generateBlockName(
          'rich-text',
          `step-text-${itemId}`
        )

        this.createBlock(textBlock, {
          blockName: textBlock,
          props: { text: step.text, blockClass: 'custom-page-step-text' },
        })
        children.push(textBlock)
      }

      this.createBlock(colBlock, {
        blockName: colBlock,
        children,
        props: { blockClass: 'custom-page-step' },
      })

      return colBlock
    })

    this.createBlock(rowBlock, {
      blockName: rowBlock,
      children: stepBlocks,
      props: { blockClass: STEPS_BLOCK_CLASS },
    })
  }
}
