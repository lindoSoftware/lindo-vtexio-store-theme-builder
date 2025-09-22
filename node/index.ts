import type { ServiceContext, ParamsContext, RecorderState } from '@vtex/api'
import { LRUCache, Service } from '@vtex/api'
import { Clients } from './clients'
import { MEDIUM_TIMEOUT_MS, RETRIES } from './utils/constants'

// Create a LRU memory cache for the Status client.
// The @vtex/api HttpClient respects Cache-Control headers and uses the provided cache.
const memoryCache = new LRUCache<string, any>({ max: 5000 })

metrics.trackCache('status', memoryCache)

declare global {
  type Context = ServiceContext<Clients, State>

  interface State extends RecorderState {
    code: number
  }
}

export default new Service<Clients, State, ParamsContext>({
  clients: {
    implementation: Clients,
    options: {
      default: {
        retries: RETRIES,
        timeout: MEDIUM_TIMEOUT_MS,
      },
    },
  },
  routes: {},
  graphql: {
    resolvers: {
      Query: {},
    },
  },
})
