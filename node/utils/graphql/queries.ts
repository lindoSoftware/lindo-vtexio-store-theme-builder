// Las listas anidadas (banners, images, cards, faqs, steps, tabs, links…) llevan
// `pagination` explícita por lo mismo que `customPages` (ver el comentario de
// CUSTOM_PAGE_QUERY): sin ella Strapi corta en 10 sin avisar.
export const HOME_PAGE_QUERY = `
  query HomePage {
    homePage {
      content {
        ... on ComponentSharedSlider {
          height
          preload
          banners(pagination: { limit: 2147483647 }) {
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
          staticBanners(pagination: { limit: 2147483647 }) {
            name
            beginning
            expiration
            columnGap
            rowGap
            banners(pagination: { limit: 2147483647 }) {
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
          imageSelectors(pagination: { limit: 2147483647 }) {
            name
            title
            beginning
            expiration
            itemsPerPageDesktop
            itemsPerPageTablet
            itemsPerPageMobile
            images(pagination: { limit: 2147483647 }) {
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
          images(pagination: { limit: 2147483647 }) {
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
    links(pagination: { limit: 2147483647 }) {
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
        cards(pagination: { limit: 2147483647 }) {
          content {
            ... on ComponentSharedCardTextBlock {
              appName
              variant
              content
            }
            ... on ComponentSharedCardImageBlock {
              appName
              images(pagination: { limit: 2147483647 }) {
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
        cards(pagination: { limit: 2147483647 }) {
          content {
            ... on ComponentSharedCardTextBlock {
              appName
              variant
              content
            }
            ... on ComponentSharedCardImageBlock {
              appName
              images(pagination: { limit: 2147483647 }) {
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
        tabs(pagination: { limit: 2147483647 }) {
          appName
          title
          icon
          tabLayout
          cards(pagination: { limit: 2147483647 }) {
            content {
              ... on ComponentSharedCardTextBlock {
                appName
                variant
                content
              }
              ... on ComponentSharedCardImageBlock {
                appName
                images(pagination: { limit: 2147483647 }) {
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
        faqs(pagination: { limit: 2147483647 }) {
          question
          answer
        }
      }
      ... on ComponentSharedBranchSelector {
        appName
        showMap
      }
      ... on ComponentSharedSteps {
        appName
        steps(pagination: { limit: 2147483647 }) {
          icon {
            url
            alternativeText
          }
          title
          text
        }
      }
      ... on ComponentSharedVideo {
        appName
        url
        # Alias: Tab.title es String! y Video.title es String; sin él GraphQL
        # rechaza la query entera por conflicto de tipos.
        videoTitle: title
        description
      }
    }
  }
}
`
