import { IOClients } from '@vtex/api'
import { StrapiContentClient } from './strapi'
import GitHubClient from './github'

export class Clients extends IOClients {
  public get github() {
    return this.getOrSet('github', GitHubClient)
  }

  public get strapiClient() {
    return this.getOrSet('strapiContentClient', StrapiContentClient)
  }
}
