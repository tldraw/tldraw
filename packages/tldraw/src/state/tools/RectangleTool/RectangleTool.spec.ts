import { TldrawApp } from '~state'
import { RectangleTool } from '.'

describe('RectangleTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new RectangleTool(app)
  })
})
