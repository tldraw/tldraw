import { TldrawApp } from '~state'
import { RectangleTool } from '.'

describe('RectangleTool', () => {
  it('creates tool', () => {
    const state = new TldrawApp()
    new RectangleTool(state)
  })
})
