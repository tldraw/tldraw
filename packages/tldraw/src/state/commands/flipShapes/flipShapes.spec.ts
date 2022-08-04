import { TldrawTestApp, mockDocument } from '~test'
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
    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])

    app.select('rect1', 'rect2').flipHorizontal()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])

    app.undo()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])

    app.redo()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
  })

  it('flips horizontally', () => {
    app.select('rect1', 'rect2')

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])

    app.flipHorizontal()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
  })

  it('flips vertically', () => {
    app.select('rect1', 'rect2')

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])

    app.flipVertical()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 100])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 0])
  })

  it('flips vertically the children of a grouped shape', () => {
    app.group(
      [app.getShape<RectangleShape>('rect1').id, app.getShape<RectangleShape>('rect2').id],
      'groupId'
    )
    app.select('groupId')
    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])

    app.flipVertical()
    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 100])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 0])
  })
  it('flips horizontally the children of a grouped shape', () => {
    app.group(
      [app.getShape<RectangleShape>('rect1').id, app.getShape<RectangleShape>('rect2').id],
      'groupId'
    )
    app.select('groupId')
    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])

    app.flipHorizontal()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
  })
  it('stays in the same point when the grouped shape is selected with other shape', () => {
    app.group(
      [app.getShape<RectangleShape>('rect1').id, app.getShape<RectangleShape>('rect2').id],
      'groupId'
    )
    app.select('groupId', 'rect3')
    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])

    app.flipHorizontal()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])

    app.flipVertical()
    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])
  })
})
