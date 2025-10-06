export interface DeployResponseSuccess<TData = unknown, TVariables = unknown> {
  success: true
  section: string
  variables?: TVariables | null
  data: TData
}

export interface DeployResponseError {
  success: false
  error: string
}

export type DeployResponse<TData = unknown, TVariables = unknown> =
  | DeployResponseSuccess<TData, TVariables>
  | DeployResponseError
