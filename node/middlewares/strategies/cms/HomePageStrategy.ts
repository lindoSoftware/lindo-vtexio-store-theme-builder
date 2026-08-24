import type { HomePageData } from '../../../typings/homepage-response'
import type { SectionStrategy } from '../../../typings/section-strategy'
import { StrapiContentClient } from '../../../clients/strapi'
import type { StrapiConfig } from '../../../services/StrapiConfigService'

export class HomePageStrategy implements SectionStrategy<'home-page'> {
  async getData(
    ctx: Context,
    _?: any,
    strapi?: StrapiConfig
  ): Promise<HomePageData> {
    const client = new StrapiContentClient(strapi!.url, ctx.vtex, strapi!.token)

    return client.getHomePageContent()
  }
}
