import { TLDrawApp } from '~state'
import { EllipseTool } from '.'

describe('EllipseTool', () => {
  it('creates tool', () => {
    const state = new TLDrawApp()
    new EllipseTool(state)
  })
})
