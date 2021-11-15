import { TLDrawApp } from '~state'
import { StickyTool } from '.'

describe('StickyTool', () => {
  it('creates tool', () => {
    const state = new TLDrawApp()
    new StickyTool(state)
  })
})
