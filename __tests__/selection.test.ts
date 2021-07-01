import TestState, { rectangleId, arrowId } from './test-utils'

describe('selection', () => {
  const tt = new TestState()

  it('selects a shape', () => {
    tt.deselectAll().clickShape(rectangleId)

    expect(tt.idsAreSelected([rectangleId])).toBe(true)
  })

  it('selects and deselects a shape', () => {
    tt.deselectAll().clickShape(rectangleId).clickCanvas()

    expect(tt.idsAreSelected([])).toBe(true)
  })

  it('selects multiple shapes', () => {
    tt.deselectAll()
      .clickShape(rectangleId)
      .clickShape(arrowId, { shiftKey: true })

    expect(tt.idsAreSelected([rectangleId, arrowId])).toBe(true)
  })

  it('shift-selects to deselect shapes', () => {
    tt.deselectAll()
      .clickShape(rectangleId)
      .clickShape(arrowId, { shiftKey: true })
      .clickShape(rectangleId, { shiftKey: true })

    expect(tt.idsAreSelected([arrowId])).toBe(true)
  })

  it('single-selects shape in selection on click', () => {
    tt.deselectAll()
      .clickShape(rectangleId)
      .clickShape(arrowId, { shiftKey: true })
      .clickShape(arrowId)

    expect(tt.idsAreSelected([arrowId])).toBe(true)
  })

  it('single-selects shape in selection on pointerup only', () => {
    tt.deselectAll()
      .clickShape(rectangleId)
      .clickShape(arrowId, { shiftKey: true })

    expect(tt.idsAreSelected([rectangleId, arrowId])).toBe(true)

    tt.startClick(arrowId)

    expect(tt.idsAreSelected([rectangleId, arrowId])).toBe(true)

    tt.stopClick(arrowId)

    expect(tt.idsAreSelected([arrowId])).toBe(true)
  })

  it('selects shapes if shift key is lifted before pointerup', () => {
    tt.deselectAll()
      .clickShape(rectangleId)
      .clickShape(arrowId, { shiftKey: true })
      .startClick(rectangleId, { shiftKey: true })
      .stopClick(rectangleId)

    expect(tt.idsAreSelected([rectangleId])).toBe(true)
  })

  it('does not select on meta-click', () => {
    tt.deselectAll().clickShape(rectangleId, { ctrlKey: true })

    expect(tt.idsAreSelected([])).toBe(true)
  })

  it('does not select on meta-shift-click', () => {
    tt.deselectAll().clickShape(rectangleId, { ctrlKey: true, shiftKey: true })

    expect(tt.idsAreSelected([])).toBe(true)
  })
})
