export interface ReconcileResponseSuccess {
  success: true
  /** `false` cuando el repo ya coincidía con el CMS y no hubo commit. */
  committed: boolean
  commitSha: string | null
  files: {
    /** Paths que cambiaron y se escribieron. */
    written: string[]
    /** Custom pages huérfanas que se borraron. */
    deleted: string[]
  }
  routes: {
    /** Keys de `routes.json` publicadas después del reconcile. */
    final: string[]
    /** Keys que se dieron de baja. */
    removed: string[]
  }
}

export interface ReconcileResponseError {
  success: false
  error: string
}

export type ReconcileResponse =
  | ReconcileResponseSuccess
  | ReconcileResponseError
