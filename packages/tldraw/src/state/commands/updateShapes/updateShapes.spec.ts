import { mockDocument, TldrawTestApp } from '~test'

describe('Update command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = app.state
      app.updateShapes()
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    app.updateShapes({ id: 'rect1', point: [100, 100] })

    expect(app.getShape('rect1').point).toStrictEqual([100, 100])

    app.undo()

    expect(app.getShape('rect1').point).toStrictEqual([0, 0])

    app.redo()

    expect(app.getShape('rect1').point).toStrictEqual([100, 100])
  })
})
