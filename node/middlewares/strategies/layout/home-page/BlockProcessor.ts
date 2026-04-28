import { BlockBuilder, LayoutBuilder } from "../../../../typings/builder"

export abstract class BlockProcessor<T> {
  constructor(
    protected layoutBuilder: LayoutBuilder,
    protected strapiURL: string
  ) {}

  abstract process(section: T, index: number): void

  protected addToHome(blockName: string): void {
    this.layoutBuilder.addBlock('store.home', blockName)
  }

  protected createBlock(blockName: string, config: BlockBuilder): void {
    this.layoutBuilder.setBlockConfig(blockName, config)
  }
}