import { normalizeRepoPath } from '../normalizeRepoPath'

describe('normalizeRepoPath', () => {
  it('colapsa barras repetidas', () => {
    expect(normalizeRepoPath('store/blocks//pages///custom/x.jsonc')).toBe(
      'store/blocks/pages/custom/x.jsonc'
    )
  })

  it('saca la barra inicial', () => {
    expect(normalizeRepoPath('/store/routes.json')).toBe('store/routes.json')
  })

  it('saca la barra inicial que queda al colapsar', () => {
    expect(normalizeRepoPath('//store/routes.json')).toBe('store/routes.json')
  })

  it('deja igual un path que ya está limpio', () => {
    expect(normalizeRepoPath('store/routes.json')).toBe('store/routes.json')
  })

  it('es idempotente', () => {
    const once = normalizeRepoPath('//store//routes.json')

    expect(normalizeRepoPath(once)).toBe(once)
  })

  it('soporta el string vacío', () => {
    expect(normalizeRepoPath('')).toBe('')
  })
})
