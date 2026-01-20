export interface CustomPagesResponse {
  data: CustomPagesData
}

export interface CustomPagesData {
  customPages: CustomPage[]
}

export interface CustomPage {
  slug: string
  path: string
  title: string
  subtitle?: string
  content: CustomPageContent[]
}

export type CustomPageContent =
  | ComponentSharedGroupCard
  | ComponentSharedTab
  | ComponentSharedTabGroup
  | ComponentSharedRichText
  | ComponentSharedForm

export interface ComponentSharedRichText {
  appName: string
  text: string
}

export interface ComponentSharedGroupCard {
  name: string
  appName: string
  cardGroupLayout?: 'full_width' | 'side_by_side'
  cards: Card[]
}

export interface ComponentSharedTab {
  appName: string
  title: string
  icon: string
  tabLayout?: 'full_width' | 'side_by_side'
  cards: Card[]
}

export interface ComponentSharedTabGroup {
  appName: string
  title: string
  icon: string
  tabs: ComponentSharedTab[]
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

export interface ComponentSharedForm {
  appName: string
  schema: {
    name: string
    schema: JSONSchema
  }
}

export interface JSONSchema {
  title?: string
  type: 'object'
  properties: {
    [key: string]: {
      type: string
      title?: string
      description?: string
      format?: string
      pattern?: string
      minLength?: number
      maxLength?: number
      enum?: string[]
    }
  }
  required?: string[]
}