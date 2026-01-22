import { LayoutBuilder } from '../../../../typings/builder'
import { CUSTOMPAGE_APPNAMES } from './custompage-constants'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'
import { FAQProcessor } from './FAQProcessor'
import { FormProcessor } from './FormProcessor'
import { GroupCardProcessor } from './GroupCardProcessor'
import { PaymentMethodsTabProcessor } from './PaymentMethodsTabProcessor'
import { RichTextProcessor } from './RichTextProcessor'

export class CustomPageBlockProcessorFactory {
  private processors: Map<string, CustomPageBlockProcessor<any>>

  constructor(layoutBuilder: LayoutBuilder, pageSlug: string) {
    const paymentMethodsTabProcessor = new PaymentMethodsTabProcessor(
      layoutBuilder,
      pageSlug
    )

    this.processors = new Map<string, CustomPageBlockProcessor<any>>([
      [
        CUSTOMPAGE_APPNAMES.RICH_TEXT,
        new RichTextProcessor(layoutBuilder, pageSlug),
      ],
      [
        CUSTOMPAGE_APPNAMES.GROUP_CARD,
        new GroupCardProcessor(layoutBuilder, pageSlug),
      ],

      [CUSTOMPAGE_APPNAMES.TAB, paymentMethodsTabProcessor],
      [CUSTOMPAGE_APPNAMES.TAB_GROUP, paymentMethodsTabProcessor],
      [
        CUSTOMPAGE_APPNAMES.FORM,
        new FormProcessor(layoutBuilder, pageSlug),
      ],
      [
        CUSTOMPAGE_APPNAMES.FAQ,
        new FAQProcessor(layoutBuilder, pageSlug),
      ],
    ])
  }

  getProcessor(appName: string): CustomPageBlockProcessor<any> | undefined {
    return this.processors.get(appName)
  }
}
