import { TldrawApp } from '~state'
import { DrawTool } from '.'

describe('DrawTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new DrawTool(app)
  })
})
