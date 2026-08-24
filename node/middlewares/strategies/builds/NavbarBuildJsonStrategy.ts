import type { BuildJsonStrategy } from './BuildJsonStrategy'
import type { NavbarData } from '../../../typings/navbar-response'
import type { GeneratedFile } from '../../commands/BuildJsonCommand'

export class NavbarBuildJsonStrategy implements BuildJsonStrategy<NavbarData> {
  public readonly section = 'navbar' as const

  public async build(data: NavbarData): Promise<GeneratedFile[]> {
    const layoutJson: Record<string, any> = {
      'custom-navbar': {
        props: { items: [] },
      },
    }

    for (const item of data.navbar.links) {
      layoutJson['custom-navbar'].props.items.push({
        text: item.text,
        link: item.url,
        icon: item.icon,
      })
    }

    const content = JSON.stringify(layoutJson, null, 2)
    const files: GeneratedFile[] = [
      {
        path: 'store/blocks/header',
        filename: 'custom-navbar.jsonc',
        content,
      },
    ]

    return files
  }
}
