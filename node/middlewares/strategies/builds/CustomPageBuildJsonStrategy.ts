import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { CustomPagesData } from '../../../typings/custompage-response'
import { GeneratedFile } from '../../commands/BuildJsonCommand'

export class CustomPageBuildJsonStrategy implements BuildJsonStrategy<CustomPagesData> {
  readonly section = 'custom-page' as const

  async build(data: CustomPagesData): Promise<GeneratedFile[]> {
    const content = `// CustomPage JSONC\n${JSON.stringify(data, null, 2)}`
    return [
      {
        path: 'store/blocks/pages/custom',
        filename: 'any.jsonc',
        content,
      }
    ]
  }
}