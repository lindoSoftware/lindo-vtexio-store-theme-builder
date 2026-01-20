export interface BlockBuilder {
  blockName: string
  props?: Record<string, any>
  children?: string[]
  blocks?: string[]
}

export interface LayoutBuilder {
  addBlock(parentKey: string, blockName: string): void
  setBlockConfig(blockName: string, config: BlockBuilder): void
  build(): Record<string, any>
}
