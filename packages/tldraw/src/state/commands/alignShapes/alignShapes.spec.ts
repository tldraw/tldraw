import Vec from '@tldraw/vec'
import { mockDocument, TLDrawTestApp } from '~test'
import { AlignType, TLDrawShapeType } from '~types'

describe('Align command', () => {
  const state = new TLDrawTestApp()

  describe('when less than two shapes are selected', () => {
    it('does nothing', () => {
      state.loadDocument(mockDocument).select('rect2')
      const initialState = state.state
      state.align(AlignType.Top)
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  describe('when multiple shapes are selected', () => {
    beforeEach(() => {
      state.loadDocument(mockDocument)
      state.selectAll()
    })

    it('does, undoes and redoes command', () => {
      state.align(AlignType.Top)

      expect(state.getShape('rect2').point).toEqual([100, 0])

      state.undo()

      expect(state.getShape('rect2').point).toEqual([100, 100])

      state.redo()

      expect(state.getShape('rect2').point).toEqual([100, 0])
    })

    it('aligns top', () => {
      state.align(AlignType.Top)

      expect(state.getShape('rect2').point).toEqual([100, 0])
    })

    it('aligns right', () => {
      state.align(AlignType.Right)

      expect(state.getShape('rect1').point).toEqual([100, 0])
    })

    it('aligns bottom', () => {
      state.align(AlignType.Bottom)

      expect(state.getShape('rect1').point).toEqual([0, 100])
    })

    it('aligns left', () => {
      state.align(AlignType.Left)

      expect(state.getShape('rect2').point).toEqual([0, 100])
    })

    it('aligns center horizontal', () => {
      state.align(AlignType.CenterHorizontal)

      expect(state.getShape('rect1').point).toEqual([50, 0])
      expect(state.getShape('rect2').point).toEqual([50, 100])
    })

    it('aligns center vertical', () => {
      state.align(AlignType.CenterVertical)

      expect(state.getShape('rect1').point).toEqual([0, 50])
      expect(state.getShape('rect2').point).toEqual([100, 50])
    })
  })
})

describe('when aligning groups', () => {
  it('aligns children', () => {
    const state = new TLDrawTestApp()
      .createShapes(
        { id: 'rect1', type: TLDrawShapeType.Rectangle, point: [0, 0], size: [100, 100] },
        { id: 'rect2', type: TLDrawShapeType.Rectangle, point: [100, 100], size: [100, 100] },
        { id: 'rect3', type: TLDrawShapeType.Rectangle, point: [200, 200], size: [100, 100] },
        { id: 'rect4', type: TLDrawShapeType.Rectangle, point: [0, 0], size: [200, 200] }
      )
      .group(['rect1', 'rect2'], 'groupA')
      .select('rect3', 'rect4')
      .align(AlignType.CenterVertical)

    const p0 = state.getShape('rect4').point
    const p1 = state.getShape('rect3').point

    state
      .undo()
      .delete(['rect4'])
      .selectAll()
      .align(AlignType.CenterVertical)
      .expectShapesToBeAtPoints({
        rect1: p0,
        rect2: Vec.add(p0, [100, 100]),
        rect3: p1,
      })
  })
})
