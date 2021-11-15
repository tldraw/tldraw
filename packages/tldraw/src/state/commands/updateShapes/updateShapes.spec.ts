import { mockDocument, TLDrawTestApp } from '~test'

describe('Update command', () => {
  const state = new TLDrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.updateShapes()
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state.updateShapes({ id: 'rect1', point: [100, 100] })

    expect(state.getShape('rect1').point).toStrictEqual([100, 100])

    state.undo()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])

    state.redo()

    expect(state.getShape('rect1').point).toStrictEqual([100, 100])
  })
})
