import type { ComponentSharedForm } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

type InputType =
  | 'form-input.text'
  | 'form-input.dropdown'
  | 'form-input.textarea'

export class FormProcessor extends CustomPageBlockProcessor<ComponentSharedForm> {
  public process(
    section: ComponentSharedForm,
    pageKey: string,
    index: number
  ): void {
    const { schema } = section
    // Los nombres llevan el slug de la página (generateBlockName): varias
    // páginas usan el mismo schema (las 5 de Ayuda con sh_help) y VTEX no
    // admite dos bloques con el mismo nombre en el theme.
    const suffix = `${schema.name}-${index}`

    const rowBlock = this.generateBlockName('flex-layout.row', `form-${suffix}`)
    const colBlock = this.generateBlockName('flex-layout.col', `form-${suffix}`)
    const formBlock = this.generateBlockName('form', `form-${suffix}`)

    const successBlock = this.generateBlockName('form-success', suffix)
    const successTextLink = this.generateBlockName(
      'rich-text',
      `form-success-${suffix}`
    )
    const submitBlock = this.generateBlockName('form-submit', suffix)

    // 1. Un input por campo del schema, en el orden del schema
    const inputs = Object.entries(schema.schema.properties).map(
      ([key, details]) => {
        const isDropdown = !!(details.enum && details.enum.length > 0)
        // Un texto que admite más de una línea (ej. comentario de 500) va en un área de texto
        const isLongText = !isDropdown && (details.maxLength ?? 0) > 100
        const blockType: InputType = isDropdown
          ? 'form-input.dropdown'
          : isLongText
          ? 'form-input.textarea'
          : 'form-input.text'

        const inputBlockName = this.generateBlockName(
          blockType,
          `${key}-${suffix}`
        )

        this.createBlock(inputBlockName, {
          blockName: inputBlockName,
          props: {
            pointer: `#/properties/${key}`,
            label: details.title || key,
            placeholder: details.description || '',
            blockClass: 'custom-form-input',
          },
        })

        return { blockName: inputBlockName, blockType }
      }
    )

    // 2. Dos columnas: los campos de texto cortos seguidos van de a dos en una
    // fila (Nombre | Apellido, Email | Teléfono). Los desplegables y las áreas
    // de texto ocupan todo el ancho. Es la única forma de ubicar los campos:
    // los inputs del styleguide no tienen css handles.
    const inputChildren: string[] = []

    for (let i = 0; i < inputs.length; i++) {
      const current = inputs[i]
      const next = inputs[i + 1]

      if (
        current.blockType === 'form-input.text' &&
        next?.blockType === 'form-input.text'
      ) {
        const pairRow = this.generateBlockName(
          'flex-layout.row',
          `form-row-${inputChildren.length + 1}-${suffix}`
        )

        this.createBlock(pairRow, {
          blockName: pairRow,
          children: [current.blockName, next.blockName],
          props: { blockClass: 'custom-form-row' },
        })
        inputChildren.push(pairRow)
        i++
      } else {
        inputChildren.push(current.blockName)
      }
    }

    // 3. Definición del Botón Submit con blockClass
    inputChildren.push(submitBlock)
    this.createBlock(submitBlock, {
      blockName: submitBlock,
      props: {
        label: 'Enviar',
        blockClass: 'custom-form-submit',
      },
    })

    // 4. Bloque de éxito y mensaje
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

    // 5. Configuración del Form
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

    // 6. Layout hierarchy
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
