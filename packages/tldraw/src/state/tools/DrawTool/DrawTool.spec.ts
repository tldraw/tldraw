import { TldrawApp } from '~state'
import { DrawTool } from '.'

describe('DrawTool', () => {
  it('creates tool', () => {
    const state = new TldrawApp()
    new DrawTool(state)
  })
})
