import env from '../../../../env'
import { ImagePuzzleBlock } from '../../../../typings/homepage-response'
import { isWithinDateRange } from '../../../../utils/isWithinDateRange'
import { BlockProcessor } from './BlockProcessor'

export class ImagePuzzleBlockProcessor extends BlockProcessor<ImagePuzzleBlock> {
  process(section: ImagePuzzleBlock, index: number): void {
    if (!isWithinDateRange(section.beginning, section.expiration)) return

    const blockName = `image-puzzle#image-puzzle-${index + 1}`

    this.createBlock(blockName, {
      blockName,
      props: {
        layout: section.layout,
        enableMirroring: section.enableMirroring,
        enableRotation: section.enableRotation,
        images: section.images.map((imageItem) => ({
          link: imageItem.link,
          text: imageItem.text,
          image: {
            url: imageItem.image?.url
              ? `${env.STRAPI_URL}${imageItem.image.url}`
              : '',
          },
          mobileImage: {
            url: imageItem.mobileImage?.url
              ? `${env.STRAPI_URL}${imageItem.mobileImage.url}`
              : '',
          },
        })),
      },
    })

    this.addToHome(blockName)
  }
}
