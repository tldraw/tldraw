import { TldrawApp } from '~state'
import { ImageTool } from '.'

describe('RectangleTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new ImageTool(app)
  })
})
