import { VtexLayoutBuilder } from '../../VtexLayoutBuilder'
import { FAQProcessor } from '../FAQProcessor'

describe('FAQProcessor', () => {
  const pageKey = 'store.custom#faq'

  function build() {
    const builder = new VtexLayoutBuilder()

    builder.initializePage(pageKey)
    new FAQProcessor(builder, 'faq', '').process(
      {
        appName: 'FAQ',
        faqs: [
          { question: '¿Cómo se abona el pedido?', answer: 'Online o en sucursal.' },
          { question: '¿Cómo vacío el carrito?', answer: 'Desde el carrito.' },
        ],
      },
      pageKey,
      0
    )

    return builder.build()
  }

  it('pone el blockClass de la FAQ en la fila, los triggers y los contenidos', () => {
    const layout = build()

    expect(layout['flex-layout.row#faq-faq-wrapper-0'].props.blockClass).toBe('custom-page-faq')
    expect(layout['disclosure-trigger#faq-faq-0-1'].props).toEqual({
      as: 'div',
      blockClass: 'custom-page-faq',
    })
    expect(layout['disclosure-content#faq-faq-0-2'].props.blockClass).toBe('custom-page-faq')
    expect(layout['rich-text#faq-q-0-1'].props.blockClass).toBe('custom-page-faq-question')
    expect(layout['rich-text#faq-a-0-1'].props.blockClass).toBe('custom-page-faq-answer')
  })

  it('agrega el indicador + / – a cada pregunta', () => {
    const layout = build()

    expect(layout['disclosure-trigger#faq-faq-0-1'].children).toEqual([
      'rich-text#faq-q-0-1',
      'disclosure-state-indicator#faq-faq-0',
    ])
    expect(layout['disclosure-state-indicator#faq-faq-0'].props).toEqual({
      Show: 'icon-plus#faq-faq-0',
      Hide: 'icon-minus#faq-faq-0',
    })
    expect(layout['icon-plus#faq-faq-0']).toBeDefined()
    expect(layout['icon-minus#faq-faq-0']).toBeDefined()
  })
})
