import { LayoutBuilder } from '../../../../typings/builder'
import { HOMEPAGE_APPNAMES } from '../../../../utils/homepage-constants'
import { BlockProcessor } from './BlockProcessor'
import { ClusterBlockProcessor } from './ClusterBlockProcessor'
import { ImagePuzzleBlockProcessor } from './ImagePuzzleBlockProcessor'
import { MultipleImageSelectorProcessor } from './MultipleImageSelectorProcessor'
import { MultipleStaticBannerProcessor } from './MultipleStaticBannerProcessor'
import { SliderBlockProcessor } from './SliderBlockProcessor'

export class BlockProcessorFactory {
  private processors: Map<string, BlockProcessor<any>>

  constructor(layoutBuilder: LayoutBuilder) {
    this.processors = new Map<string, BlockProcessor<any>>([
      [HOMEPAGE_APPNAMES.SLIDER, new SliderBlockProcessor(layoutBuilder)],
      [HOMEPAGE_APPNAMES.CLUSTER, new ClusterBlockProcessor(layoutBuilder)],
      [
        HOMEPAGE_APPNAMES.MULTIPLE_STATIC_BANNER,
        new MultipleStaticBannerProcessor(layoutBuilder),
      ],
      [
        HOMEPAGE_APPNAMES.MULTIPLE_IMAGE_SELECTOR,
        new MultipleImageSelectorProcessor(layoutBuilder),
      ],
      [HOMEPAGE_APPNAMES.IMAGE_PUZZLE, new ImagePuzzleBlockProcessor(layoutBuilder)],
    ])
  }

  getProcessor(appName: string): BlockProcessor<any> | undefined {
    return this.processors.get(appName)
  }
}
