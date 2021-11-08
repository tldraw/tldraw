import { TLDrawState } from '~state'
import { ArrowTool } from '.'

describe('ArrowTool', () => {
  it('creates tool', () => {
    const state = new TLDrawState()
    new ArrowTool(state)
  })
})
