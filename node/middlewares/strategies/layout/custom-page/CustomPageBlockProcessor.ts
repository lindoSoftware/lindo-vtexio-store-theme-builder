import { BlockBuilder, LayoutBuilder } from '../../../../typings/builder'
import { BlockNameHelper } from '../../../../utils/BlockNameHelper'

export abstract class CustomPageBlockProcessor<T> {
  protected readonly blockNameHelper: BlockNameHelper

  constructor(
    protected layoutBuilder: LayoutBuilder,
    pageSlug: string
  ) {
    this.blockNameHelper = new BlockNameHelper(pageSlug)
  }

  abstract process(section: T, pageKey: string, index: number): void

  protected addToPage(pageKey: string, blockName: string): void {
    this.layoutBuilder.addBlock(pageKey, blockName)
  }

  protected createBlock(blockName: string, config: BlockBuilder): void {
    this.layoutBuilder.setBlockConfig(blockName, config)
  }

  protected generateBlockName(blockType: string, suffix: string = ''): string {
    return this.blockNameHelper.generateBlockName(blockType, suffix)
  }
}
