import { Command } from '../../typings/command'
import type { SectionDataMap } from '../../typings/sections-map'
import type { GeneratedFile } from './BuildJsonCommand'

export class CommitJsonCommand<
  TSection extends keyof SectionDataMap = keyof SectionDataMap
> extends Command<TSection> {
  private readonly ctx: Context
  private readonly files: GeneratedFile[]

  constructor(
    section: TSection,
    data: SectionDataMap[TSection],
    ctx: Context,
    files: GeneratedFile[]
  ) {
    super(section, data)
    this.ctx = ctx
    this.files = files
  }

  /**
   * Ejecuta el comando principal
   */
  public async execute(): Promise<void> {
    try {
      await this.loadGitHubToken()

      for (const file of this.files) {
        await this.commitFile(file)
      }

      this.ctx.vtex.logger.info({
        message: `[CommitJsonCommand] Successfully committed ${this.files.length} files.`,
      })
    } catch (error: any) {
      this.ctx.vtex.logger.error({
        message: '[CommitJsonCommand] Failed to commit files.',
        error: error.message,
        stack: error.stack,
      })
      throw error
    }
  }

  /**
   * Carga el token desde settings (solo una vez)
   */
  private async loadGitHubToken(): Promise<void> {
    const appId = process.env.VTEX_APP_ID ?? ''

    const settings = await this.ctx.clients.apps.getAppSettings(appId)
    const token = settings?.githubToken

    if (!token) {
      throw new Error('GitHub token not found in app settings')
    }

    await this.ctx.clients.github.init(token)
  }

  /**
   * Crea o actualiza un archivo en GitHub
   */
  private async commitFile(file: GeneratedFile): Promise<void> {
    const filePath = `${file.path}/${file.filename}`

    this.ctx.vtex.logger.info({
      message: `[CommitJsonCommand] Syncing file: ${filePath}`,
    })

    const res = await this.ctx.clients.github.createOrUpdateFile(
      filePath,
      file.content
    )

    if (res?.data?.error) {
      this.ctx.vtex.logger.error({
        message: `[CommitJsonCommand] Error syncing file: ${filePath}`,
        error: res.data.error,
      })
      throw res.data.error
    }

    console.log(res)

    this.ctx.vtex.logger.info({
      message: `[CommitJsonCommand] File ${filePath} ${res.data.action} successfully (status: ${res.status})`,
    })
  }
}
