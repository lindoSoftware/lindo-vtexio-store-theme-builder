import { Command } from '../typings/command'
import { readRequestBodyAsJSON } from '../utils/middleware.helper'
import { BuildJsonCommand } from './commands/BuildJsonCommand'

export async function deploy(ctx: Context, next: () => Promise<any>) {
  try {
    let params: { section: string }
    params = await readRequestBodyAsJSON(ctx.req)

    let data
    switch (params.section) {
      case 'home-page':
        data = await ctx.clients.strapiClient.getHomePageContent()
        console.log(JSON.stringify(data.homePage.content, null, 2))
        break
      default:
        break
    }

    const commands: Command[] = [
      new BuildJsonCommand(ctx),
      // new TriggerWorkflowCommand(ctx),
      // new UpdateFileCommand(ctx),
    ]

    for (const command of commands) {
      await command.execute()
    }

    ctx.status = 200
    ctx.body = {
      message: `Deploy iniciado correctamente 🚀 para section: ${params.section}`,
    }
  } catch (err) {
    ctx.status = 500
    ctx.body = { error: err }
  }

  await next()
}
