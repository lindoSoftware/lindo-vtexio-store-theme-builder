import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { NavbarData } from '../../../typings/navbar-response'
import { GeneratedFile } from '../../commands/BuildJsonCommand'

export class NavbarBuildJsonStrategy implements BuildJsonStrategy<NavbarData> {
  readonly section = 'navbar' as const

  async build(data: NavbarData): Promise<GeneratedFile[]> {
    const content = `// Navbar JSONC\n${JSON.stringify(data, null, 2)}`
    return [{ filename: 'navbar.jsonc', content }]
  }
}