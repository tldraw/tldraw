import { TldrawApp } from '~state'
import { VideoTool } from '.'

describe('ArrowTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new VideoTool(app)
  })
})
