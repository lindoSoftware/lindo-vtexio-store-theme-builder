import { Command } from '../../typings/command'
import type { SectionDataMap } from '../../typings/sections-map'
import { BuildJsonStrategyFactory } from '../strategies/builds/BuildJsonStrategyFactory'

export interface GeneratedFile {
  path: string
  filename: string
  content: string
}

export class BuildJsonCommand<
  TSection extends keyof SectionDataMap = keyof SectionDataMap
> extends Command<TSection> {
  public generatedFiles: GeneratedFile[] = []
  private strapiURL: string

  constructor(
    section: TSection,
    data: SectionDataMap[TSection],
    strapiURL: string
  ) {
    super(section, data)
    this.strapiURL = strapiURL
  }

  async execute(): Promise<void> {
    const strategy = BuildJsonStrategyFactory.create(
      this.section,
      this.strapiURL
    )

    this.generatedFiles = await strategy.build(this.data)
  }
}
