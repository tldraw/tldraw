import { TLDrawState } from '~state'
import { ArrowTool } from '.'

describe('ArrowTool', () => {
  it('creates tool', () => {
    const tlstate = new TLDrawState()
    new ArrowTool(tlstate)
  })
})
