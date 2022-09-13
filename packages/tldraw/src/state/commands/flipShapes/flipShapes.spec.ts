import { TldrawTestApp, mockDocument } from '~test'
import { ArrowShape, RectangleShape, TDShapeType } from '~types'

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
  it('move the grouped shape when flipped with other shape', () => {
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
  it('flip curved arrow horizontally', () => {
    app.createShapes({
      id: 'arrow1',
      type: TDShapeType.Arrow,
      bend: -0.5464405676717543,
      handles: {
        start: {
          bindingId: undefined,
          canBind: true,
          id: 'start',
          index: 0,
          point: [-13, 107],
        },
        end: {
          bindingId: undefined,
          canBind: true,
          id: 'end',
          index: 1,
          point: [388, 112],
        },
        bend: {
          id: 'bend',
          index: 2,
          point: [185, -0],
        },
      },
      point: [1877, 677],
    })
    app.select('arrow1')
    app.flipHorizontal()
    expect(app.getShape<ArrowShape>('arrow1').point).toStrictEqual([1864, 677.19])
    expect(app.getShape<ArrowShape>('arrow1').handles.bend.point).toStrictEqual([214.87, 219.06])
  })
  it('flip arrow vertically', () => {
    app.createShapes({
      id: 'arrow1',
      type: TDShapeType.Arrow,
      bend: -0.5464405676717543,
      handles: {
        start: {
          bindingId: undefined,
          canBind: true,
          id: 'start',
          index: 0,
          point: [-13, 107],
        },
        end: {
          bindingId: undefined,
          canBind: true,
          id: 'end',
          index: 1,
          point: [388, 112],
        },
        bend: {
          id: 'bend',
          index: 2,
          point: [185, -0],
        },
      },
      point: [1877, 677],
    })
    app.select('arrow1')
    app.flipVertical()
    expect(app.getShape<ArrowShape>('arrow1').point).toStrictEqual([1864, 677.19])
    expect(app.getShape<ArrowShape>('arrow1').handles.bend.point).toStrictEqual([186.13, -107.25])
  })
})
