import type { LayoutBuilder } from '../../../../typings/builder'
import { BranchSelectorProcessor } from './BranchSelectorProcessor'
import { CUSTOMPAGE_APPNAMES } from './custompage-constants'
import type { CustomPageBlockProcessor } from './CustomPageBlockProcessor'
import { FAQProcessor } from './FAQProcessor'
import { FormProcessor } from './FormProcessor'
import { GroupCardProcessor } from './GroupCardProcessor'
import { PaymentMethodsTabProcessor } from './PaymentMethodsTabProcessor'
import { RichTextProcessor } from './RichTextProcessor'

export class CustomPageBlockProcessorFactory {
  private processors: Map<string, CustomPageBlockProcessor<any>>

  constructor(
    layoutBuilder: LayoutBuilder,
    pageSlug: string,
    strapiURL: string
  ) {
    const paymentMethodsTabProcessor = new PaymentMethodsTabProcessor(
      layoutBuilder,
      pageSlug,
      strapiURL
    )

    this.processors = new Map<string, CustomPageBlockProcessor<any>>([
      [
        CUSTOMPAGE_APPNAMES.RICH_TEXT,
        new RichTextProcessor(layoutBuilder, pageSlug, strapiURL),
      ],
      [
        CUSTOMPAGE_APPNAMES.GROUP_CARD,
        new GroupCardProcessor(layoutBuilder, pageSlug, strapiURL),
      ],

      [CUSTOMPAGE_APPNAMES.TAB, paymentMethodsTabProcessor],
      [CUSTOMPAGE_APPNAMES.TAB_GROUP, paymentMethodsTabProcessor],
      [
        CUSTOMPAGE_APPNAMES.FORM,
        new FormProcessor(layoutBuilder, pageSlug, strapiURL),
      ],
      [
        CUSTOMPAGE_APPNAMES.FAQ,
        new FAQProcessor(layoutBuilder, pageSlug, strapiURL),
      ],
      [
        CUSTOMPAGE_APPNAMES.BRANCH_SELECTOR,
        new BranchSelectorProcessor(layoutBuilder, pageSlug, strapiURL),
      ],
    ])
  }

  getProcessor(appName: string): CustomPageBlockProcessor<any> | undefined {
    return this.processors.get(appName)
  }
}
