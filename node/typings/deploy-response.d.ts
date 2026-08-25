export interface DeployResponseSuccess<TData = unknown, TVariables = unknown> {
  success: true
  section: string
  variables?: TVariables | null
  previousSlug?: string | null
  deleted?: boolean
  /** Keys de `routes.json` que se dieron de baja en este deploy. */
  removedRoutes?: string[]
  data: TData
}

export interface DeployResponseError {
  success: false
  error: string
}

export type DeployResponse<TData = unknown, TVariables = unknown> =
  | DeployResponseSuccess<TData, TVariables>
  | DeployResponseError
