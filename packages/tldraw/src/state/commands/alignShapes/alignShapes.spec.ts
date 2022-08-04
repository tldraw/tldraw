import Vec from '@tldraw/vec'
import { mockDocument, TldrawTestApp } from '~test'
import { AlignType, TDShapeType } from '~types'

describe('Align command', () => {
  const app = new TldrawTestApp()

  describe('when less than two shapes are selected', () => {
    it('does nothing', () => {
      app.loadDocument(mockDocument).select('rect2')
      const initialState = app.state
      app.align(AlignType.Top)
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  describe('when multiple shapes are selected', () => {
    beforeEach(() => {
      app.loadDocument(mockDocument)
      app.selectAll()
    })

    it('does, undoes and redoes command', () => {
      app.align(AlignType.Top)

      expect(app.getShape('rect2').point).toEqual([100, 0])

      app.undo()

      expect(app.getShape('rect2').point).toEqual([100, 100])

      app.redo()

      expect(app.getShape('rect2').point).toEqual([100, 0])
    })

    it('aligns top', () => {
      app.align(AlignType.Top)

      expect(app.getShape('rect2').point).toEqual([100, 0])
    })

    it('aligns right', () => {
      app.align(AlignType.Right)

      expect(app.getShape('rect1').point).toEqual([100, 0])
    })

    it('aligns bottom', () => {
      app.align(AlignType.Bottom)

      expect(app.getShape('rect1').point).toEqual([0, 100])
    })

    it('aligns left', () => {
      app.align(AlignType.Left)

      expect(app.getShape('rect2').point).toEqual([0, 100])
    })

    it('aligns center horizontal', () => {
      app.align(AlignType.CenterHorizontal)

      expect(app.getShape('rect1').point).toEqual([50, 0])
      expect(app.getShape('rect2').point).toEqual([50, 100])
    })

    it('aligns center vertical', () => {
      app.align(AlignType.CenterVertical)

      expect(app.getShape('rect1').point).toEqual([0, 50])
      expect(app.getShape('rect2').point).toEqual([100, 50])
    })
  })
})

describe('when aligning groups', () => {
  it('aligns children', () => {
    const app = new TldrawTestApp()
      .createShapes(
        { id: 'rect1', type: TDShapeType.Rectangle, point: [0, 0], size: [100, 100] },
        { id: 'rect2', type: TDShapeType.Rectangle, point: [100, 100], size: [100, 100] },
        { id: 'rect3', type: TDShapeType.Rectangle, point: [200, 200], size: [100, 100] },
        { id: 'rect4', type: TDShapeType.Rectangle, point: [0, 0], size: [200, 200] }
      )
      .group(['rect1', 'rect2'], 'groupA')
      .select('rect3', 'rect4')
      .align(AlignType.CenterVertical)

    const p0 = app.getShape('rect4').point
    const p1 = app.getShape('rect3').point

    app
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
