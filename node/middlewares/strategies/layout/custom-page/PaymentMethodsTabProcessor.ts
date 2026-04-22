import {
  ComponentSharedTab,
  ComponentSharedTabGroup,
} from '../../../../typings/custompage-response'
import { mapCardContent } from '../../../../utils/card.helper'
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
        content: mapCardContent(card.content),
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
          content: mapCardContent(card.content),
        })),
      })),
    }
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
