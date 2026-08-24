import type { BlockBuilder, LayoutBuilder } from '../../../typings/builder'

export class VtexLayoutBuilder implements LayoutBuilder {
  private layout: Record<string, any> = {}

  public initializePage(pageKey: string): void {
    if (!this.layout[pageKey]) {
      this.layout[pageKey] = {
        parent: { storeWrapper: 'storeWrapper' },
        blocks: [],
      }
    }
  }

  public addBlock(parentKey: string, blockName: string): void {
    if (!this.layout[parentKey]) {
      throw new Error(`Parent key "${parentKey}" does not exist`)
    }

    this.layout[parentKey].blocks.push(blockName)
  }

  public setBlockConfig(blockName: string, config: BlockBuilder): void {
    this.layout[blockName] = {
      ...(config.blocks && { blocks: config.blocks }),
      ...(config.children && { children: config.children }),
      ...(config.props && { props: config.props }),
    }
  }

  public build(): Record<string, any> {
    return this.layout
  }
}
