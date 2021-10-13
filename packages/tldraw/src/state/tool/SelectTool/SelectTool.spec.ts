import { TLDrawState } from '~state'
import { SelectTool } from '.'

describe('SelectTool', () => {
  it('creates tool', () => {
    const tlstate = new TLDrawState()
    new SelectTool(tlstate)
  })
})
