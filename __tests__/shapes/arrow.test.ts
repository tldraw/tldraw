import state from 'state'
import * as json from '../__mocks__/document.json'

state.reset()
state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
state.send('CLEARED_PAGE')

describe('arrow shape', () => {
  it('creates shape', () => {
    // TODO
    null
  })

  it('cancels shape while creating', () => {
    // TODO
    null
  })

  it('moves shape', () => {
    // TODO
    null
  })

  it('rotates shape', () => {
    // TODO
    null
  })

  it('rotates shape in a group', () => {
    // TODO
    null
  })

  it('measures shape bounds', () => {
    // TODO
    null
  })

  it('measures shape rotated bounds', () => {
    // TODO
    null
  })

  it('transforms single shape', () => {
    // TODO
    null
  })

  it('transforms in a group', () => {
    // TODO
    null
  })

  /* -------------------- Specific -------------------- */

  it('creates compass-aligned shape with shift key', () => {
    // TODO
    null
  })

  it('changes start handle', () => {
    // TODO
    null
  })

  it('changes end handle', () => {
    // TODO
    null
  })

  it('changes bend handle', () => {
    // TODO
    null
  })

  it('resets bend handle when double-pointed', () => {
    // TODO
    null
  })
})
