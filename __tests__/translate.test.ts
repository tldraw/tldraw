import state from 'state'
import * as json from './__mocks__/document.json'

state.reset()
state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
state.send('CLEARED_PAGE')

describe('translates shapes', () => {
  it('translates a single selected shape', () => {
    // TODO
    null
  })

  it('translates multiple selected shape', () => {
    // TODO
    null
  })

  it('translates while axis-locked', () => {
    // TODO
    null
  })

  it('translates after leaving axis-locked state', () => {
    // TODO
    null
  })

  it('creates clones while translating', () => {
    // TODO
    null
  })

  it('removes clones after leaving cloning state', () => {
    // TODO
    null
  })
})
