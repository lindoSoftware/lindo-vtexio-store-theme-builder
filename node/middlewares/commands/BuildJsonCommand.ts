// import { jsonBuilder } from "../../utils/builders/jsonBuilder"

import { Command } from '../../typings/command'

export class BuildJsonCommand implements Command {
  constructor(private ctx: Context) {}
  async execute() {
    console.log('Executing JSON....', this.ctx.body)
  }
}
