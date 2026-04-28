import { NavbarData } from '../../../typings/navbar-response'
import { SectionStrategy } from '../../../typings/section-strategy'
import { StrapiContentClient } from '../../../clients/strapi'

export class NavbarStrategy implements SectionStrategy<'navbar'> {
  async getData(ctx: Context, _?: any, strapiURL?: string): Promise<NavbarData> {
    const client = new StrapiContentClient(strapiURL!, ctx.vtex)
    return client.getNavbarContent()
  }
}
