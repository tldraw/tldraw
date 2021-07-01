import state from 'state'
import coopState from 'state/coop/coop-state'
import * as json from './__mocks__/document.json'

state.reset()
state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
state.send('CLEARED_PAGE')

coopState.reset()

describe('coop', () => {
  it('joins a room', () => {
    // TODO
    null
  })

  it('leaves a room', () => {
    // TODO
    null
  })

  it('rejoins a room', () => {
    // TODO
    null
  })

  it('handles another user joining room', () => {
    // TODO
    null
  })

  it('handles another user leaving room', () => {
    // TODO
    null
  })

  it('sends mouse movements', () => {
    // TODO
    null
  })

  it('receives mouse movements', () => {
    // TODO
    null
  })
})
