import { IOClients } from '@vtex/api'
import { GitHubClient } from './github'
import { StrapiContentClient } from './strapi'

export class Clients extends IOClients {
  public get github() {
    return this.getOrSet('github', GitHubClient)
  }

  public get strapiClient() {
    return this.getOrSet('strapiContentClient', StrapiContentClient)
  }
}
