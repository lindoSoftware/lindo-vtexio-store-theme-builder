/**
 * Error de request mal formado. `deploy` usa `status` para responder 400 en vez
 * del 500 genérico, así el CMS distingue un error suyo de una falla del servicio.
 */
export class BadRequestError extends Error {
  public readonly status = 400

  constructor(message: string) {
    super(message)
    this.name = 'BadRequestError'
  }
}
