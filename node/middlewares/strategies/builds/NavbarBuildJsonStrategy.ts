import { BuildJsonStrategy } from './BuildJsonStrategy'
import { NavbarData } from '../../../typings/navbar-response'

export class NavbarBuildJsonStrategy implements BuildJsonStrategy<NavbarData> {
  async build(data: NavbarData): Promise<void> {
    console.log('🔧 Building JSON for Navbar:', data.navbar.links)
    // ... lógica específica
  }
}
