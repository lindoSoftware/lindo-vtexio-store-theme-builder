import type { ComponentSharedBranchSelector } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

export class BranchSelectorProcessor extends CustomPageBlockProcessor<ComponentSharedBranchSelector> {
  public process(
    section: ComponentSharedBranchSelector,
    pageKey: string,
    index: number
  ): void {
    const rowBlock = this.generateBlockName(
      'flex-layout.row',
      `branch-selector-${index}`
    )

    const colBlock = this.generateBlockName(
      'flex-layout.col',
      `branch-selector-${index}`
    )

    const branchBlock = this.generateBlockName('branch-selector', `${index}`)

    // 1. Agregar el contenedor principal a la página custom
    this.addToPage(pageKey, rowBlock)

    // 2. Crear estructura Row -> Col -> BranchSelector
    this.createBlock(rowBlock, {
      blockName: rowBlock,
      children: [colBlock],
      props: {
        blockClass: 'branch-selector-wrapper',
      },
    })

    this.createBlock(colBlock, {
      blockName: colBlock,
      children: [branchBlock],
    })

    // 3. Configurar el bloque funcional BranchSelector
    this.createBlock(branchBlock, {
      blockName: branchBlock,
      props: {
        showMap: section.showMap,
      },
    })
  }
}
