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

  async execute(): Promise<void> {
    for (const file of this.files) {

      try {
        const res = await this.ctx.clients.github.createOrUpdateFile(
          `store/blocks/pages/home/${file.filename}`,
          file.content
        )

        if (res?.data?.error) {
          throw res.data.error
        }
      } catch (err: any) {
        throw err
      }

      console.log(`✅ Archivo commiteado`)
    }
  }
}
