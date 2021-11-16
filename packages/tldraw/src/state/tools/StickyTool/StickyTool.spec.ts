import { TldrawApp } from '~state'
import { StickyTool } from '.'

describe('StickyTool', () => {
  it('creates tool', () => {
    const state = new TldrawApp()
    new StickyTool(state)
  })
})
