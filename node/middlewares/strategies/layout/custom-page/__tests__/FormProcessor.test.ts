import { VtexLayoutBuilder } from '../../VtexLayoutBuilder'
import { FormProcessor } from '../FormProcessor'

// Mismo orden que los schemas sh_contact_us y sh_help de MasterData
const properties = {
  subject: { type: 'string', title: 'Asunto', enum: ['Reclamo', 'Consulta'] },
  firstName: { type: 'string', title: 'Nombre' },
  lastName: { type: 'string', title: 'Apellido' },
  email: { type: 'string', title: 'Email', format: 'email' },
  phone: { type: 'string', title: 'Teléfono', maxLength: 20 },
  comment: { type: 'string', title: 'Comentario', maxLength: 500 },
}

function build(
  slug: string,
  schemaName: string,
  props: Record<string, any> = properties,
  entity: string | undefined = 'forms'
) {
  const builder = new VtexLayoutBuilder()
  const pageKey = `store.custom#${slug}`

  builder.initializePage(pageKey)
  new FormProcessor(builder, slug, '').process(
    {
      appName: 'Form',
      schema: {
        name: schemaName,
        entity: entity as string,
        schema: { type: 'object', properties: props },
      },
    },
    pageKey,
    0
  )

  return builder.build()
}

describe('FormProcessor', () => {
  it('elige el input según el campo del schema', () => {
    const names = Object.keys(build('contactanos', 'sh_contact_us'))

    expect(names).toContain(
      'form-input.dropdown#contactanos-subject-sh_contact_us-0'
    )
    expect(names).toContain(
      'form-input.text#contactanos-firstName-sh_contact_us-0'
    )
    expect(names).toContain('form-input.text#contactanos-phone-sh_contact_us-0')
    expect(names).toContain(
      'form-input.textarea#contactanos-comment-sh_contact_us-0'
    )
  })

  it('pone los campos de texto cortos de a dos en una fila', () => {
    const layout = build('contactanos', 'sh_contact_us')

    expect(layout['form#contactanos-form-sh_contact_us-0'].children).toEqual([
      'form-input.dropdown#contactanos-subject-sh_contact_us-0',
      'flex-layout.row#contactanos-form-row-2-sh_contact_us-0',
      'flex-layout.row#contactanos-form-row-3-sh_contact_us-0',
      'form-input.textarea#contactanos-comment-sh_contact_us-0',
      'form-submit#contactanos-sh_contact_us-0',
    ])
    expect(
      layout['flex-layout.row#contactanos-form-row-2-sh_contact_us-0']
    ).toMatchObject({
      children: [
        'form-input.text#contactanos-firstName-sh_contact_us-0',
        'form-input.text#contactanos-lastName-sh_contact_us-0',
      ],
      props: { blockClass: 'custom-form-row' },
    })
  })

  it('deja solo un campo corto sin pareja', () => {
    const { lastName, ...withoutLastName } = properties
    const layout = build('contactanos', 'sh_contact_us', withoutLastName)

    expect(layout['form#contactanos-form-sh_contact_us-0'].children).toEqual([
      'form-input.dropdown#contactanos-subject-sh_contact_us-0',
      'flex-layout.row#contactanos-form-row-2-sh_contact_us-0',
      'form-input.text#contactanos-phone-sh_contact_us-0',
      'form-input.textarea#contactanos-comment-sh_contact_us-0',
      'form-submit#contactanos-sh_contact_us-0',
    ])
  })

  it('no repite nombres de bloque entre páginas con el mismo schema', () => {
    const a = Object.keys(build('no-recibi-mi-pedido', 'sh_help'))
    const b = Object.keys(build('me-falto-un-producto', 'sh_help'))
    const shared = a.filter((name) => b.includes(name))

    expect(shared).toEqual([])
  })

  it('usa la entidad del schema en el bloque form', () => {
    const layout = build('no-recibi-mi-pedido', 'sh_help', properties, 'help')

    expect(layout['form#no-recibi-mi-pedido-form-sh_help-0'].props).toEqual({
      entity: 'help',
      schema: 'sh_help',
      blockClass: 'custom-form-main',
    })
  })

  it('falla si el schema no trae entidad', () => {
    expect(() => build('no-recibi-mi-pedido', 'sh_help', properties, '')).toThrow(
      new Error('Form schema sh_help has no entity')
    )
  })
})
