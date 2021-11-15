import { TLDrawApp } from '~state'
import { EraseTool } from './EraseTool'

describe('EraseTool', () => {
  it('creates tool', () => {
    const state = new TLDrawApp()
    new EraseTool(state)
  })

  it.todo('restores previous tool after erasing')
})
