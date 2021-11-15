import { TLDrawApp } from '~state'
import { ArrowTool } from '.'

describe('ArrowTool', () => {
  it('creates tool', () => {
    const state = new TLDrawApp()
    new ArrowTool(state)
  })
})
