import env from '../../../../env'
import {
  ComponentSharedTab,
  ComponentSharedTabGroup,
} from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

type PaymentTabContent = ComponentSharedTab | ComponentSharedTabGroup

export class PaymentMethodsTabProcessor extends CustomPageBlockProcessor<PaymentTabContent> {
  private blockName?: string
  private contentAccumulator: any[] = []

  process(section: PaymentTabContent, pageKey: string, _: number): void {
    // Crear el bloque una sola vez
    if (!this.blockName) {
      this.blockName = this.generateBlockName(
        'payment-methods-tab',
        'tabgroup-and-tab'
      )

      this.createBlock(this.blockName, {
        blockName: this.blockName,
        props: {
          content: this.contentAccumulator,
        },
      })

      this.addToPage(pageKey, this.blockName)
    }

    // Acumular contenido
    if (this.isTab(section)) {
      this.contentAccumulator.push(this.mapTab(section))
    }

    if (this.isTabGroup(section)) {
      this.contentAccumulator.push(this.mapTabGroup(section))
    }
  }

  /* =======================
     Mapping
     ======================= */

  private mapTab(tab: ComponentSharedTab) {
    return {
      appName: tab.appName,
      title: tab.title,
      icon: tab.icon ?? null,
      layout: tab.tabLayout ?? 'side-by-side',
      cards: tab.cards.map((card) => ({
        content: this.mapCardContent(card.content),
      })),
    }
  }

  private mapTabGroup(tabGroup: ComponentSharedTabGroup) {
    return {
      appName: tabGroup.appName,
      title: tabGroup.title,
      icon: tabGroup.icon ?? null,
      tabs: tabGroup.tabs.map((tab) => ({
        appName: tab.appName,
        title: tab.title,
        icon: tab.icon ?? null,
        layout: tab.tabLayout ?? 'side-by-side',
        cards: tab.cards.map((card) => ({
          content: this.mapCardContent(card.content),
        })),
      })),
    }
  }

  /**
   * Nueva función auxiliar para procesar los bloques dentro de una card
   * y concatenar la URL de Strapi si es una imagen.
   */
  private mapCardContent(content: any[]) {
    return content.map((block) => {
      // Verificamos si el bloque es de tipo imagen (según tu interface ComponentSharedCardImageBlock)
      if (block.images && Array.isArray(block.images)) {
        return {
          ...block,
          images: block.images.map((img: any) => ({
            ...img,
            // Concatenamos la URL base si el path es relativo
            url: img.url ? `${env.STRAPI_URL}${img.url}` : null,
          })),
        }
      }
      // Si es un text block u otro tipo, lo devolvemos tal cual
      return block
    })
  }

  /* =======================
     Type guards
     ======================= */

  private isTab(section: PaymentTabContent): section is ComponentSharedTab {
    return 'cards' in section
  }

  private isTabGroup(
    section: PaymentTabContent
  ): section is ComponentSharedTabGroup {
    return 'tabs' in section
  }
}
