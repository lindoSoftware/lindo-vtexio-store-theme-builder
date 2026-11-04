import { pageHeaderClass } from '../pageHeaderClass'

describe('pageHeaderClass', () => {
  it('deja la clase sola en las páginas de texto', () => {
    expect(
      pageHeaderClass('custom-page-title', [
        { appName: 'RichText' },
        { appName: 'FAQ' },
      ])
    ).toBe('custom-page-title')
  })

  it('agrega custom-page-wide si la página tiene un Branch Selector', () => {
    expect(
      pageHeaderClass('custom-page-subtitle', [{ appName: 'BranchSelector' }])
    ).toEqual(['custom-page-subtitle', 'custom-page-wide'])
  })

  it('tolera una página sin contenido', () => {
    expect(pageHeaderClass('custom-page-title', undefined)).toBe(
      'custom-page-title'
    )
  })
})
