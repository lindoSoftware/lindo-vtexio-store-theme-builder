import { ComponentSharedRichText } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

export class RichTextProcessor extends CustomPageBlockProcessor<ComponentSharedRichText> {
  process(
    section: ComponentSharedRichText,
    pageKey: string,
    index: number
  ): void {
    const richTextBlock = `rich-text#custom-${index}`

    this.addToPage(pageKey, richTextBlock)

    this.createBlock(richTextBlock, {
      blockName: richTextBlock,
      props: {
        text: section.text,
      },
    })
  }
}
