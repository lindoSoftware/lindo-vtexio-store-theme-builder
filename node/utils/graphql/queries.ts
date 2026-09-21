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

// `pagination` es explícita a propósito: sin ella, Strapi aplica su default de
// 10 resultados (el plugin de GraphQL no define `defaultLimit`, así que cae al
// `STRAPI_DEFAULTS.offset.limit` de `@strapi/utils`; el `defaultLimit: 25` de
// `config/api.ts` es de `rest` y la query GraphQL nunca lo lee). Un `$filters`
// nulo (todas las páginas, ver `ReconcileContentService`) por sí solo NO
// alcanza para traerlas todas si son más de 10.
//
// `limit: -1` no sirve como "sin límite" acá, aunque el `maxLimit: -1` del
// plugin sugiera lo contrario: se verificó que ese -1 llega intacto hasta la
// query engine y de ahí a la cláusula SQL `LIMIT` (con este proyecto en MySQL,
// vía knex + mysql2). El truco de "-1 = sin límite" es una idiosincrasia de
// SQLite que el compilador de knex para MySQL no replica; ahí un `LIMIT`
// negativo es simplemente inválido. Por eso se usa el entero más grande que
// el scalar `Int` de GraphQL admite (2^31 - 1) como techo seguro: muy por
// debajo de lo que MySQL acepta en `LIMIT`, y muy por arriba de cualquier
// cantidad real de custom pages.
export const CUSTOM_PAGE_QUERY = `
query CustomPages($filters: CustomPageFiltersInput) {
  customPages(filters: $filters, pagination: { limit: 2147483647 }) {
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
