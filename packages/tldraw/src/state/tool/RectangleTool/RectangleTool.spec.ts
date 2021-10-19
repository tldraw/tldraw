import { TLDrawState } from '~state'
import { RectangleTool } from '.'

describe('RectangleTool', () => {
  it('creates tool', () => {
    const tlstate = new TLDrawState()
    new RectangleTool(tlstate)
  })
})
