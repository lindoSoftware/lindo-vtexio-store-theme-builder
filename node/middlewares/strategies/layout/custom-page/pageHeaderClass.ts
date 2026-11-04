import { CUSTOMPAGE_APPNAMES } from './custompage-constants'

// Componentes que ocupan el ancho de la página en vez de la columna de lectura
const WIDE_APPNAMES: string[] = [CUSTOMPAGE_APPNAMES.BRANCH_SELECTOR]

/**
 * blockClass del título y el subtítulo de una custom page. Si el contenido
 * tiene un componente ancho, se suma `custom-page-wide` para que el theme
 * alinee el encabezado con ese componente (y no con la columna de 760px).
 */
export const pageHeaderClass = (
  base: string,
  content?: Array<{ appName: string }>
): string | string[] =>
  content?.some((section) => WIDE_APPNAMES.includes(section.appName))
    ? [base, 'custom-page-wide']
    : base
