// import { jsonBuilder } from "../../utils/builders/jsonBuilder"
import { Command } from '../../typings/command'

export class BuildJsonCommand implements Command {
  constructor(private ctx: Context) {}
  //   async execute() {
  //     const newConfig = jsonBuilder(this.params)
  //     this.ctx.state.newConfig = newConfig
  //   }
  async execute() {
    this.ctx
  }
}
