import { Command } from '../../typings/command'
import type { SectionDataMap } from '../../typings/sections-map'
import { BuildJsonStrategyFactory } from '../strategies/builds/BuildJsonStrategyFactory'

export interface GeneratedFile {
  filename: string
  content: string
}

export class BuildJsonCommand<
  TSection extends keyof SectionDataMap = keyof SectionDataMap
> extends Command<TSection> {
  public generatedFiles: GeneratedFile[] = []

  async execute(): Promise<void> {
    const strategy = BuildJsonStrategyFactory.create(this.section)
    this.generatedFiles = await strategy.build(this.data)
    console.log('archivos generados: ', this.generatedFiles);
  }
}
