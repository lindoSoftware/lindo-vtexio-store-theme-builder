export interface ISectionStrategy {
  getData(ctx: Context): Promise<any>
}
