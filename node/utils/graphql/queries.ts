export const HOME_PAGE_QUERY = `
  query HomePage {
    homePage {
      content {
        ... on ComponentSharedSlider {
          height
          preload
          banners {
            desktopImage {
              url
            }
            mobileImage {
              url
            }
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
        ... on ComponentSharedMultipleStaticBanner {
          appName
          staticBanners {
            name
            beginning
            expiration
            columnGap
            rowGap
            banners {
              image {
                url
              }
              mobileImage {
                url
              }
              link
            }
          }
        }
        ... on ComponentSharedMultipleImageSelector {
          id
          imageSelectors {
            name
            title
            beginning
            expiration
            itemsPerPageDesktop
            itemsPerPageTablet
            itemsPerPageMobile
            images {
              link
              text
              image {
                url
              }
              mobileImage {
                url
              }
            }
          }
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
    slug
    path
    content {
      ... on ComponentSharedGroupCard {
        name
        appName
        layout
        cards {
          content {
            ... on ComponentSharedCardTextBlock {
              appName
              variant
              content
            }
            ... on ComponentSharedCardImageBlock {
              appName
              images {
                url
              }
            }
          }
        }
      }
      ... on ComponentSharedTab {
        appName
        title
        icon
        cards {
          content {
            ... on ComponentSharedCardTextBlock {
              appName
              variant
              content
            }
            ... on ComponentSharedCardImageBlock {
              appName
              images {
                url
              }
            }
          }
        }
      }
      ... on ComponentSharedTabGroup {
        appName
        title
        icon
        tabs {
          appName
          title
          icon
          cards {
            content {
              ... on ComponentSharedCardTextBlock {
                appName
                variant
                content
              }
              ... on ComponentSharedCardImageBlock {
                appName
                images {
                  url
                }
              }
            }
          }
        }
      }
      ... on ComponentSharedRichText {
        appName
        text
      }
    }
  }
}
`
