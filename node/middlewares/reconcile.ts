import type {
  ReconcileResponse,
  ReconcileResponseSuccess,
} from '../typings/reconcile-response'
import { ReconcileContentService } from '../services/ReconcileContentService'
import { ReconcilePlanService } from '../services/ReconcilePlanService'
import { StrapiConfigService } from '../services/StrapiConfigService'
import { initGitHubClient } from '../utils/github.helper'

/**
 * Deja el store theme exactamente en el estado que publica el CMS.
 *
 * A diferencia de `/_v/deploy`, que regenera una sección, acá se lee todo y se
 * escribe todo: es lo que corrige el drift que el incremental acumula cuando un
 * trigger no corre o un rename pierde su `previousSlug`.
 */
export async function reconcile(ctx: Context, next: () => Promise<any>) {
  try {
    ctx.status = 200
    ctx.body = await run(ctx)
  } catch (err: any) {
    const response: ReconcileResponse = {
      success: false,
      error: err.message ?? String(err),
    }

    ctx.status = 500
    ctx.body = response
  }

  await next()
}

async function run(ctx: Context): Promise<ReconcileResponseSuccess> {
  const strapi = await StrapiConfigService.getConfig(ctx)

  // Todo el CMS se lee y se buildea en memoria antes de tocar GitHub: si algo
  // falla acá, el repo queda exactamente como estaba.
  const generated = await ReconcileContentService.build(ctx, strapi)

  await initGitHubClient(ctx)

  const plan = await ReconcilePlanService.plan(ctx, generated)

  const report = {
    success: true as const,
    files: {
      written: plan.upserts.map((file) => file.path),
      deleted: plan.deletions,
    },
    routes: { final: plan.routesFinal, removed: plan.routesRemoved },
  }

  if (!plan.upserts.length && !plan.deletions.length) {
    ctx.vtex.logger.info({
      message: '[reconcile] El theme ya coincide con el CMS. Sin commit.',
    })

    return { ...report, committed: false, commitSha: null }
  }

  // Única constancia de QUÉ se borró más allá del body del response: el log
  // de Jenkins de esta noche es lo único que sobrevive para auditar un
  // borrado sorpresa.
  if (plan.deletions.length || plan.routesRemoved.length) {
    ctx.vtex.logger.warn({
      message: `[reconcile] Borrando ${
        plan.deletions.length
      } archivo(s): ${plan.deletions.join(', ')}. Dando de baja ${
        plan.routesRemoved.length
      } ruta(s): ${plan.routesRemoved.join(', ')}.`,
    })
  }

  const res = await ctx.clients.github.commitFiles(
    { upserts: plan.upserts, deletions: plan.deletions },
    `Reconcile store theme with CMS (${plan.upserts.length} files, ${plan.deletions.length} deletions)`
  )

  if (res?.data?.error) {
    throw res.data.error
  }

  return {
    ...report,
    committed: res.data.action === 'committed',
    commitSha: res.data.sha ?? null,
  }
}
