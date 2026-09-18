import { createHash } from 'crypto'

/**
 * SHA de blob de git para un contenido: `sha1("blob " + bytes + "\0" + content)`.
 *
 * Es el mismo valor que `git.getTree` devuelve por archivo, así que comparar
 * contra él dice si un archivo generado difiere del que está publicado en el
 * repo sin pedir su contenido.
 *
 * La longitud del header va en **bytes**, no en caracteres: con contenido no
 * ASCII los dos números no coinciden y el hash dejaría de ser el de git.
 */
export function gitBlobSha(content: string): string {
  const body = Buffer.from(content, 'utf8')
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8')

  return createHash('sha1')
    .update(Buffer.concat([header, body]))
    .digest('hex')
}
