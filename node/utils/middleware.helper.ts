export async function readRequestBodyAsJSON(req: Context['req']) {
  const rawBody = await new Promise<string>((resolve, reject) => {
    let data = ''
    req.on('data', chunk => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', err => reject(err))
  })

  return JSON.parse(rawBody)
}
