import { TldrawApp } from '~state'
import { ImageTool } from '.'

describe('ImageTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new ImageTool(app)
  })
})
