import { mockDocument, TldrawTestApp } from '~test'
import type { RectangleShape } from '~types'

describe('Flip command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = app.state
      app.flipHorizontal()
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    app.select('rect1', 'rect2')
    app.flipHorizontal()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])

    app.undo()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])

    app.redo()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
  })

  it('flips horizontally', () => {
    app.select('rect1', 'rect2')
    app.flipHorizontal()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
  })

  it('flips vertically', () => {
    app.select('rect1', 'rect2')
    app.flipVertical()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 100])
  })
})
