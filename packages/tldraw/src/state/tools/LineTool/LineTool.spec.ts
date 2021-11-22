import { TldrawApp } from '~state'
import { LineTool } from '.'

describe('ArrowTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new LineTool(app)
  })
})
