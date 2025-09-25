import { Command } from '../typings/command'
import { BuildJsonCommand } from './commands/BuildJsonCommand'
import { Clients } from '../clients'
import { ServiceContext } from '@vtex/api'
import { DeployState } from '../typings/context'

type DeployContext = ServiceContext<Clients, DeployState>
type Context = DeployContext & { body: any; clients: any; state: DeployState }

export async function deploy(ctx: Context, next: () => Promise<any>) {
  try {
    const commands: Command[] = [
      new BuildJsonCommand(ctx),
      // new UpdateFileCommand(ctx),
      // new TriggerWorkflowCommand(ctx),
    ]

    for (const command of commands) {
      await command.execute()
    }

    ctx.status = 200
    ctx.body = { message: 'Deploy iniciado correctamente 🚀' }
  } catch (err) {
    ctx.status = 500
    ctx.body = { error: err }
  }

  await next()
}
