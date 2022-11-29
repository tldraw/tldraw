import { TldrawApp } from '~state'
import { TableTool } from '.'

describe('TableTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new TableTool(app)
  })
})
