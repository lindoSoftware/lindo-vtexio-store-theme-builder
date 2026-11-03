import { VtexLayoutBuilder } from '../../VtexLayoutBuilder'
import { FormProcessor } from '../FormProcessor'

describe('FormProcessor', () => {
  it('elige el input según el campo del schema', () => {
    const builder = new VtexLayoutBuilder()
    const pageKey = 'store.custom#contactanos'

    builder.initializePage(pageKey)
    new FormProcessor(builder, 'contactanos', '').process(
      {
        appName: 'Form',
        schema: {
          name: 'sh_contact_us',
          schema: {
            type: 'object',
            properties: {
              firstName: { type: 'string', title: 'Nombre' },
              subject: { type: 'string', title: 'Asunto', enum: ['Reclamo', 'Consulta'] },
              comment: { type: 'string', title: 'Comentario', maxLength: 500 },
              phone: { type: 'string', title: 'Teléfono', maxLength: 20 },
            },
          },
        },
      },
      pageKey,
      0
    )

    const names = Object.keys(builder.build())

    expect(names).toContain('form-input.text#firstName-sh_contact_us-0')
    expect(names).toContain('form-input.dropdown#subject-sh_contact_us-0')
    expect(names).toContain('form-input.textarea#comment-sh_contact_us-0')
    expect(names).toContain('form-input.text#phone-sh_contact_us-0')
  })
})
