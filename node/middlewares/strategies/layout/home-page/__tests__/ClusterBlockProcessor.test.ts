import { ClusterBlockProcessor } from '../ClusterBlockProcessor'
import type { ClusterBlock } from '../../../../../typings/homepage-response'

function createLayoutBuilder() {
  const home: string[] = []
  const blocks: Record<string, any> = {}

  return {
    home,
    blocks,
    builder: {
      addBlock: (_parent: string, name: string) => home.push(name),
      setBlockConfig: (name: string, config: any) => {
        blocks[name] = config
      },
    } as any,
  }
}

const section = (overrides: Partial<ClusterBlock> = {}): ClusterBlock =>
  ({
    appName: 'Cluster',
    title: 'Tus compras de cada día',
    type: 'Collection',
    typeNumber: 138,
    beginning: '2026-01-01T00:00:00.000Z',
    expiration: '2076-01-01T00:00:00.000Z',
    ...overrides,
  } as ClusterBlock)

describe('ClusterBlockProcessor', () => {
  it('usa los bloques de lindo.product-summary con prefijo, porque vtex.product-summary declara los mismos nombres', () => {
    const { builder, home, blocks } = createLayoutBuilder()

    new ClusterBlockProcessor(builder, '').process(section())

    const productList =
      'lindo.product-summary:list-context.product-list#cluster-1'

    expect(home).toEqual(['flex-layout.row#cluster-1'])
    expect(blocks['flex-layout.row#cluster-1'].children).toEqual([productList])
    expect(blocks[productList].blocks).toEqual([
      'lindo.product-summary:product-summary.shelf#cluster',
    ])
    expect(blocks[productList].children).toEqual(['slider-layout#cluster'])
    expect(blocks[productList].props).toEqual({
      title: 'Tus compras de cada día',
      collection: '138',
    })
  })

  it('numera cada vitrina', () => {
    const { builder, home } = createLayoutBuilder()
    const processor = new ClusterBlockProcessor(builder, '')

    processor.process(section())
    processor.process(section({ type: 'Category' as any, typeNumber: 10021 }))

    expect(home).toEqual([
      'flex-layout.row#cluster-1',
      'flex-layout.row#cluster-2',
    ])
  })

  it('en una vitrina por categoría no manda el título: la vitrina usa el nombre de la categoría', () => {
    const { builder, blocks } = createLayoutBuilder()

    new ClusterBlockProcessor(builder, '').process(
      section({ type: 'Category' as any, typeNumber: 10021, title: 'Bebés' })
    )

    expect(
      blocks['lindo.product-summary:list-context.product-list#cluster-1'].props
    ).toEqual({ category: '10021' })
  })

  it('una colección con número 2 conserva su título', () => {
    const { builder, blocks } = createLayoutBuilder()

    new ClusterBlockProcessor(builder, '').process(
      section({ typeNumber: 2, title: 'Promos de la semana' })
    )

    expect(
      blocks['lindo.product-summary:list-context.product-list#cluster-1'].props
    ).toEqual({ title: 'Promos de la semana', collection: '2' })
  })
})
