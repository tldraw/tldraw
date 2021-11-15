import { TLDrawApp } from '~state'
import { TextTool } from '.'

describe('TextTool', () => {
  it('creates tool', () => {
    const state = new TLDrawApp()
    new TextTool(state)
  })
})
