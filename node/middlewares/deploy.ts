import type { DeployResponse } from '../typings/deploy-response'
import type { Command } from '../typings/command'
import type { DeployRequestBody } from '../typings/request-body'
import { readRequestBodyAsJSON } from '../utils/middleware.helper'
import { BuildJsonCommand } from './commands/BuildJsonCommand'
import { SectionStrategyFactory } from './strategies/cms/SectionStrategyFactory'
import { CommitJsonCommand } from './commands/CommitJsonCommand'
import { DeleteCustomPageCommand } from './commands/DeleteCustomPageCommand'
import { StrapiConfigService } from '../services/StrapiConfigService'
import type { CustomPagesData } from '../typings/custompage-response'

export async function deploy(ctx: Context, next: () => Promise<any>) {
  try {
    const params = await readRequestBodyAsJSON<DeployRequestBody>(ctx.req)
    const strapi = await StrapiConfigService.getConfig(ctx)

    const strategy = SectionStrategyFactory.create(params.section)
    const data = await strategy.getData(ctx, params.variables, strapi)

    const buildCommand = new BuildJsonCommand(params.section, data, strapi.url)

    await buildCommand.execute()

    const commitCommand = new CommitJsonCommand(
      params.section,
      data,
      ctx,
      buildCommand.generatedFiles
    )

    const commands: Command[] = [commitCommand]

    // Si la página fue renombrada en el CMS hay que borrar la versión vieja.
    // Va después del commit: si publicar la nueva falla, la vieja sigue en pie.
    if (params.section === 'custom-page' && params.previousSlug) {
      commands.push(
        new DeleteCustomPageCommand(
          params.section,
          data as CustomPagesData,
          ctx,
          params.previousSlug
        )
      )
    }

    // Los comandos son una pipeline: cada uno depende del anterior, por eso
    // se ejecutan en serie y no con Promise.all.
    for (const command of commands) {
      // eslint-disable-next-line no-await-in-loop
      await command.execute()
    }

    const response: DeployResponse = {
      success: true,
      section: params.section,
      variables: params.variables ?? null,
      previousSlug: params.previousSlug ?? null,
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
