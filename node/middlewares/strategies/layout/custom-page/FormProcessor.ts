import { ComponentSharedForm } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

export class FormProcessor extends CustomPageBlockProcessor<ComponentSharedForm> {
  process(section: ComponentSharedForm, pageKey: string, index: number): void {
    const { schema } = section
    const suffix = `-${schema.name}-${index}`

    const rowBlock = this.generateBlockName('flex-layout.row', `form${suffix}`)
    const colBlock = this.generateBlockName('flex-layout.col', `form${suffix}`)
    const formBlock = this.generateBlockName('form', `form${suffix}`)

    const successBlock = `form-success#${suffix}`
    const successTextLink = `rich-text#successSubmit${suffix}`
    const submitBlock = `form-submit#${suffix}` // Ahora con suffix para blockClass

    const inputChildren: string[] = []

    // 1. Mapeo de inputs con blockClass
    Object.entries(schema.schema.properties).forEach(([key, details]) => {
      const isDropdown = !!(details.enum && details.enum.length > 0)
      const blockType = isDropdown ? 'form-input.dropdown' : 'form-input.text'
      const inputBlockName = `${blockType}#${key}${suffix}`

      inputChildren.push(inputBlockName)

      this.createBlock(inputBlockName, {
        blockName: inputBlockName,
        props: {
          pointer: `#/properties/${key}`,
          label: details.title || key,
          placeholder: details.description || '',
          blockClass: 'custom-form-input',
        },
      })
    })

    // 2. Definición del Botón Submit con blockClass
    inputChildren.push(submitBlock)
    this.createBlock(submitBlock, {
      blockName: submitBlock,
      props: {
        label: 'Enviar',
        blockClass: 'custom-form-submit',
      },
    })

    // 3. Bloque de éxito y mensaje
    this.createBlock(successBlock, {
      blockName: successBlock,
      children: [successTextLink],
      props: {
        blockClass: 'custom-form-success-container',
      },
    })

    this.createBlock(successTextLink, {
      blockName: successTextLink,
      props: {
        text: '**¡Formulario enviado exitosamente!** \n\n Nos pondremos en contacto a la brevedad.',
        textAlignment: 'CENTER',
        textPosition: 'CENTER',
        blockClass: 'custom-form-success-text',
      },
    })

    // 4. Configuración del Form
    this.createBlock(formBlock, {
      blockName: formBlock,
      props: {
        entity: 'forms',
        schema: schema.name,
        blockClass: 'custom-form-main',
      },
      children: inputChildren,
      blocks: [successBlock],
    })

    // 5. Layout hierarchy
    this.addToPage(pageKey, rowBlock)
    this.createBlock(rowBlock, {
      blockName: rowBlock,
      children: [colBlock],
    })
    this.createBlock(colBlock, {
      blockName: colBlock,
      children: [formBlock],
    })
  }
}
