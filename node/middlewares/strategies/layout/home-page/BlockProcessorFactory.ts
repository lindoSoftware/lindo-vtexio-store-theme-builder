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

  constructor(layoutBuilder: LayoutBuilder, strapiURL: string) {
    this.processors = new Map<string, BlockProcessor<any>>([
      [HOMEPAGE_APPNAMES.SLIDER, new SliderBlockProcessor(layoutBuilder, strapiURL)],
      [HOMEPAGE_APPNAMES.CLUSTER, new ClusterBlockProcessor(layoutBuilder, strapiURL)],
      [
        HOMEPAGE_APPNAMES.MULTIPLE_STATIC_BANNER,
        new MultipleStaticBannerProcessor(layoutBuilder, strapiURL),
      ],
      [
        HOMEPAGE_APPNAMES.MULTIPLE_IMAGE_SELECTOR,
        new MultipleImageSelectorProcessor(layoutBuilder, strapiURL),
      ],
      [HOMEPAGE_APPNAMES.IMAGE_PUZZLE, new ImagePuzzleBlockProcessor(layoutBuilder, strapiURL)],
    ])
  }

  getProcessor(appName: string): BlockProcessor<any> | undefined {
    return this.processors.get(appName)
  }
}
