import { Variables } from "../../typings/request-body";

export interface ISectionStrategy<TData = unknown> {
  /**
   * Ejecuta la lógica de obtención de datos para una sección específica
   * @param ctx contexto VTEX IO
   * @param variables opcionales para filtrar contenido
   */
  getData(ctx: Context, variables?: Variables | null): Promise<TData>
}