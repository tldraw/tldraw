import { TldrawApp } from '~state'
import { EllipseTool } from '.'

describe('EllipseTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new EllipseTool(app)
  })
})
