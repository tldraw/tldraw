import { TldrawApp } from '~state'
import { VideoTool } from '.'

describe('RectangleTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new VideoTool(app)
  })
})
