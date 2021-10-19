import { TLDrawState } from '~state'
import { EllipseTool } from '.'

describe('EllipseTool', () => {
  it('creates tool', () => {
    const tlstate = new TLDrawState()
    new EllipseTool(tlstate)
  })
})
