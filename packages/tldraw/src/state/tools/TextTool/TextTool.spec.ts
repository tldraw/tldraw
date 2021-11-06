import { TLDrawState } from '~state'
import { TextTool } from '.'

describe('TextTool', () => {
  it('creates tool', () => {
    const tlstate = new TLDrawState()
    new TextTool(tlstate)
  })
})
