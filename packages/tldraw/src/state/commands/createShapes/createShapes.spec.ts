import { mockDocument, TLDrawTestApp } from '~test'

describe('Create command', () => {
  const state = new TLDrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when no shape is provided', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.create()

      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    const shape = { ...state.getShape('rect1'), id: 'rect4' }
    state.create([shape])

    expect(state.getShape('rect4')).toBeTruthy()

    state.undo()

    expect(state.getShape('rect4')).toBe(undefined)

    state.redo()

    expect(state.getShape('rect4')).toBeTruthy()
  })

  it.todo('Creates bindings')
})
