import { ClusterBlock } from '../../../typings/homepage-response'
import { isWithinDateRange } from '../../../utils/isWithinDateRange'
import { BlockProcessor } from './BlockProcessor'

export class ClusterBlockProcessor extends BlockProcessor<ClusterBlock> {
  private counter = 0

  process(section: ClusterBlock): void {
    if (!isWithinDateRange(section.beginning, section.expiration)) return

    this.counter++
    const clusterRow = `flex-layout.row#cluster-${this.counter}`
    const productList = `list-context.product-list#cluster-${this.counter}`

    this.addToHome(clusterRow)

    this.createBlock(clusterRow, {
      blockName: clusterRow,
      children: [productList],
      props: { blockClass: 'cluster' },
    })

    const props = this.buildClusterProps(section)

    this.createBlock(productList, {
      blockName: productList,
      children: ['slider-layout#cluster'],
      props,
    })
  }

  private buildClusterProps(section: ClusterBlock): Record<string, any> {
    const props: Record<string, any> = {}

    if (section.title?.trim()) {
      props.title = section.title
    }

    props[section.type.toLowerCase()] = section.typeNumber.toString()

    return props
  }
}
