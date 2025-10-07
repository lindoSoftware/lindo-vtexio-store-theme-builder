import { Command } from '../../typings/command'
import { SectionDataMap } from '../../typings/sections-map'

export class UpdateFileCommand<
  TSection extends keyof SectionDataMap = keyof SectionDataMap
> extends Command<TSection> {
  async execute(): Promise<void> {
    console.log('🧱 Construyendo JSON para data:', this.data)
  }
}
