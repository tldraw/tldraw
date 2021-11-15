import { TLDrawApp } from '~state'
import { RectangleTool } from '.'

describe('RectangleTool', () => {
  it('creates tool', () => {
    const state = new TLDrawApp()
    new RectangleTool(state)
  })
})
