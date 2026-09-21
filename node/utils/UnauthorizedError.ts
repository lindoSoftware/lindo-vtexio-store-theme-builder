/**
 * Credencial ausente o incorrecta. `reconcile` lo usa para responder 401 en vez
 * del 500 genérico, así un token mal configurado en Jenkins se distingue de una
 * falla del servicio.
 */
export class UnauthorizedError extends Error {
  public readonly status = 401

  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}
