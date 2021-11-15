import { mockDocument, TLDrawTestApp } from '~test'

describe('Rotate command', () => {
  const state = new TLDrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.rotate()
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state.select('rect1')

    expect(state.getShape('rect1').rotation).toBe(undefined)

    state.rotate()

    expect(state.getShape('rect1').rotation).toBe(Math.PI * (6 / 4))

    state.undo()

    expect(state.getShape('rect1').rotation).toBe(undefined)

    state.redo()

    expect(state.getShape('rect1').rotation).toBe(Math.PI * (6 / 4))
  })

  it.todo('Rotates several shapes at once.')

  it.todo('Rotates shapes with handles.')
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1')
      .rotate()
      .selectNone()
      .undo()

    expect(state.selectedIds).toEqual(['rect1'])

    state.selectNone().redo()

    expect(state.selectedIds).toEqual(['rect1'])
  })
})
