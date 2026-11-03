import type { ComponentSharedRichText } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

export class RichTextProcessor extends CustomPageBlockProcessor<ComponentSharedRichText> {
  public process(
    section: ComponentSharedRichText,
    pageKey: string,
    index: number
  ): void {
    const richTextBlock = this.generateBlockName('rich-text', `${index}`)

    this.addToPage(pageKey, richTextBlock)

    this.createBlock(richTextBlock, {
      blockName: richTextBlock,
      props: {
        text: section.text,
        // Permite estilar el texto de las custom pages sin tocar los demás
        // rich text de la tienda (vtex.rich-text.css del theme).
        blockClass: 'custom-page-content',
      },
    })
  }
}
