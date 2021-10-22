import Vec from '@tldraw/vec'
import { TLDrawState } from '~state'
import { mockDocument, TLStateUtils } from '~test'
import { AlignType, DistributeType, TLDrawShapeType } from '~types'

describe('Distribute command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  describe('when less than three shapes are selected', () => {
    it('does nothing', () => {
      tlstate.select('rect1', 'rect2')
      const initialState = tlstate.state
      tlstate.distribute(DistributeType.Horizontal)
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    tlstate.selectAll()
    tlstate.distribute(DistributeType.Horizontal)

    expect(tlstate.getShape('rect3').point).toEqual([50, 20])
    tlstate.undo()
    expect(tlstate.getShape('rect3').point).toEqual([20, 20])
    tlstate.redo()
    expect(tlstate.getShape('rect3').point).toEqual([50, 20])
  })

  it('distributes vertically', () => {
    tlstate.selectAll()
    tlstate.distribute(DistributeType.Vertical)

    expect(tlstate.getShape('rect3').point).toEqual([20, 50])
  })
})

describe('when distributing groups', () => {
  it('distributes children', () => {
    const tlstate = new TLDrawState()
      .createShapes(
        { id: 'rect1', type: TLDrawShapeType.Rectangle, point: [0, 0], size: [100, 100] },
        { id: 'rect2', type: TLDrawShapeType.Rectangle, point: [100, 100], size: [100, 100] },
        { id: 'rect3', type: TLDrawShapeType.Rectangle, point: [200, 200], size: [100, 100] },
        { id: 'rect4', type: TLDrawShapeType.Rectangle, point: [0, 0], size: [200, 200] },
        { id: 'rect5', type: TLDrawShapeType.Rectangle, point: [300, -200], size: [100, 100] }
      )
      .group(['rect1', 'rect2'], 'groupA')
      .select('rect3', 'rect4', 'rect5')
      .distribute(DistributeType.Vertical)

    const p0 = tlstate.getShape('rect4').point
    const p1 = tlstate.getShape('rect3').point

    tlstate.undo().delete(['rect4']).selectAll().distribute(DistributeType.Vertical)

    new TLStateUtils(tlstate).expectShapesToBeAtPoints({
      rect1: p0,
      rect2: Vec.add(p0, [100, 100]),
      rect3: p1,
    })
  })
})
