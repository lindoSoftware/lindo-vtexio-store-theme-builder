import { NavbarData } from '../../../typings/navbar-response'
import { SectionStrategy } from '../../../typings/section-strategy'

export class NavbarStrategy implements SectionStrategy<'navbar'> {
  async getData(ctx: Context): Promise<NavbarData> {
    return await ctx.clients.strapiClient.getNavbarContent()
  }
}
