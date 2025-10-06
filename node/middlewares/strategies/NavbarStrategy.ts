import { NavbarData } from '../../typings/navbar-response'
import { ISectionStrategy } from './ISectionStrategy'

export class NavbarStrategy implements ISectionStrategy<NavbarData> {
  async getData(ctx: Context): Promise<NavbarData> {
    return await ctx.clients.strapiClient.getNavbarContent()
  }
}
