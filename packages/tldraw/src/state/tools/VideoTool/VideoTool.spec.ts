import { TldrawApp } from '~state'
import { VideoTool } from '.'

describe('VideoTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new VideoTool(app)
  })
})
