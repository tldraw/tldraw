import { TldrawApp } from '~state'
import { StickyTool } from '.'

describe('StickyTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new StickyTool(app)
  })
})
