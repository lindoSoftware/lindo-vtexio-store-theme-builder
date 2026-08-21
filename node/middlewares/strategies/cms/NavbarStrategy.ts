import { NavbarData } from '../../../typings/navbar-response'
import { SectionStrategy } from '../../../typings/section-strategy'
import { StrapiContentClient } from '../../../clients/strapi'
import { StrapiConfig } from '../../../services/StrapiConfigService'

export class NavbarStrategy implements SectionStrategy<'navbar'> {
  async getData(ctx: Context, _?: any, strapi?: StrapiConfig): Promise<NavbarData> {
    const client = new StrapiContentClient(strapi!.url, ctx.vtex, strapi!.token)
    return client.getNavbarContent()
  }
}
