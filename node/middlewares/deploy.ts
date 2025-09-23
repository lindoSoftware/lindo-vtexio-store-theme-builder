import { jsonBuilder } from '../utils/jsonBuilder'

export async function deploy(ctx: Context, next: () => Promise<any>) {
  const {
    clients: { github },
  } = ctx

  const { owner, repo, params } = ctx.body as {
    owner: string
    repo: string
    params: Record<string, any>
  }

  try {
    // 1. Construir JSON dinámico
    const newConfig = jsonBuilder(params)

    // 2. Guardar archivo en GitHub (ejemplo: settings.json en la raíz del repo)
    await github.updateFile(owner, repo, 'settings.json', JSON.stringify(newConfig, null, 2), 'chore: update settings.json')

    // 3. Disparar workflow para que GitHub Actions haga el `vtex link`
    await github.triggerWorkflow(owner, repo)

    ctx.status = 200
    ctx.body = { message: 'Deploy iniciado correctamente 🚀' }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }

  await next()
}