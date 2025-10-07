import { CustomPagesData } from '../../../typings/custompage-response'
import { SectionStrategy } from '../../../typings/section-strategy'

export class CustomPageStrategy implements SectionStrategy<'custom-page'> {
  async getData(ctx: Context, variables?: Record<string, unknown> | null): Promise<CustomPagesData> {
    return await ctx.clients.strapiClient.getCustomPageContent(variables)
  }
}
