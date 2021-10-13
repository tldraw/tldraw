import { TLDrawState } from '~state'
import { DrawTool } from '.'

describe('DrawTool', () => {
  it('creates tool', () => {
    const tlstate = new TLDrawState()
    new DrawTool(tlstate)
  })
})
