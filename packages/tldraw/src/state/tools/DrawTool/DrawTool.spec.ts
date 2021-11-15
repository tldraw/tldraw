import { TLDrawApp } from '~state'
import { DrawTool } from '.'

describe('DrawTool', () => {
  it('creates tool', () => {
    const state = new TLDrawApp()
    new DrawTool(state)
  })
})
