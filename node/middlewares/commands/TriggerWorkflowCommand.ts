import { Command } from '../../typings/command'

export class TriggerWorkflowCommand implements Command {
  constructor(private ctx: Context) {}
  //   async execute() {
  //     const { owner, repo } = this.ctx.body
  //     const { github } = this.ctx.clients
  //     await github.triggerWorkflow(owner, repo)
  //   }

  async execute() {
    console.log('Executing TriggerWorkflowCommand', this.ctx.body)
  }
}
