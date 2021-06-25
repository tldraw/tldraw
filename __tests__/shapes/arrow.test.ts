import state from 'state'
import * as json from '../__mocks__/document.json'

state.reset()
state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
state.send('CLEARED_PAGE')

describe('arrow shape', () => {
  it('creates shape', () => {
    null
  })

  it('cancels shape while creating', () => {
    null
  })

  it('moves shape', () => {
    null
  })

  it('rotates shape', () => {
    null
  })

  it('measures bounds', () => {
    null
  })

  it('measures rotated bounds', () => {
    null
  })

  it('transforms single', () => {
    null
  })

  it('transforms in a group', () => {
    null
  })

  /* -------------------- Specific -------------------- */

  it('creates compass-aligned shape with shift key', () => {
    null
  })

  it('changes start handle', () => {
    null
  })

  it('changes end handle', () => {
    null
  })

  it('changes bend handle', () => {
    null
  })

  it('resets bend handle when double-pointed', () => {
    null
  })

  /* -------------------- Readonly -------------------- */

  it('does not create shape when readonly', () => {
    null
  })
})
