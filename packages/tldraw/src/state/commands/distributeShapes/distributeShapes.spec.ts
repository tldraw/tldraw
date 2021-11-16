import Vec from '@tldraw/vec'
import { mockDocument, TldrawTestApp } from '~test'
import { DistributeType, TDShapeType } from '~types'

describe('Distribute command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when less than three shapes are selected', () => {
    it('does nothing', () => {
      app.select('rect1', 'rect2')
      const initialState = app.state
      app.distribute(DistributeType.Horizontal)
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    app.selectAll()
    app.distribute(DistributeType.Horizontal)

    expect(app.getShape('rect3').point).toEqual([50, 20])
    app.undo()
    expect(app.getShape('rect3').point).toEqual([20, 20])
    app.redo()
    expect(app.getShape('rect3').point).toEqual([50, 20])
  })

  it('distributes vertically', () => {
    app.selectAll()
    app.distribute(DistributeType.Vertical)

    expect(app.getShape('rect3').point).toEqual([20, 50])
  })
})

describe('when distributing groups', () => {
  it('distributes children', () => {
    const app = new TldrawTestApp()
      .createShapes(
        { id: 'rect1', type: TDShapeType.Rectangle, point: [0, 0], size: [100, 100] },
        { id: 'rect2', type: TDShapeType.Rectangle, point: [100, 100], size: [100, 100] },
        { id: 'rect3', type: TDShapeType.Rectangle, point: [200, 200], size: [100, 100] },
        { id: 'rect4', type: TDShapeType.Rectangle, point: [0, 0], size: [200, 200] },
        { id: 'rect5', type: TDShapeType.Rectangle, point: [300, -200], size: [100, 100] }
      )
      .group(['rect1', 'rect2'], 'groupA')
      .select('rect3', 'rect4', 'rect5')
      .distribute(DistributeType.Vertical)

    const p0 = app.getShape('rect4').point
    const p1 = app.getShape('rect3').point

    app
      .undo()
      .delete(['rect4'])
      .selectAll()
      .distribute(DistributeType.Vertical)
      .expectShapesToBeAtPoints({
        rect1: p0,
        rect2: Vec.add(p0, [100, 100]),
        rect3: p1,
      })
  })
})
