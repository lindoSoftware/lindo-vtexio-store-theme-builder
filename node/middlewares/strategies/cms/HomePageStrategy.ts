import { HomePageData } from '../../../typings/homepage-response'
import { SectionStrategy } from '../../../typings/section-strategy'

export class HomePageStrategy implements SectionStrategy<'home-page'> {
  async getData(ctx: Context): Promise<HomePageData> {
    return await ctx.clients.strapiClient.getHomePageContent()
  }
}