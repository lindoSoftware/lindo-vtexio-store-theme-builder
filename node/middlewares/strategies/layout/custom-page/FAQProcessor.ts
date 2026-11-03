import type { ComponentSharedFAQ } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

// Clase para estilar la FAQ de las custom pages (vtex.disclosure-layout.css del
// theme) sin tocar los acordeones del footer.
const FAQ_BLOCK_CLASS = 'custom-page-faq'

export class FAQProcessor extends CustomPageBlockProcessor<ComponentSharedFAQ> {
  public process(
    section: ComponentSharedFAQ,
    pageKey: string,
    index: number
  ): void {
    // 1. Definición de IDs siguiendo la estructura de faq.jsonc
    // Usamos wrappers para envolver el grupo de FAQs
    const rowBlock = this.generateBlockName(
      'flex-layout.row',
      `faq-wrapper-${index}`
    )

    const colBlock = this.generateBlockName(
      'flex-layout.col',
      `faq-container-${index}`
    )

    const faqGroupBlock = this.generateBlockName(
      'disclosure-layout-group',
      `faq-${index}`
    )

    // 2. Construir la jerarquía: Página -> Row -> Col -> Group
    this.addToPage(pageKey, rowBlock)

    this.createBlock(rowBlock, {
      blockName: rowBlock,
      children: [colBlock],
      props: { blockClass: FAQ_BLOCK_CLASS },
    })

    this.createBlock(colBlock, {
      blockName: colBlock,
      children: [faqGroupBlock],
    })

    // Indicador + / – compartido por todos los items de la sección
    const indicatorBlock = this.generateBlockName(
      'disclosure-state-indicator',
      `faq-${index}`
    )

    const plusIcon = this.generateBlockName('icon-plus', `faq-${index}`)
    const minusIcon = this.generateBlockName('icon-minus', `faq-${index}`)

    this.createBlock(indicatorBlock, {
      blockName: indicatorBlock,
      props: { Show: plusIcon, Hide: minusIcon },
    })
    this.createBlock(plusIcon, { blockName: plusIcon, props: { size: 12 } })
    this.createBlock(minusIcon, { blockName: minusIcon, props: { size: 12 } })

    const disclosureChildren: string[] = []

    // 3. Iterar sobre las FAQs para crear Disclosure -> Trigger/Content -> RichText
    section.faqs.forEach((faq, i) => {
      // Combinamos el índice de la sección (index) con el del item (i) para unicidad total
      const itemId = `${index}-${i + 1}`
      const layoutBlock = this.generateBlockName(
        'disclosure-layout',
        `faq-${itemId}`
      )

      const triggerBlock = this.generateBlockName(
        'disclosure-trigger',
        `faq-${itemId}`
      )

      const contentBlock = this.generateBlockName(
        'disclosure-content',
        `faq-${itemId}`
      )

      const questionBlock = this.generateBlockName('rich-text', `q-${itemId}`)
      const answerBlock = this.generateBlockName('rich-text', `a-${itemId}`)

      disclosureChildren.push(layoutBlock)

      // disclosure-layout#faqX
      this.createBlock(layoutBlock, {
        blockName: layoutBlock,
        children: [triggerBlock, contentBlock],
      })

      // disclosure-trigger#faqX
      this.createBlock(triggerBlock, {
        blockName: triggerBlock,
        children: [questionBlock, indicatorBlock],
        props: { as: 'div', blockClass: FAQ_BLOCK_CLASS },
      })

      // rich-text#qX (Pregunta)
      this.createBlock(questionBlock, {
        blockName: questionBlock,
        props: {
          text: `**${faq.question}**`, // Formato negrita del jsonc
          blockClass: 'custom-page-faq-question',
        },
      })

      // disclosure-content#faqX
      this.createBlock(contentBlock, {
        blockName: contentBlock,
        children: [answerBlock],
        props: { blockClass: FAQ_BLOCK_CLASS },
      })

      // rich-text#aX (Respuesta)
      this.createBlock(answerBlock, {
        blockName: answerBlock,
        props: {
          text: faq.answer,
          blockClass: 'custom-page-faq-answer',
        },
      })
    })

    // 4. Configurar el grupo principal con sus hijos y props
    this.createBlock(faqGroupBlock, {
      blockName: faqGroupBlock,
      props: {
        maxVisible: 'one', // Solo una abierta a la vez
      },
      children: disclosureChildren,
    })
  }
}
