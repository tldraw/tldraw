import state from 'state'
import * as json from './__mocks__/document.json'

state.reset()
state
  .send('MOUNTED')
  .send('MOUNTED_SHAPES')
  .send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
state.send('CLEARED_PAGE')

describe('arrow shape', () => {
  it('creates a shape', () => {
    // TODO
    null
  })

  it('cancels shape while creating', () => {
    // TODO
    null
  })

  it('removes shape on undo and restores it on redo', () => {
    // TODO
    null
  })

  it('does not create shape when readonly', () => {
    // TODO
    null
  })
})
