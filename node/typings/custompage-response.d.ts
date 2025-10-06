export interface CustomPagesResponse {
  data: CustomPagesData
}

export interface CustomPagesData {
  customPages: CustomPage[]
}

export interface CustomPage {
  content: CustomPageContent[]
}

export interface CustomPageContent {
  id: string
  text: string
}