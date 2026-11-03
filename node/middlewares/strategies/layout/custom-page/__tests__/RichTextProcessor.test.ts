import { VtexLayoutBuilder } from '../../VtexLayoutBuilder'
import { RichTextProcessor } from '../RichTextProcessor'

describe('RichTextProcessor', () => {
  it('genera el rich text con el blockClass de las custom pages', () => {
    const builder = new VtexLayoutBuilder()
    const pageKey = 'store.custom#terminos-y-condiciones'

    builder.initializePage(pageKey)
    new RichTextProcessor(builder, 'terminos-y-condiciones', '').process(
      { appName: 'RichText', text: '## 1. Introducción' },
      pageKey,
      0
    )

    const layout = builder.build()
    const block = layout['rich-text#terminos-y-condiciones-0']

    expect(layout[pageKey].blocks).toContain('rich-text#terminos-y-condiciones-0')
    expect(block.props).toEqual({
      text: '## 1. Introducción',
      blockClass: 'custom-page-content',
    })
  })
})
