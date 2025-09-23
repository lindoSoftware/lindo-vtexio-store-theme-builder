import { IOClients } from '@vtex/api'
import { GitHubClient } from './github'

export class Clients extends IOClients {
  public get github() {
    return this.getOrSet('github', GitHubClient)
  }
}