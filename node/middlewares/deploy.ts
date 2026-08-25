import type {
  DeployResponse,
  DeployResponseSuccess,
} from '../typings/deploy-response'
import type { DeployRequestBody } from '../typings/request-body'
import type { CustomPagesData } from '../typings/custompage-response'
import { readRequestBodyAsJSON } from '../utils/middleware.helper'
import { BadRequestError } from '../utils/BadRequestError'
import { BuildJsonCommand } from './commands/BuildJsonCommand'
import { CommitJsonCommand } from './commands/CommitJsonCommand'
import { SectionStrategyFactory } from './strategies/cms/SectionStrategyFactory'
import { StrapiConfigService } from '../services/StrapiConfigService'
import type { CustomPageRemoval } from '../services/CustomPageRemovalService'
import { CustomPageRemovalService } from '../services/CustomPageRemovalService'

export async function deploy(ctx: Context, next: () => Promise<any>) {
  try {
    const params = await readRequestBodyAsJSON<DeployRequestBody>(ctx.req)

    ctx.status = 200
    ctx.body = params.deleted
      ? await removeCustomPage(ctx, params)
      : await publishSection(ctx, params)
  } catch (err: any) {
    const response: DeployResponse = {
      success: false,
      error: err.message ?? String(err),
    }

    // Solo los errores de request propagan su status: un 404/409 de GitHub no
    // tiene que salir como status de este endpoint.
    ctx.status = err instanceof BadRequestError ? err.status : 500
    ctx.body = response
  }

  await next()
}

/**
 * Deploy normal: lee el contenido del CMS, arma los archivos del theme y los
 * commitea.
 */
async function publishSection(
  ctx: Context,
  params: DeployRequestBody
): Promise<DeployResponseSuccess> {
  const strapi = await StrapiConfigService.getConfig(ctx)

  const strategy = SectionStrategyFactory.create(params.section)
  const data = await strategy.getData(ctx, params.variables, strapi)

  const buildCommand = new BuildJsonCommand(params.section, data, strapi.url)

  await buildCommand.execute()

  // Si la página fue renombrada en el CMS hay que sacar del theme la versión
  // vieja. Solo se resuelve qué borrar: lo aplica el commit, en un solo paso
  // junto con el routes.json nuevo.
  const removal =
    params.section === 'custom-page' && params.previousSlug
      ? await CustomPageRemovalService.plan(
          ctx,
          data as CustomPagesData,
          params.previousSlug
        )
      : { routeKeys: [], filePaths: [] }

  const commitCommand = new CommitJsonCommand(
    params.section,
    data,
    ctx,
    buildCommand.generatedFiles,
    removal
  )

  await commitCommand.execute()

  return {
    success: true,
    section: params.section,
    variables: params.variables ?? null,
    previousSlug: params.previousSlug ?? null,
    removedRoutes: removal.routeKeys,
    data,
  }
}

/**
 * La página se eliminó del CMS: no hay nada para publicar, solo hay que sacarla
 * del theme. No se consulta Strapi, así que tampoco hace falta `strapiURL`.
 */
async function removeCustomPage(
  ctx: Context,
  params: DeployRequestBody
): Promise<DeployResponseSuccess> {
  if (params.section !== 'custom-page') {
    throw new BadRequestError(
      `"deleted" solo aplica a la sección custom-page, llegó "${params.section}".`
    )
  }

  if (!params.previousSlug) {
    throw new BadRequestError(
      '"deleted" requiere "previousSlug" con el slug de la página a borrar.'
    )
  }

  // Sin páginas publicadas en este deploy: no hay build ni archivos que commitear.
  const data: CustomPagesData = { customPages: [] }

  const removal: CustomPageRemoval = await CustomPageRemovalService.plan(
    ctx,
    data,
    params.previousSlug
  )

  const commitCommand = new CommitJsonCommand(
    params.section,
    data,
    ctx,
    [],
    removal
  )

  await commitCommand.execute()

  return {
    success: true,
    section: params.section,
    variables: params.variables ?? null,
    previousSlug: params.previousSlug,
    deleted: true,
    removedRoutes: removal.routeKeys,
    data,
  }
}
