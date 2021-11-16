import { StretchType, RectangleShape, TDShapeType } from '~types'
import { mockDocument, TldrawTestApp } from '~test'

describe('Stretch command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when less than two shapes are selected', () => {
    it('does nothing', () => {
      app.select('rect2')
      const initialState = app.state
      app.stretch(StretchType.Horizontal)
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    app.select('rect1', 'rect2')
    app.stretch(StretchType.Horizontal)

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect1').size).toStrictEqual([200, 100])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
    expect(app.getShape<RectangleShape>('rect2').size).toStrictEqual([200, 100])

    app.undo()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect1').size).toStrictEqual([100, 100])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])
    expect(app.getShape<RectangleShape>('rect2').size).toStrictEqual([100, 100])

    app.redo()

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect1').size).toStrictEqual([200, 100])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
    expect(app.getShape<RectangleShape>('rect2').size).toStrictEqual([200, 100])
  })

  it('stretches horizontally', () => {
    app.select('rect1', 'rect2')
    app.stretch(StretchType.Horizontal)

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect1').size).toStrictEqual([200, 100])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
    expect(app.getShape<RectangleShape>('rect2').size).toStrictEqual([200, 100])
  })

  it('stretches vertically', () => {
    app.select('rect1', 'rect2')
    app.stretch(StretchType.Vertical)

    expect(app.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(app.getShape<RectangleShape>('rect1').size).toStrictEqual([100, 200])
    expect(app.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 0])
    expect(app.getShape<RectangleShape>('rect2').size).toStrictEqual([100, 200])
  })
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .stretch(StretchType.Horizontal)
      .selectNone()
      .undo()

    expect(app.selectedIds).toEqual(['rect1', 'rect2'])

    app.selectNone().redo()

    expect(app.selectedIds).toEqual(['rect1', 'rect2'])
  })
})

describe('when stretching groups', () => {
  it('stretches children', () => {
    new TldrawTestApp()
      .createShapes(
        { id: 'rect1', type: TDShapeType.Rectangle, point: [0, 0], size: [100, 100] },
        { id: 'rect2', type: TDShapeType.Rectangle, point: [100, 100], size: [100, 100] },
        { id: 'rect3', type: TDShapeType.Rectangle, point: [200, 200], size: [100, 100] }
      )
      .group(['rect1', 'rect2'], 'groupA')
      .selectAll()
      .stretch(StretchType.Vertical)
      .expectShapesToHaveProps({
        rect1: { point: [0, 0], size: [100, 300] },
        rect2: { point: [100, 0], size: [100, 300] },
        rect3: { point: [200, 0], size: [100, 300] },
      })
  })
})
