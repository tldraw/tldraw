import { TldrawApp } from '~state'
import { ViewZoneTool } from '.'

describe('RectangleTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new ViewZoneTool(app)
  })
})
