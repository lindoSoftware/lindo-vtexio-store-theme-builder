export interface NavbarResponse {
  data: Data
}

export interface NavbarData {
  navbar: Navbar
}

export interface Navbar {
  links: NavbarLink[]
}

export interface NavbarLink {
  text: string
  url: string
  icon: string
}
