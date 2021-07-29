import { TLDrawTestState } from './test-state'

describe('selection', () => {
  const tt = new TLDrawTestState()

  it('selects a shape', () => {
    tt.deselectAll().clickShape('rect1')

    expect(tt.idsAreSelected(['rect1'])).toBe(true)
  })

  it('selects and deselects a shape', () => {
    tt.deselectAll().clickShape('rect1').clickCanvas()

    expect(tt.idsAreSelected([])).toBe(true)

    expect(tt.isIn('notPointing')).toBe(true)
  })

  it('selects multiple shapes', () => {
    tt.deselectAll()

    expect(tt.idsAreSelected([])).toBe(true)

    tt.clickShape('rect1')

    expect(tt.idsAreSelected(['rect1'])).toBe(true)

    tt.clickShape('rect2', { shiftKey: true })

    expect(tt.idsAreSelected(['rect1', 'rect2'])).toBe(true)
  })

  it('shift-selects to deselect shapes', () => {
    tt.deselectAll()
      .clickShape('rect1')
      .clickShape('rect2', { shiftKey: true })
      .clickShape('rect1', { shiftKey: true })

    expect(tt.idsAreSelected(['rect2'])).toBe(true)
  })

  it('single-selects shape in selection on click', () => {
    tt.deselectAll().clickShape('rect1').clickShape('rect2', { shiftKey: true }).clickShape('rect2')

    expect(tt.idsAreSelected(['rect2'])).toBe(true)
  })

  it('single-selects shape in selection on pointerup only', () => {
    tt.deselectAll()

    tt.clickShape('rect1').clickShape('rect2', { shiftKey: true })

    expect(tt.idsAreSelected(['rect1', 'rect2'])).toBe(true)

    tt.startClickingShape('rect2')

    expect(tt.idsAreSelected(['rect1', 'rect2'])).toBe(true)

    tt.stopClickingShape('rect2')

    expect(tt.idsAreSelected(['rect2'])).toBe(true)
  })

  it('selects shapes if shift key is lifted before pointerup', () => {
    tt.deselectAll()
      .clickShape('rect1')
      .clickShape('rect2', { shiftKey: true })
      .startClickingShape('rect1', { shiftKey: true })
      .stopClickingShape('rect1')

    expect(tt.idsAreSelected(['rect1'])).toBe(true)
  })

  it('does not select on meta-click', () => {
    tt.deselectAll().clickShape('rect1', { ctrlKey: true })

    expect(tt.selectedIds.length).toBe(0)
  })

  it('does not select on meta-shift-click', () => {
    tt.deselectAll().clickShape('rect1', { ctrlKey: true, shiftKey: true })

    expect(tt.selectedIds.length).toBe(0)
  })
})
