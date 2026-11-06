import { MultipleImageSelectorProcessor } from '../MultipleImageSelectorProcessor'
import type {
  ImageSelector,
  MultipleImageSelectorBlock,
} from '../../../../../typings/homepage-response'

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

const selector = (overrides: Partial<ImageSelector> = {}): ImageSelector =>
  ({
    title: '',
    beginning: '2026-01-01T00:00:00.000Z',
    expiration: '2076-01-01T00:00:00.000Z',
    itemsPerPageDesktop: 8,
    itemsPerPageTablet: 5,
    itemsPerPageMobile: 4,
    images: [{ text: 'Almacén', link: '/almacen', image: { url: '/a.png' } }],
    ...overrides,
  } as ImageSelector)

const section = (imageSelectors: ImageSelector[]): MultipleImageSelectorBlock =>
  ({ appName: 'MultipleImageSelector', imageSelectors } as any)

describe('MultipleImageSelectorProcessor', () => {
  it('con el primer slider de categorías ubica la tira de Ofertas antes y la grilla del celular después', () => {
    const { builder, home } = createLayoutBuilder()

    new MultipleImageSelectorProcessor(builder, '').process(
      section([selector()])
    )

    expect(home).toEqual([
      'flex-layout.row#ofertas-strip',
      'flex-layout.row#image-selector-slider-1',
      'category-grid#home',
    ])
  })

  it('no define la tira ni la grilla: viven en el theme (home-mobile.jsonc), que el Builder no pisa', () => {
    const { builder, blocks } = createLayoutBuilder()

    new MultipleImageSelectorProcessor(builder, '').process(
      section([selector()])
    )

    expect(blocks['flex-layout.row#ofertas-strip']).toBeUndefined()
    expect(blocks['category-grid#home']).toBeUndefined()
  })

  it('con un título, la tira va antes del título y la grilla después del slider', () => {
    const { builder, home } = createLayoutBuilder()

    new MultipleImageSelectorProcessor(builder, '').process(
      section([selector({ title: 'Categorías' })])
    )

    expect(home).toEqual([
      'flex-layout.row#ofertas-strip',
      'flex-layout.row#image-selector-title-1',
      'flex-layout.row#image-selector-slider-1',
      'category-grid#home',
    ])
  })

  it('con dos sliders, la tira y la grilla aparecen una sola vez, con el primero', () => {
    const { builder, home } = createLayoutBuilder()

    new MultipleImageSelectorProcessor(builder, '').process(
      section([selector(), selector()])
    )

    expect(home).toEqual([
      'flex-layout.row#ofertas-strip',
      'flex-layout.row#image-selector-slider-1',
      'category-grid#home',
      'flex-layout.row#image-selector-slider-2',
    ])
  })

  it('marca el primer slider y su título con blockClass categoriesSlider: el theme los oculta en el celular', () => {
    const { builder, blocks } = createLayoutBuilder()

    new MultipleImageSelectorProcessor(builder, '').process(
      section([selector({ title: 'Categorías' }), selector({ title: 'Otro' })])
    )

    expect(blocks['flex-layout.row#image-selector-slider-1'].props).toEqual({
      blockClass: 'categoriesSlider',
    })
    expect(blocks['flex-layout.row#image-selector-title-1'].props).toEqual({
      blockClass: 'categoriesSlider',
    })
    expect(blocks['flex-layout.row#image-selector-slider-2'].props).toBeUndefined()
    expect(blocks['flex-layout.row#image-selector-title-2'].props).toBeUndefined()
  })

  it('sin sliders vigentes no agrega nada', () => {
    const { builder, home } = createLayoutBuilder()

    new MultipleImageSelectorProcessor(builder, '').process(
      section([
        selector({
          beginning: '2020-01-01T00:00:00.000Z',
          expiration: '2020-02-01T00:00:00.000Z',
        }),
      ])
    )

    expect(home).toEqual([])
  })
})
