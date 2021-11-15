import { mockDocument, TLDrawTestApp } from '~test'
import type { RectangleShape } from '~types'

describe('Flip command', () => {
  const state = new TLDrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.flipHorizontal()
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state.select('rect1', 'rect2')
    state.flipHorizontal()

    expect(state.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])

    state.undo()

    expect(state.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])

    state.redo()

    expect(state.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
  })

  it('flips horizontally', () => {
    state.select('rect1', 'rect2')
    state.flipHorizontal()

    expect(state.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
  })

  it('flips vertically', () => {
    state.select('rect1', 'rect2')
    state.flipVertical()

    expect(state.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 100])
  })
})
