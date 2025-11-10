/**
 * Verifica si la fecha actual está dentro del rango [beginning, expiration].
 * - Si falta alguna de las dos fechas, retorna false.
 * - Si ambas están definidas, retorna true solo si la fecha actual está dentro del rango.
 */
export function isWithinDateRange(
  beginning?: string,
  expiration?: string
): boolean {
  if (!beginning || !expiration) return false

  const now = new Date()
  const start = new Date(beginning)
  const end = new Date(expiration)

  return now >= start && now <= end
}
