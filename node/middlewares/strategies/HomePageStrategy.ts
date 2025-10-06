import { HomePageData } from '../../typings/homepage-response'
import { ISectionStrategy } from './ISectionStrategy'

export class HomePageStrategy implements ISectionStrategy<HomePageData> {
  async getData(ctx: Context): Promise<HomePageData> {
    return await ctx.clients.strapiClient.getHomePageContent()
  }
}
