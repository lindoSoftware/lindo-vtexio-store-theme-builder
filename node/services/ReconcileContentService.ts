import type { GeneratedFile } from '../middlewares/commands/BuildJsonCommand'
import { BuildJsonStrategyFactory } from '../middlewares/strategies/builds/BuildJsonStrategyFactory'
import { SectionStrategyFactory } from '../middlewares/strategies/cms/SectionStrategyFactory'
import type { SectionDataMap } from '../typings/sections-map'
import type { StrapiConfig } from './StrapiConfigService'

type Section = keyof SectionDataMap

/** Las tres secciones que el CMS publica. */
const SECTIONS: Section[] = ['navbar', 'home-page', 'custom-page']

/**
 * Lee el CMS entero y arma todos los archivos del theme, reusando las mismas
 * estrategias que usa el deploy incremental.
 */
export class ReconcileContentService {
  public static async build(
    ctx: Context,
    strapi: StrapiConfig
  ): Promise<GeneratedFile[]> {
    // En paralelo: son tres queries independientes. Si una falla, `Promise.all`
    // rechaza y el reconcile entero se aborta sin commitear nada.
    const perSection = await Promise.all(
      SECTIONS.map(async (section) => this.buildSection(ctx, section, strapi))
    )

    return perSection.flat()
  }

  private static async buildSection<TSection extends Section>(
    ctx: Context,
    section: TSection,
    strapi: StrapiConfig
  ): Promise<GeneratedFile[]> {
    // `undefined` como variables es deliberado: el $filters de CUSTOM_PAGE_QUERY
    // queda nulo y Strapi devuelve todas las custom pages, que es lo que hace
    // falta para saber cuáles sobran en el repo. Las otras dos secciones lo
    // ignoran.
    const data = await SectionStrategyFactory.create(section).getData(
      ctx,
      undefined,
      strapi
    )

    return BuildJsonStrategyFactory.create(section, strapi.url).build(data)
  }
}
