import { Command } from '../typings/command'
import { readRequestBodyAsJSON } from '../utils/middleware.helper'
import { BuildJsonCommand } from './commands/BuildJsonCommand'
import { SectionStrategyFactory } from './strategies/SectionStrategyFactory'

export async function deploy(ctx: Context, next: () => Promise<any>) {
  try {
    const params = await readRequestBodyAsJSON<{ section: string }>(ctx.req)
    const strategy = SectionStrategyFactory.create(params.section)
    const data = await strategy.getData(ctx)
    ctx.body = { data }

    const commands: Command[] = [
      new BuildJsonCommand(ctx),
      // new TriggerWorkflowCommand(ctx),
      // new UpdateFileCommand(ctx),
    ]

    for (const command of commands) {
      await command.execute()
    }

    ctx.status = 200
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message ?? err }
  }

  await next()
}
