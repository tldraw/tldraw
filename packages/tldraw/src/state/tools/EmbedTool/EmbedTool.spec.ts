import { TldrawApp } from '~state'
import { EmbedTool } from '.'

describe('ImageTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new EmbedTool(app)
  })
})
