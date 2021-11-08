import { TLDrawState } from '~state'
import { DrawTool } from '.'

describe('DrawTool', () => {
  it('creates tool', () => {
    const state = new TLDrawState()
    new DrawTool(state)
  })
})
