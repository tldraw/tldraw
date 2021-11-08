import { TLDrawState } from '~state'
import { TextTool } from '.'

describe('TextTool', () => {
  it('creates tool', () => {
    const state = new TLDrawState()
    new TextTool(state)
  })
})
