import { mockDocument, TldrawTestApp } from '~test'
import { ArrowShape, Decoration, TDShapeType } from '~types'

describe('Toggle decoration command', () => {
  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const app = new TldrawTestApp()
      const initialState = app.state
      app.toggleDecoration('start')
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  describe('when handle id is invalid', () => {
    it('does nothing', () => {
      const app = new TldrawTestApp()
      const initialState = app.state
      app.toggleDecoration('invalid')
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    const app = new TldrawTestApp()
      .createShapes({
        id: 'arrow1',
        type: TDShapeType.Arrow,
      })
      .select('arrow1')

    expect(app.getShape<ArrowShape>('arrow1').decorations?.end).toBe(Decoration.Arrow)

    app.toggleDecoration('end')

    expect(app.getShape<ArrowShape>('arrow1').decorations?.end).toBe(undefined)

    app.undo()

    expect(app.getShape<ArrowShape>('arrow1').decorations?.end).toBe(Decoration.Arrow)

    app.redo()

    expect(app.getShape<ArrowShape>('arrow1').decorations?.end).toBe(undefined)
  })
})
