import { CustomPagesData } from '../../typings/custompage-response'
import { Variables } from '../../typings/request-body'
import { ISectionStrategy } from './ISectionStrategy'

export class CustomPageStrategy implements ISectionStrategy<CustomPagesData> {
  async getData(
    ctx: Context,
    variables?: Variables | null
  ): Promise<CustomPagesData> {
    return await ctx.clients.strapiClient.getCustomPageContent(variables)
  }
}
