import type { NavbarData } from './navbar-response'
import type { CustomPagesData } from './custompage-response'
import type { HomePageData } from './homepage-response'

export interface SectionDataMap {
  navbar: NavbarData
  'custom-page': CustomPagesData
  'home-page': HomePageData
}
