import type { NavbarData } from '../../../typings/navbar-response'
import type { SectionStrategy } from '../../../typings/section-strategy'
import { StrapiContentClient } from '../../../clients/strapi'
import type { StrapiConfig } from '../../../services/StrapiConfigService'

export class NavbarStrategy implements SectionStrategy<'navbar'> {
  public async getData(
    ctx: Context,
    _?: any,
    strapi?: StrapiConfig
  ): Promise<NavbarData> {
    const client = new StrapiContentClient(strapi!.url, ctx.vtex, strapi!.token)

    return client.getNavbarContent()
  }
}
