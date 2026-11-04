import { VtexLayoutBuilder } from '../../VtexLayoutBuilder'
import { StepsProcessor } from '../StepsProcessor'

describe('StepsProcessor', () => {
  const pageKey = 'store.custom#como-comprar'

  function build() {
    const builder = new VtexLayoutBuilder()

    builder.initializePage(pageKey)
    new StepsProcessor(builder, 'como-comprar', 'https://cms.test').process(
      {
        appName: 'Steps',
        steps: [
          {
            icon: { url: '/uploads/ingresa.svg', alternativeText: 'Ingresá' },
            title: 'Ingresá',
            text: 'Ingresá a nuestra web',
          },
          { icon: null, title: 'Envío', text: null },
        ],
      },
      pageKey,
      0
    )

    return builder.build()
  }

  it('arma una fila con una columna por paso', () => {
    const layout = build()

    expect(layout[pageKey].blocks).toContain(
      'flex-layout.row#como-comprar-steps-0'
    )
    expect(layout['flex-layout.row#como-comprar-steps-0']).toMatchObject({
      children: [
        'flex-layout.col#como-comprar-step-0-1',
        'flex-layout.col#como-comprar-step-0-2',
      ],
      props: { blockClass: 'custom-page-steps' },
    })
    expect(
      layout['flex-layout.col#como-comprar-step-0-1'].props.blockClass
    ).toBe('custom-page-step')
  })

  it('pone el ícono con la URL de Strapi, el título y el texto', () => {
    const layout = build()

    expect(layout['flex-layout.col#como-comprar-step-0-1'].children).toEqual([
      'image#como-comprar-step-icon-0-1',
      'rich-text#como-comprar-step-title-0-1',
      'rich-text#como-comprar-step-text-0-1',
    ])
    expect(layout['image#como-comprar-step-icon-0-1'].props).toEqual({
      src: 'https://cms.test/uploads/ingresa.svg',
      alt: 'Ingresá',
      blockClass: 'custom-page-step-icon',
    })
    expect(layout['rich-text#como-comprar-step-title-0-1'].props).toEqual({
      text: 'Ingresá',
      blockClass: 'custom-page-step-title',
    })
  })

  it('omite el ícono y el texto si el paso no los tiene', () => {
    const layout = build()

    expect(layout['flex-layout.col#como-comprar-step-0-2'].children).toEqual([
      'rich-text#como-comprar-step-title-0-2',
    ])
  })
})
