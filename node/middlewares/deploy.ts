import type { DeployResponse } from '../typings/deploy-response'
import { Command } from '../typings/command'
import { DeployRequestBody } from '../typings/request-body'
import { readRequestBodyAsJSON } from '../utils/middleware.helper'
import { BuildJsonCommand } from './commands/BuildJsonCommand'
import { SectionStrategyFactory } from './strategies/cms/SectionStrategyFactory'

export async function deploy(ctx: Context, next: () => Promise<any>) {
  try {
    const params = await readRequestBodyAsJSON<DeployRequestBody>(ctx.req)

    const strategy = SectionStrategyFactory.create(params.section)
    const data = await strategy.getData(ctx, params.variables)

    const commands: Command[] = [new BuildJsonCommand(params.section, data)]

    for (const command of commands) await command.execute()

    const response: DeployResponse = {
      success: true,
      section: params.section,
      variables: params.variables ?? null,
      data,
    }

    ctx.status = 200
    ctx.body = response
  } catch (err: any) {
    const response: DeployResponse = {
      success: false,
      error: err.message ?? String(err),
    }

    ctx.status = 500
    ctx.body = response
  }

  await next()
}
