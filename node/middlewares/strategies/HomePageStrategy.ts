import { ISectionStrategy } from './ISectionStrategy'

export class HomePageStrategy implements ISectionStrategy {
  async getData(ctx: Context) {
    return await ctx.clients.strapiClient.getHomePageContent()
  }
}
