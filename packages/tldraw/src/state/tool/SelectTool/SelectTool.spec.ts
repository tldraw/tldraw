import { TLDrawState } from '~state'
import { SelectTool } from '.'

describe('SelectTool', () => {
  it('creates tool', () => {
    const tlstate = new TLDrawState()
    new SelectTool(tlstate)
  })
})

describe('When double clicking link controls', () => {
  it.todo('selects all linked shapes when center is double clicked')
  it.todo('selects all upstream linked shapes when left is double clicked')
  it.todo('selects all downstream linked shapes when right is double clicked')
})
