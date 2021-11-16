import { TldrawApp } from '~state'
import { TextTool } from '.'

describe('TextTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new TextTool(app)
  })
})
