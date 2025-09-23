export function jsonBuilder(params: Record<string, any>) {
  // Ejemplo simple: mergear params con default config
  const defaultConfig = {
    theme: 'default',
    version: '1.0.0',
  }

  return {
    ...defaultConfig,
    ...params,
  }
}
