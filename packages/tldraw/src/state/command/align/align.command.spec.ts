import Vec from '@tldraw/vec'
import { TLDrawState } from '~state'
import { mockDocument, TLStateUtils } from '~test'
import { AlignType, TLDrawShapeType } from '~types'

describe('Align command', () => {
  const tlstate = new TLDrawState()

  describe('when less than two shapes are selected', () => {
    it('does nothing', () => {
      tlstate.loadDocument(mockDocument).select('rect2')
      const initialState = tlstate.state
      tlstate.align(AlignType.Top)
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  describe('when multiple shapes are selected', () => {
    beforeEach(() => {
      tlstate.loadDocument(mockDocument)
      tlstate.selectAll()
    })

    it('does, undoes and redoes command', () => {
      tlstate.align(AlignType.Top)

      expect(tlstate.getShape('rect2').point).toEqual([100, 0])

      tlstate.undo()

      expect(tlstate.getShape('rect2').point).toEqual([100, 100])

      tlstate.redo()

      expect(tlstate.getShape('rect2').point).toEqual([100, 0])
    })

    it('aligns top', () => {
      tlstate.align(AlignType.Top)

      expect(tlstate.getShape('rect2').point).toEqual([100, 0])
    })

    it('aligns right', () => {
      tlstate.align(AlignType.Right)

      expect(tlstate.getShape('rect1').point).toEqual([100, 0])
    })

    it('aligns bottom', () => {
      tlstate.align(AlignType.Bottom)

      expect(tlstate.getShape('rect1').point).toEqual([0, 100])
    })

    it('aligns left', () => {
      tlstate.align(AlignType.Left)

      expect(tlstate.getShape('rect2').point).toEqual([0, 100])
    })

    it('aligns center horizontal', () => {
      tlstate.align(AlignType.CenterHorizontal)

      expect(tlstate.getShape('rect1').point).toEqual([50, 0])
      expect(tlstate.getShape('rect2').point).toEqual([50, 100])
    })

    it('aligns center vertical', () => {
      tlstate.align(AlignType.CenterVertical)

      expect(tlstate.getShape('rect1').point).toEqual([0, 50])
      expect(tlstate.getShape('rect2').point).toEqual([100, 50])
    })
  })
})

describe('when aligning groups', () => {
  it('aligns children', () => {
    const tlstate = new TLDrawState()
      .createShapes(
        { id: 'rect1', type: TLDrawShapeType.Rectangle, point: [0, 0], size: [100, 100] },
        { id: 'rect2', type: TLDrawShapeType.Rectangle, point: [100, 100], size: [100, 100] },
        { id: 'rect3', type: TLDrawShapeType.Rectangle, point: [200, 200], size: [100, 100] },
        { id: 'rect4', type: TLDrawShapeType.Rectangle, point: [0, 0], size: [200, 200] }
      )
      .group(['rect1', 'rect2'], 'groupA')
      .select('rect3', 'rect4')
      .align(AlignType.CenterVertical)

    const p0 = tlstate.getShape('rect4').point
    const p1 = tlstate.getShape('rect3').point

    tlstate.undo().delete(['rect4']).selectAll().align(AlignType.CenterVertical)

    new TLStateUtils(tlstate).expectShapesToBeAtPoints({
      rect1: p0,
      rect2: Vec.add(p0, [100, 100]),
      rect3: p1,
    })
  })
})
