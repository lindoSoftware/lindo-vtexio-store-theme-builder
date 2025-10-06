import { Variables } from '../../typings/request-body'
import { ISectionStrategy } from './ISectionStrategy'

export class CustomPageStrategy implements ISectionStrategy {
  async getData(ctx: Context, variables?: Variables | null) {
    return await ctx.clients.strapiClient.getCustomPageContent(variables)
  }
}