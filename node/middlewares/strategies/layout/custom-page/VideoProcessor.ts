import type { ComponentSharedVideo } from '../../../../typings/custompage-response'
import { CustomPageBlockProcessor } from './CustomPageBlockProcessor'

const VIDEO_BLOCK_CLASS = 'custom-page-video'

// Permisos que pide el embed de YouTube (incluye pantalla completa)
const YOUTUBE_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen'

/**
 * URL para embeber un video. Acepta los links de YouTube que se copian del
 * navegador (watch?v=, youtu.be, shorts, embed); cualquier otra URL se deja
 * tal cual.
 */
export const embedUrl = (url: string): string => {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  )

  return match ? `https://www.youtube.com/embed/${match[1]}` : url.trim()
}

export class VideoProcessor extends CustomPageBlockProcessor<ComponentSharedVideo> {
  public process(
    section: ComponentSharedVideo,
    pageKey: string,
    index: number
  ): void {
    // Página -> Row -> Col del video (iframe) + Col del texto (opcional)
    const rowBlock = this.generateBlockName('flex-layout.row', `video-${index}`)
    const mediaBlock = this.generateBlockName(
      'flex-layout.col',
      `video-media-${index}`
    )
    const iframeBlock = this.generateBlockName('iframe', `video-${index}`)

    this.addToPage(pageKey, rowBlock)

    this.createBlock(iframeBlock, {
      blockName: iframeBlock,
      props: {
        src: embedUrl(section.url),
        title: section.title ?? 'Video',
        allow: YOUTUBE_ALLOW,
        // vtex.iframe no tiene handle para el <iframe>: lo estiran clases de
        // tachyons dentro del contenedor 16:9 (vtex.iframe.css del theme)
        className: 'absolute top-0 left-0 w-100 h-100',
        blockClass: VIDEO_BLOCK_CLASS,
      },
    })

    this.createBlock(mediaBlock, {
      blockName: mediaBlock,
      children: [iframeBlock],
      props: { blockClass: 'custom-page-video-media' },
    })

    const children = [mediaBlock]
    const textChildren: string[] = []

    if (section.title) {
      const titleBlock = this.generateBlockName(
        'rich-text',
        `video-title-${index}`
      )

      this.createBlock(titleBlock, {
        blockName: titleBlock,
        props: { text: section.title, blockClass: 'custom-page-video-title' },
      })
      textChildren.push(titleBlock)
    }

    if (section.description) {
      const descriptionBlock = this.generateBlockName(
        'rich-text',
        `video-description-${index}`
      )

      this.createBlock(descriptionBlock, {
        blockName: descriptionBlock,
        props: {
          text: section.description,
          blockClass: 'custom-page-video-description',
        },
      })
      textChildren.push(descriptionBlock)
    }

    if (textChildren.length) {
      const textBlock = this.generateBlockName(
        'flex-layout.col',
        `video-text-${index}`
      )

      this.createBlock(textBlock, {
        blockName: textBlock,
        children: textChildren,
        props: { blockClass: 'custom-page-video-text' },
      })
      children.push(textBlock)
    }

    this.createBlock(rowBlock, {
      blockName: rowBlock,
      children,
      props: { blockClass: VIDEO_BLOCK_CLASS },
    })
  }
}
