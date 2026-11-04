import { VtexLayoutBuilder } from '../../VtexLayoutBuilder'
import { embedUrl, VideoProcessor } from '../VideoProcessor'

describe('embedUrl', () => {
  it('convierte los links de YouTube al embed', () => {
    const embed = 'https://www.youtube.com/embed/UcpVUzRjXbw'

    expect(embedUrl('https://www.youtube.com/watch?v=UcpVUzRjXbw')).toBe(embed)
    expect(
      embedUrl('https://www.youtube.com/watch?feature=share&v=UcpVUzRjXbw')
    ).toBe(embed)
    expect(embedUrl('https://youtu.be/UcpVUzRjXbw?si=abc')).toBe(embed)
    expect(embedUrl('https://www.youtube.com/shorts/UcpVUzRjXbw')).toBe(embed)
    expect(embedUrl('https://www.youtube.com/embed/UcpVUzRjXbw')).toBe(embed)
  })

  it('deja tal cual una URL que no es de YouTube', () => {
    expect(embedUrl(' https://player.vimeo.com/video/1 ')).toBe(
      'https://player.vimeo.com/video/1'
    )
  })
})

describe('VideoProcessor', () => {
  const pageKey = 'store.custom#como-comprar'

  function build(title?: string, description?: string) {
    const builder = new VtexLayoutBuilder()

    builder.initializePage(pageKey)
    new VideoProcessor(builder, 'como-comprar', '').process(
      {
        appName: 'Video',
        url: 'https://www.youtube.com/watch?v=UcpVUzRjXbw',
        title,
        description,
      },
      pageKey,
      1
    )

    return builder.build()
  }

  it('arma el iframe 16:9 y el texto al lado', () => {
    const layout = build('Comodin en Casa', 'Aprovechá tus tarjetas')

    expect(layout[pageKey].blocks).toContain(
      'flex-layout.row#como-comprar-video-1'
    )
    expect(layout['flex-layout.row#como-comprar-video-1'].children).toEqual([
      'flex-layout.col#como-comprar-video-media-1',
      'flex-layout.col#como-comprar-video-text-1',
    ])
    expect(layout['iframe#como-comprar-video-1'].props).toMatchObject({
      src: 'https://www.youtube.com/embed/UcpVUzRjXbw',
      title: 'Comodin en Casa',
      className: 'absolute top-0 left-0 w-100 h-100',
      blockClass: 'custom-page-video',
    })
    expect(
      layout['flex-layout.col#como-comprar-video-text-1'].children
    ).toEqual([
      'rich-text#como-comprar-video-title-1',
      'rich-text#como-comprar-video-description-1',
    ])
  })

  it('sin título ni texto queda solo el video', () => {
    const layout = build()

    expect(layout['flex-layout.row#como-comprar-video-1'].children).toEqual([
      'flex-layout.col#como-comprar-video-media-1',
    ])
    expect(layout['iframe#como-comprar-video-1'].props.title).toBe('Video')
  })
})
