import type { ClusterBlock } from '../../../../typings/homepage-response'
import { CLUSTER_TYPES } from '../../../../utils/homepage-constants'
import { isWithinDateRange } from '../../../../utils/isWithinDateRange'
import { BlockProcessor } from './BlockProcessor'

// El theme depende de lindo.product-summary y de vtex.product-summary, y las dos declaran
// list-context.product-list y product-summary.shelf: sin el prefijo el theme no compila.
const PRODUCT_SUMMARY_APP = 'lindo.product-summary'

export class ClusterBlockProcessor extends BlockProcessor<ClusterBlock> {
  private counter = 0

  public process(section: ClusterBlock): void {
    if (!isWithinDateRange(section.beginning, section.expiration)) return

    this.counter++
    const clusterRow = `flex-layout.row#cluster-${this.counter}`
    const productList = `${PRODUCT_SUMMARY_APP}:list-context.product-list#cluster-${this.counter}`

    this.addToHome(clusterRow)

    this.createBlock(clusterRow, {
      blockName: clusterRow,
      children: [productList],
      props: { blockClass: 'cluster' },
    })

    const props = this.buildClusterProps(section)

    this.createBlock(productList, {
      blockName: productList,
      blocks: [`${PRODUCT_SUMMARY_APP}:product-summary.shelf#cluster`],
      children: ['slider-layout#cluster'],
      props,
    })
  }

  private buildClusterProps(section: ClusterBlock): Record<string, any> {
    const props: Record<string, any> = {}

    // Una vitrina por categoría no lleva título de Strapi: muestra el nombre de la categoría.
    // typeNumber es el número de la colección o de la categoría, no el tipo.
    if (section.title?.trim() && section.type !== CLUSTER_TYPES.CATEGORY) {
      props.title = section.title
    }

    props[section.type.toLowerCase()] = section.typeNumber.toString()

    return props
  }
}
