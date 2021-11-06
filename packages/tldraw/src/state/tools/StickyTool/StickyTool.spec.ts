import { TLDrawState } from '~state'
import { StickyTool } from '.'

describe('StickyTool', () => {
  it('creates tool', () => {
    const tlstate = new TLDrawState()
    new StickyTool(tlstate)
  })
})
