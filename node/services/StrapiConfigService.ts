import { SettingsHelper } from '../utils/SettingsHelper'

export interface StrapiConfig {
  url: string
  /** Read-only API Token de Strapi. Opcional: sin él se usa el rol Public. */
  token?: string
}

export class StrapiConfigService {
  static async getConfig(ctx: Context): Promise<StrapiConfig> {
    const settings = new SettingsHelper(ctx)

    return {
      url: await settings.getRequiredSetting('strapiURL'),
      token: await settings.getSetting('strapiToken'),
    }
  }
}
