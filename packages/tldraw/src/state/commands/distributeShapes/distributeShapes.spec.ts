import Vec from '@tldraw/vec'
import { mockDocument, TldrawTestApp } from '~test'
import { DistributeType, TldrawShapeType } from '~types'

describe('Distribute command', () => {
  const state = new TldrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when less than three shapes are selected', () => {
    it('does nothing', () => {
      state.select('rect1', 'rect2')
      const initialState = state.state
      state.distribute(DistributeType.Horizontal)
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state.selectAll()
    state.distribute(DistributeType.Horizontal)

    expect(state.getShape('rect3').point).toEqual([50, 20])
    state.undo()
    expect(state.getShape('rect3').point).toEqual([20, 20])
    state.redo()
    expect(state.getShape('rect3').point).toEqual([50, 20])
  })

  it('distributes vertically', () => {
    state.selectAll()
    state.distribute(DistributeType.Vertical)

    expect(state.getShape('rect3').point).toEqual([20, 50])
  })
})

describe('when distributing groups', () => {
  it('distributes children', () => {
    const state = new TldrawTestApp()
      .createShapes(
        { id: 'rect1', type: TldrawShapeType.Rectangle, point: [0, 0], size: [100, 100] },
        { id: 'rect2', type: TldrawShapeType.Rectangle, point: [100, 100], size: [100, 100] },
        { id: 'rect3', type: TldrawShapeType.Rectangle, point: [200, 200], size: [100, 100] },
        { id: 'rect4', type: TldrawShapeType.Rectangle, point: [0, 0], size: [200, 200] },
        { id: 'rect5', type: TldrawShapeType.Rectangle, point: [300, -200], size: [100, 100] }
      )
      .group(['rect1', 'rect2'], 'groupA')
      .select('rect3', 'rect4', 'rect5')
      .distribute(DistributeType.Vertical)

    const p0 = state.getShape('rect4').point
    const p1 = state.getShape('rect3').point

    state
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
