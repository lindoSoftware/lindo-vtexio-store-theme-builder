import { LayoutBuilder } from '../../../../typings/builder'
import { CUSTOMPAGE_APPNAMES } from './custompage-constants'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'
import { GroupCardProcessor } from './GroupCardProcessor'
import { RichTextProcessor } from './RichTextProcessor'
import { TabGroupProcessor } from './TabGroupProcessor'

export class CustomPageBlockProcessorFactory {
  private processors: Map<string, CustomPageBlockProcessor<any>>

  constructor(layoutBuilder: LayoutBuilder) {
    this.processors = new Map<string, CustomPageBlockProcessor<any>>([
      [CUSTOMPAGE_APPNAMES.RICH_TEXT, new RichTextProcessor(layoutBuilder)],
      [CUSTOMPAGE_APPNAMES.GROUP_CARD, new GroupCardProcessor(layoutBuilder)],
      [CUSTOMPAGE_APPNAMES.TAB, new TabGroupProcessor(layoutBuilder)],
      [CUSTOMPAGE_APPNAMES.TAB_GROUP, new TabGroupProcessor(layoutBuilder)],
    ])
  }

  getProcessor(appName: string): CustomPageBlockProcessor<any> | undefined {
    return this.processors.get(appName)
  }
}
