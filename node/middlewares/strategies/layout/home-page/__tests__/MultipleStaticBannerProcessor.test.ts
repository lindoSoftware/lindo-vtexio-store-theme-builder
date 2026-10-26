import { MultipleStaticBannerProcessor } from '../MultipleStaticBannerProcessor'
import type {
  MultipleStaticBannerBlock,
  StaticBannerGroup,
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

const group = (overrides: Partial<StaticBannerGroup> = {}): StaticBannerGroup => ({
  name: 'Promociones bancarias',
  beginning: '2026-01-01T00:00:00.000Z',
  expiration: '2076-01-01T00:00:00.000Z',
  columnGap: 2,
  rowGap: 3,
  banners: [
    {
      image: { url: '/uploads/naranja.png' },
      mobileImage: { url: '/uploads/naranja-mobile.png' },
      link: '/promociones',
      text: 'Naranja X: 4 cuotas sin interés',
    },
  ],
  ...overrides,
})

const section = (groups: StaticBannerGroup[]): MultipleStaticBannerBlock =>
  ({
    appName: 'MultipleStaticBanner',
    staticBanners: groups,
  } as MultipleStaticBannerBlock)

describe('MultipleStaticBannerProcessor', () => {
  it('arma la fila con la imagen, el link y el texto alternativo', () => {
    const { builder, home, blocks } = createLayoutBuilder()

    new MultipleStaticBannerProcessor(builder, 'https://strapi').process(
      section([group()])
    )

    expect(home).toEqual(['flex-layout.row#static-banner-1'])
    expect(blocks['list-context.image-list#static-banner-1'].props.images).toEqual([
      {
        image: 'https://strapi/uploads/naranja.png',
        mobileImage: 'https://strapi/uploads/naranja-mobile.png',
        link: { url: '/promociones', openNewTab: false },
        description: 'Naranja X: 4 cuotas sin interés',
      },
    ])
  })

  it('usa blockClass e infinite, las props que lee slider-layout', () => {
    const { builder, blocks } = createLayoutBuilder()

    new MultipleStaticBannerProcessor(builder, '').process(section([group()]))

    const props = blocks['slider-layout#static-banner-1'].props

    expect(props.blockClass).toBe('mh2-mv3')
    expect(props.infinite).toBe(true)
    expect(props).not.toHaveProperty('blockclass')
    expect(props).not.toHaveProperty('infinity')
  })

  it('sin texto ni imagen de celular, usa la de desktop y no manda description', () => {
    const { builder, blocks } = createLayoutBuilder()

    new MultipleStaticBannerProcessor(builder, '').process(
      section([
        group({
          banners: [
            { image: { url: '/a.png' }, mobileImage: null, link: '', text: null },
          ],
        }),
      ])
    )

    expect(blocks['list-context.image-list#static-banner-1'].props.images).toEqual([
      { image: '/a.png', mobileImage: '/a.png', link: { url: '', openNewTab: false } },
    ])
  })

  it('numera en toda la home: dos componentes no repiten ids', () => {
    const { builder, home } = createLayoutBuilder()
    const processor = new MultipleStaticBannerProcessor(builder, '')

    processor.process(section([group()]))
    processor.process(section([group(), group()]))

    expect(home).toEqual([
      'flex-layout.row#static-banner-1',
      'flex-layout.row#static-banner-2',
      'flex-layout.row#static-banner-3',
    ])
  })

  it('no agrega grupos vencidos', () => {
    const { builder, home } = createLayoutBuilder()

    new MultipleStaticBannerProcessor(builder, '').process(
      section([group({ expiration: '2020-01-01T00:00:00.000Z' })])
    )

    expect(home).toEqual([])
  })
})
