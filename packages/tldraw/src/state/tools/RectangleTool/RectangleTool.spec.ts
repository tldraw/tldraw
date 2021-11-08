import { TLDrawState } from '~state'
import { RectangleTool } from '.'

describe('RectangleTool', () => {
  it('creates tool', () => {
    const state = new TLDrawState()
    new RectangleTool(state)
  })
})
