import { ExternalClient, InstanceOptions, IOContext } from '@vtex/api'

export class GitHubClient extends ExternalClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super('https://api.github.com', context, options)
  }

  public async updateFile(owner: string, repo: string, path: string, content: string, message: string, branch = 'main') {
    const token = process.env.GITHUB_TOKEN as string
    const url = `/repos/${owner}/${repo}/contents/${path}`

    return this.http.put(
      url,
      {
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )
  }

  public async triggerWorkflow(owner: string, repo: string) {
    const token = process.env.GITHUB_TOKEN as string
    const url = `/repos/${owner}/${repo}/dispatches`

    return this.http.post(
      url,
      {
        event_type: 'deploy-from-vtex',
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )
  }
}
