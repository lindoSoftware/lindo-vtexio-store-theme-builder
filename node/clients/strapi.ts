import { ExternalClient, InstanceOptions, IOContext } from '@vtex/api'
import { HOME_PAGE_QUERY } from '../utils/graphql/queries'
import ENV from '../env'
import { HomePageData } from '../typings/homepage-response'

/**
 * Interfaz genérica para cualquier respuesta GraphQL
 */
interface GraphQLResponse<T> {
  data: T
  errors?: { message: string }[]
}

export class StrapiContentClient extends ExternalClient {
  constructor(ctx: IOContext, opts?: InstanceOptions) {
    super(ENV.STRAPI_GRAPHQL_URL, ctx, {
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
}
