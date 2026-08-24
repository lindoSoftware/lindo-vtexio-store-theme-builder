import { SettingsHelper } from './SettingsHelper'

/**
 * Inicializa el cliente de GitHub con el token y el branch configurados en los
 * app settings. Lanza si falta alguno de los dos.
 */
export async function initGitHubClient(ctx: Context): Promise<void> {
  const settings = new SettingsHelper(ctx)

  const token = await settings.getRequiredSetting('githubToken')
  const branch = await settings.getRequiredSetting('githubBranchName')

  await ctx.clients.github.init(token, branch)
}
