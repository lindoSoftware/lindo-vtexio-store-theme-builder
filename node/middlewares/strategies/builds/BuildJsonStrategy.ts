export interface BuildJsonStrategy<TData> {
  build(data: TData): Promise<void>
}
