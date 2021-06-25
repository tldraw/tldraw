import state from 'state'
import * as json from './__mocks__/document.json'

state.reset()
state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
state.send('CLEARED_PAGE')

describe('arrow shape', () => {
  it('creates a shape', () => {
    null
  })

  it('cancels shape while creating', () => {
    null
  })

  it('removes shape on undo and restores it on redo', () => {
    null
  })

  it('does not create shape when readonly', () => {
    null
  })
})
