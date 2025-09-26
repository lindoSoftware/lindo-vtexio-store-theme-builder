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
