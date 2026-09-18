import { gitBlobSha } from '../gitBlobSha'

// Los esperados salen de `printf '%s' <contenido> | git hash-object --stdin`.
describe('gitBlobSha', () => {
  it('coincide con git hash-object para un JSON vacío', () => {
    expect(gitBlobSha('{}')).toBe('9e26dfeeb6e641a33dae4961196235bdb965b21b')
  })

  it('coincide con git hash-object para el string vacío', () => {
    expect(gitBlobSha('')).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
  })

  it('coincide con git hash-object para un texto simple', () => {
    expect(gitBlobSha('hola')).toBe('b8b4a4e2a5db3ebed5f5e02beb3e2d27bca9fc9a')
  })

  it('usa la longitud en bytes y no en caracteres', () => {
    // 'ñ' es 1 caracter pero 2 bytes en UTF-8. Con la longitud en caracteres el
    // header sería "blob 1\0" y el hash no coincidiría con el de git.
    expect(gitBlobSha('ñ')).toBe('aa29db9a69df4edb1eabbb5c8c850b813dd4d996')
  })
})
