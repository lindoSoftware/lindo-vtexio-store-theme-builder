import { VtexLayoutBuilder } from '../../VtexLayoutBuilder'
import { GroupCardProcessor } from '../GroupCardProcessor'

describe('GroupCardProcessor', () => {
  const pageKey = 'store.custom#medios-pago'

  function build(cardGroupLayout?: 'full_width' | 'side_by_side') {
    const builder = new VtexLayoutBuilder()

    builder.initializePage(pageKey)
    new GroupCardProcessor(builder, 'medios-pago', 'https://ioadmin.lindo.la').process(
      {
        name: 'Medios de pago',
        appName: 'PaymentGroupCard',
        cardGroupLayout,
        cards: [
          {
            content: [
              { appName: 'CardTextBlock', variant: 'title', content: 'Pagos online' },
              {
                appName: 'CardImageBlock',
                images: [
                  { url: '/uploads/visa.png' },
                  { url: 'https://s3.sa-east-1.amazonaws.com/alberdi.static.sale/maestro.png' },
                ],
              },
            ],
          },
        ],
      },
      pageKey,
      0
    )

    return builder.build()['payment-methods-cardgroup#medios-pago-group-card-0'].props.content[0]
  }

  it('pasa el layout con la prop que lee lindo.payment-method', () => {
    expect(build('side_by_side').layout).toBe('side_by_side')
    expect(build().layout).toBe('full_width')
  })

  it('antepone la URL de Strapi solo a las imágenes relativas', () => {
    const images = build('side_by_side').cards[0].content[1].images

    expect(images).toEqual([
      { url: 'https://ioadmin.lindo.la/uploads/visa.png' },
      { url: 'https://s3.sa-east-1.amazonaws.com/alberdi.static.sale/maestro.png' },
    ])
  })
})
