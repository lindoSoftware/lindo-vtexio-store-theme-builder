import { Variables } from "../../typings/request-body";

export interface ISectionStrategy {
  getData(ctx: Context, variables?: Variables | null): Promise<any>
}