import TestState from '../test-utils'

describe('arrow shape', () => {
  const tt = new TestState()
  tt.resetDocumentState().send('SELECTED_ARROW_TOOL').save()

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
