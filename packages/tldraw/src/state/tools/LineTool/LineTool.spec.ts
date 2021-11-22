import { TldrawApp } from '~state'
import { LineTool } from '.'

describe('LineTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new LineTool(app)
  })
})
