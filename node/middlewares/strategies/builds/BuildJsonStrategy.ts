import { GeneratedFile } from '../../commands/BuildJsonCommand'

export interface BuildJsonStrategy<TData> {
  readonly section: string
  build(data: TData): Promise<GeneratedFile[]>
}
