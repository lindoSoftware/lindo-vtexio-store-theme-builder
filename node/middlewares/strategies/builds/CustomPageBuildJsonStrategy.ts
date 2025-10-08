import { BuildJsonStrategy } from './BuildJsonStrategy'
import { CustomPagesData } from '../../../typings/custompage-response'

export class CustomPageBuildJsonStrategy
  implements BuildJsonStrategy<CustomPagesData>
{
  async build(data: CustomPagesData): Promise<void> {
    console.log('🧩 Building JSON for Custom Page:', data.customPages)
    // ... lógica específica
  }
}
