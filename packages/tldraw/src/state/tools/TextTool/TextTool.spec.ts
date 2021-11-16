import { TldrawApp } from '~state'
import { TextTool } from '.'

describe('TextTool', () => {
  it('creates tool', () => {
    const state = new TldrawApp()
    new TextTool(state)
  })
})
