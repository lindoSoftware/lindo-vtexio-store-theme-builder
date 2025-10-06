export const HOME_PAGE_QUERY = `
    query HomePage {
      homePage {
        content {
          ... on ComponentSharedSlider {
            height
            preload
            banners {
              desktopImage { url }
              mobileImage { url }
              link
              beginning
              expiration
            }
            appName
          }
          ... on ComponentSharedCluster {
            title
            type
            typeNumber
            beginning
            expiration
            appName
          }
        }
      }
    }
  `

export const NAVBAR_QUERY = `
query Links {
  navbar {
    links {
      text
      url
      icon
    }
  }
}
`

export const CUSTOM_PAGE_QUERY = `
query CustomPages($filters: CustomPageFiltersInput) {
  customPages(filters: $filters) {
    content {
      ... on ComponentSharedRichText {
        id
        text
      }
    }
  }
}
`