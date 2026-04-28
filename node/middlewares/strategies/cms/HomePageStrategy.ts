import { HomePageData } from '../../../typings/homepage-response'
import { SectionStrategy } from '../../../typings/section-strategy'
import { StrapiContentClient } from '../../../clients/strapi'

export class HomePageStrategy implements SectionStrategy<'home-page'> {
  async getData(ctx: Context, _?: any, strapiURL?: string): Promise<HomePageData> {
    const client = new StrapiContentClient(strapiURL!, ctx.vtex)
    return client.getHomePageContent()
  }
}