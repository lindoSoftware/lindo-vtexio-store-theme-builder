/**
 * Genera un identificador único para bloques basado en el slug de la página
 * Esto evita colisiones entre bloques de diferentes custom pages
 */
export class BlockNameHelper {
  private readonly pageIdentifier: string

  constructor(pageSlug: string) {
    // Crear un identificador único basado en el slug
    // Usamos el slug directamente para mejor legibilidad en lugar de hash
    this.pageIdentifier = this.sanitizeSlug(pageSlug)
  }

  /**
   * Sanitiza el slug para que sea válido como parte de un nombre de bloque
   */
  private sanitizeSlug(slug: string): string {
    // Reemplazar caracteres no válidos y mantener solo alfanuméricos y guiones
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  /**
   * Genera un nombre de bloque único para esta página
   * @param blockType Tipo de bloque (ej: "rich-text", "flex-layout.row")
   * @param suffix Sufijo adicional (índices, identificadores)
   */
  public generateBlockName(blockType: string, suffix: string = ''): string {
    let blockName = `${blockType}#${this.pageIdentifier}`

    if (suffix) {
      blockName += `-${suffix}`
    }

    return blockName
  }

  /**
   * Obtiene el identificador de página (útil para logging o debugging)
   */
  public getPageIdentifier(): string {
    return this.pageIdentifier
  }
}
