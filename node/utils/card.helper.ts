/**
 * URL de un archivo de la Media Library de Strapi. Concatena la URL base solo
 * si el path es relativo (/uploads/...): una URL absoluta (S3, CDN) se deja tal cual.
 */
export const mediaUrl = (url: string, strapiURL: string): string =>
  /^https?:\/\//.test(url) ? url : `${strapiURL}${url}`

/**
 * Nueva función auxiliar para procesar los bloques dentro de una card
 * y concatenar la URL de Strapi si es una imagen.
 */
export const mapCardContent = (content: any[], strapiURL: string) => {
  return content.map((block) => {
    // Verificamos si el bloque es de tipo imagen (según tu interface ComponentSharedCardImageBlock)
    if (block.images && Array.isArray(block.images)) {
      return {
        ...block,
        images: block.images.map((img: any) => ({
          ...img,
          url: img.url ? mediaUrl(img.url, strapiURL) : null,
        })),
      }
    }

    // Si es un text block u otro tipo, lo devolvemos tal cual
    return block
  })
}
