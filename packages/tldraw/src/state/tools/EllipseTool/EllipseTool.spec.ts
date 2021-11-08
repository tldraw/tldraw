import { TLDrawState } from '~state'
import { EllipseTool } from '.'

describe('EllipseTool', () => {
  it('creates tool', () => {
    const state = new TLDrawState()
    new EllipseTool(state)
  })
})
