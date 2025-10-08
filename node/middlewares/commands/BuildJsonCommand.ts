import { Command } from '../../typings/command'
import { SectionDataMap } from '../../typings/sections-map'
import { BuildJsonStrategyFactory } from '../strategies/builds/BuildJsonStrategyFactory'

export class BuildJsonCommand<
  TSection extends keyof SectionDataMap = keyof SectionDataMap
> extends Command<TSection> {
  async execute(): Promise<void> {
    const strategy = BuildJsonStrategyFactory.create(this.section)
    await strategy.build(this.data)
  }
}
