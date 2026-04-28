import { ExternalClient, InstanceOptions, IOContext } from '@vtex/api'
import { CUSTOM_PAGE_QUERY, HOME_PAGE_QUERY, NAVBAR_QUERY } from '../utils/graphql/queries'
import { HomePageData } from '../typings/homepage-response'
import { NavbarData } from '../typings/navbar-response'
import { CustomPagesData } from '../typings/custompage-response'

/**
 * Interfaz genérica para cualquier respuesta GraphQL
 */
interface GraphQLResponse<T> {
  data: T
  errors?: { message: string }[]
}

export class StrapiContentClient extends ExternalClient {
  constructor(baseUrl: string, ctx: IOContext, opts?: InstanceOptions) {
    super(`${baseUrl}/graphql/`, ctx, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  private async request<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    try {
      const response = await this.http.post<GraphQLResponse<T>>('', {
        query,
        variables,
      })

      // Validar errores GraphQL
      if (response.errors?.length) {
        throw new Error(
          `GraphQL errors: ${JSON.stringify(response.errors, null, 2)}`
        )
      }

      // Validar data vacía
      if (!response.data) {
        throw new Error(`Empty GraphQL response: ${JSON.stringify(response)}`)
      }

      return response.data
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error)
      throw new Error(`Error executing Strapi GraphQL query: ${message}`)
    }
  }

  public async getHomePageContent(): Promise<HomePageData> {
    return this.request<HomePageData>(HOME_PAGE_QUERY)
  }

  public async getNavbarContent(): Promise<NavbarData> {
    return this.request<NavbarData>(NAVBAR_QUERY)
  }

  public async getCustomPageContent(variables?: any): Promise<CustomPagesData> {
    return this.request<CustomPagesData>(CUSTOM_PAGE_QUERY, variables)
  }
}
