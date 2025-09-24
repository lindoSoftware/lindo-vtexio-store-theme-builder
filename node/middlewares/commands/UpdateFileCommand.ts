import { Command } from '../../typings/command'

export class UpdateFileCommand implements Command {
  constructor(private ctx: Context) {}
  //   async execute() {
  //     const { owner, repo } = this.ctx.body
  //     const { github } = this.ctx.clients
  //     const newConfig = this.ctx.state.newConfig
  //     await github.updateFile(owner, repo, 'settings.json', JSON.stringify(newConfig, null, 2), 'chore: update settings.json')
  //   }
  async execute() {
    console.log('Executing UpdateFileCommand', this.ctx.body)
  }
}
