import { BlockBuilder, LayoutBuilder } from '../../../../typings/builder'

export abstract class CustomPageBlockProcessor<T> {
  constructor(protected layoutBuilder: LayoutBuilder) {}

  abstract process(section: T, pageKey: string, index: number): void

  protected addToPage(pageKey: string, blockName: string): void {
    this.layoutBuilder.addBlock(pageKey, blockName)
  }

  protected createBlock(blockName: string, config: BlockBuilder): void {
    this.layoutBuilder.setBlockConfig(blockName, config)
  }
}
