import { TLDrawState } from '~state'
import { StickyTool } from '.'

describe('StickyTool', () => {
  it('creates tool', () => {
    const state = new TLDrawState()
    new StickyTool(state)
  })
})
