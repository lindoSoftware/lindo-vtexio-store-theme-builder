export type AppSettings = {
  githubToken: string
  githubBranchName: string
  strapiURL: string
  strapiToken?: string
}

export class SettingsHelper {
  constructor(private ctx: Context) {}

  private async getSettings(): Promise<AppSettings> {
    const appId = process.env.VTEX_APP_ID ?? ''

    return this.ctx.clients.apps.getAppSettings(appId)
  }

  public async getSetting<K extends keyof AppSettings>(
    key: K
  ): Promise<AppSettings[K] | undefined> {
    const settings = await this.getSettings()

    return settings?.[key]
  }

  public async getRequiredSetting<K extends keyof AppSettings>(
    key: K,
    errorMessage?: string
  ): Promise<AppSettings[K]> {
    const value = await this.getSetting(key)

    if (value === undefined || value === null || value === '') {
      throw new Error(
        errorMessage ?? `Missing required setting: ${String(key)}`
      )
    }

    return value
  }
}
