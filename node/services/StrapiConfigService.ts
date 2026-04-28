import { SettingsHelper } from '../utils/SettingsHelper'

export class StrapiConfigService {
  static async getStrapiURL(ctx: Context): Promise<string> {
    return new SettingsHelper(ctx).getRequiredSetting('strapiURL')
  }
}
