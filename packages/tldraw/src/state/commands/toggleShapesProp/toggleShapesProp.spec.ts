import type { RectangleShape } from '~types'
import { mockDocument, TldrawTestApp } from '~test'

describe('Toggle command', () => {
  const state = new TldrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.toggleHidden()
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state.selectAll()

    expect(state.getShape('rect2').isLocked).toBe(undefined)

    state.toggleLocked()

    expect(state.getShape('rect2').isLocked).toBe(true)

    state.undo()

    expect(state.getShape('rect2').isLocked).toBe(undefined)

    state.redo()

    expect(state.getShape('rect2').isLocked).toBe(true)
  })

  it('toggles on before off when mixed values', () => {
    state.select('rect2')

    expect(state.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(undefined)
    expect(state.getShape<RectangleShape>('rect2').isAspectRatioLocked).toBe(undefined)

    state.toggleAspectRatioLocked()

    expect(state.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(undefined)
    expect(state.getShape<RectangleShape>('rect2').isAspectRatioLocked).toBe(true)

    state.selectAll()
    state.toggleAspectRatioLocked()

    expect(state.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(true)
    expect(state.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(true)

    state.toggleAspectRatioLocked()

    expect(state.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(false)
    expect(state.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(false)
  })
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1')
      .toggleHidden()
      .selectNone()
      .undo()

    expect(state.selectedIds).toEqual(['rect1'])

    state.selectNone().redo()

    expect(state.selectedIds).toEqual(['rect1'])
  })
})
