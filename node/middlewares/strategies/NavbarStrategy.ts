import { ISectionStrategy } from './ISectionStrategy'

export class NavbarStrategy implements ISectionStrategy {
  async getData(ctx: Context) {
    return await ctx.clients.strapiClient.getNavbarContent()
  }
}