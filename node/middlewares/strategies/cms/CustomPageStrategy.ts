import { CustomPagesData } from '../../../typings/custompage-response'
import { SectionStrategy } from '../../../typings/section-strategy'
import { StrapiContentClient } from '../../../clients/strapi'

export class CustomPageStrategy implements SectionStrategy<'custom-page'> {
  async getData(ctx: Context, variables?: Record<string, unknown> | null, strapiURL?: string): Promise<CustomPagesData> {
    const client = new StrapiContentClient(strapiURL!, ctx.vtex)
    return client.getCustomPageContent(variables)
  }
}
