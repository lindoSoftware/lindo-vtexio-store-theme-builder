import { LayoutBuilder } from '../../../../typings/builder'
import { CUSTOMPAGE_APPNAMES } from './custompage-constants'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'
import { GroupCardProcessor } from './GroupCardProcessor'
import { RichTextProcessor } from './RichTextProcessor'
import { TabGroupProcessor } from './TabGroupProcessor'
import { TabProcessor } from './TabProcessor'

export class CustomPageBlockProcessorFactory {
  private processors: Map<string, CustomPageBlockProcessor<any>>

  constructor(layoutBuilder: LayoutBuilder, pageSlug: string) {
    this.processors = new Map<string, CustomPageBlockProcessor<any>>([
      [CUSTOMPAGE_APPNAMES.RICH_TEXT, new RichTextProcessor(layoutBuilder, pageSlug)],
      [CUSTOMPAGE_APPNAMES.GROUP_CARD, new GroupCardProcessor(layoutBuilder, pageSlug)],
      [CUSTOMPAGE_APPNAMES.TAB, new TabProcessor(layoutBuilder, pageSlug)],
      [CUSTOMPAGE_APPNAMES.TAB_GROUP, new TabGroupProcessor(layoutBuilder, pageSlug)],
    ])
  }

  getProcessor(appName: string): CustomPageBlockProcessor<any> | undefined {
    return this.processors.get(appName)
  }
}
