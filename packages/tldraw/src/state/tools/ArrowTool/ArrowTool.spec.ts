import { TldrawApp } from '~state'
import { ArrowTool } from '.'

describe('ArrowTool', () => {
  it('creates tool', () => {
    const state = new TldrawApp()
    new ArrowTool(state)
  })
})
