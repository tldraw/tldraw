import { mockDocument, TldrawTestApp } from '~test'
import { ArrowShape, Decoration, TldrawShapeType } from '~types'

describe('Toggle decoration command', () => {
  const state = new TldrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.toggleDecoration('start')
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  describe('when handle id is invalid', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.toggleDecoration('invalid')
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state
      .createShapes({
        id: 'arrow1',
        type: TldrawShapeType.Arrow,
      })
      .select('arrow1')

    expect(state.getShape<ArrowShape>('arrow1').decorations?.end).toBe(Decoration.Arrow)

    state.toggleDecoration('end')

    expect(state.getShape<ArrowShape>('arrow1').decorations?.end).toBe(undefined)

    state.undo()

    expect(state.getShape<ArrowShape>('arrow1').decorations?.end).toBe(Decoration.Arrow)

    state.redo()

    expect(state.getShape<ArrowShape>('arrow1').decorations?.end).toBe(undefined)
  })
})
