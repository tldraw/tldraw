import { TldrawApp } from '~state'
import { EllipseTool } from '.'

describe('EllipseTool', () => {
  it('creates tool', () => {
    const state = new TldrawApp()
    new EllipseTool(state)
  })
})
