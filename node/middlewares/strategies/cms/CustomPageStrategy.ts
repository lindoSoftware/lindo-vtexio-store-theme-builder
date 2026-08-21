import { CustomPagesData } from '../../../typings/custompage-response'
import { SectionStrategy } from '../../../typings/section-strategy'
import { StrapiContentClient } from '../../../clients/strapi'
import { StrapiConfig } from '../../../services/StrapiConfigService'

export class CustomPageStrategy implements SectionStrategy<'custom-page'> {
  async getData(
    ctx: Context,
    variables?: Record<string, unknown> | null,
    strapi?: StrapiConfig
  ): Promise<CustomPagesData> {
    const client = new StrapiContentClient(strapi!.url, ctx.vtex, strapi!.token)
    return client.getCustomPageContent(variables)
  }
}
