import TestState from '../test-utils'

describe('arrow shape', () => {
  const tt = new TestState()
  tt.resetDocumentState()

  it('creates shape', () => {
    tt.send('SELECTED_TEXT_TOOL')

    expect(tt.state.isIn('text.creating')).toBe(true)

    const id = tt.getSortedPageShapeIds()[0]

    tt.clickCanvas()

    expect(tt.state.isIn('editingShape')).toBe(true)

    tt.send('EDITED_SHAPE', {
      id,
      change: { text: 'Hello world' },
    })

    tt.send('BLURRED_EDITING_SHAPE', { id: id })

    expect(tt.state.isIn('selecting')).toBe(true)
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

  it('scales', () => {
    // TODO
    null
  })

  it('selects different text on tap while editing', () => {
    // TODO
    null
  })
})
