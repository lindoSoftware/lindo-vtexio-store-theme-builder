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
          appName
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
        }
        ... on ComponentSharedImagePuzzle {
          appName
          id
          layout
          enableMirroring
          enableRotation
          beginning
          expiration
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
    title
    subtitle
    content {
      ... on ComponentSharedGroupCard {
        name
        appName
        cardGroupLayout
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
        tabLayout
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
          tabLayout
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
      ... on ComponentSharedForm {
        appName
        schema
      }
      ... on ComponentSharedFaq {
        appName
        faqs {
          question
          answer
        }
      }
      ... on ComponentSharedBranchSelector {
        appName
        showMap
      }
    }
  }
}
`
