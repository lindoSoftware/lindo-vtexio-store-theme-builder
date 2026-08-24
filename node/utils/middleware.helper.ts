export async function readRequestBodyAsJSON<T = any>(
  req: Context['req']
): Promise<T> {
  const rawBody = await new Promise<string>((resolve, reject) => {
    let data = ''

    req.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })
    req.on('end', () => resolve(data))
    req.on('error', (err) => reject(err))
  })

  return JSON.parse(rawBody) as T
}
