import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { HomePageData } from '../../../typings/homepage-response'
import { GeneratedFile } from '../../commands/BuildJsonCommand'

export class HomePageBuildJsonStrategy implements BuildJsonStrategy<HomePageData> {
  readonly section = 'home-page' as const

  async build(data: HomePageData): Promise<GeneratedFile[]> {
    const content = `// HomePage JSONC\n${JSON.stringify(data, null, 2)}`
    return [{ filename: 'home-page.jsonc', content }]
  }
}