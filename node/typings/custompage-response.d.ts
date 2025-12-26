export interface CustomPagesResponse {
  data: CustomPagesData
}

export interface CustomPagesData {
  customPages: CustomPage[]
}

export interface CustomPage {
  slug: string
  path: string
  content: CustomPageContent[]
}

export type CustomPageContent =
  | ComponentSharedGroupCard
  | ComponentSharedTab
  | ComponentSharedTabGroup
  | ComponentSharedRichText

export interface ComponentSharedRichText {
  appName: string
  text: string
}

export interface ComponentSharedGroupCard {
  name: string
  appName: string
  layout?: 'full_width' | 'side_by_side'
  cards: Card[]
}

export interface ComponentSharedTab {
  appName: string
  title: string
  icon: string
  cards: Card[]
}

export interface ComponentSharedTabGroup {
  appName: string
  title: string
  icon: string
  tabs: Tab[]
}

export interface Tab {
  appName: string
  title: string
  icon: string
  cards: Card[]
}

export interface Card {
  content: CardContent[]
}

export type CardContent =
  | ComponentSharedCardTextBlock
  | ComponentSharedCardImageBlock

export interface ComponentSharedCardTextBlock {
  appName: string
  variant: string
  content: string
}

export interface ComponentSharedCardImageBlock {
  appName: string
  images: Image[]
}

export interface Image {
  url: string
}
