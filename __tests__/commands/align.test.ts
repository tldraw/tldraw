import { AlignType, ShapeType } from 'types'
import TestState from '../test-utils'

const RECTANGLE_SHAPE = {
  pointX: 0,
  pointY: 0,
  width: 250,
  height: 150,
}

const ELLIPSE_SHAPE = {
  pointX: 200,
  pointY: 200,
  width: 100,
  height: 100,
}

describe('align command', () => {
  const tt = new TestState()
  tt.resetDocumentState()
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [RECTANGLE_SHAPE.pointX, RECTANGLE_SHAPE.pointY],
        size: [RECTANGLE_SHAPE.width, RECTANGLE_SHAPE.height],
      },
      'rectangle'
    )
    .createShape(
      {
        type: ShapeType.Ellipse,
        point: [ELLIPSE_SHAPE.pointX, ELLIPSE_SHAPE.pointY],
        radiusX: ELLIPSE_SHAPE.width / 2,
        radiusY: ELLIPSE_SHAPE.height / 2,
      },
      'ellipse'
    )
    .save()

  describe('read-only mode', () => {
    it('is disabled', () => {
      tt.restore()
      tt.state.send('TOGGLED_READ_ONLY')

      tt.clickShape('rectangle').clickShape('ellipse', {
        shiftKey: true,
      })

      expect(tt.state.can('ALIGNED')).toBe(false)
    })
  })

  describe('when one item is selected', () => {
    it('is disabled', () => {
      tt.restore()

      tt.clickShape('rectangle').send('ALIGNED')

      expect(tt.state.can('ALIGNED')).toBe(false)
    })
  })

  describe('when multiple items are selected', () => {
    describe('top', () => {
      it('does, undoes and redoes command', () => {
        tt.restore()

        const initialRectangleBounds = tt.getShapeBounds('rectangle')
        const initialEllipseBounds = tt.getShapeBounds('ellipse')

        expect(initialRectangleBounds.minY).toEqual(RECTANGLE_SHAPE.pointY)
        expect(initialEllipseBounds.minY).toEqual(ELLIPSE_SHAPE.pointY)

        tt.clickShape('rectangle')
          .clickShape('ellipse', { shiftKey: true })
          .send('ALIGNED', { type: AlignType.Top })

        const rectangleBounds = tt.getShapeBounds('rectangle')
        const ellipseBounds = tt.getShapeBounds('ellipse')

        expect(rectangleBounds.minY).toEqual(ellipseBounds.minY)

        tt.undo()

        const rectangleBoundsAfterUndo = tt.getShapeBounds('rectangle')
        const ellipseBoundsAfterUndo = tt.getShapeBounds('ellipse')

        expect(rectangleBoundsAfterUndo.minY).toEqual(
          initialRectangleBounds.minY
        )
        expect(ellipseBoundsAfterUndo.minY).toEqual(initialEllipseBounds.minY)

        tt.redo()

        const rectangleBoundsAfterRedo = tt.getShapeBounds('rectangle')
        const ellipseBoundsAfterRedo = tt.getShapeBounds('ellipse')

        expect(rectangleBoundsAfterRedo.minY).toEqual(rectangleBounds.minY)
        expect(ellipseBoundsAfterRedo.minY).toEqual(ellipseBounds.minY)
      })
    })

    describe('center vertical', () => {
      it.todo('does, undoes and redoes command')
    })

    describe('bottom', () => {
      it('does, undoes and redoes command', () => {
        tt.restore()

        const initialRectangleBounds = tt.getShapeBounds('rectangle')
        const initialEllipseBounds = tt.getShapeBounds('ellipse')

        expect(initialRectangleBounds.maxY).toEqual(
          RECTANGLE_SHAPE.pointY + RECTANGLE_SHAPE.height
        )
        expect(initialEllipseBounds.maxY).toEqual(
          ELLIPSE_SHAPE.pointY + ELLIPSE_SHAPE.height
        )

        tt.clickShape('rectangle')
          .clickShape('ellipse', { shiftKey: true })
          .send('ALIGNED', { type: AlignType.Bottom })

        const rectangleBounds = tt.getShapeBounds('rectangle')
        const ellipseBounds = tt.getShapeBounds('ellipse')

        expect(rectangleBounds.maxY).toEqual(ellipseBounds.maxY)

        tt.undo()

        const rectangleBoundsAfterUndo = tt.getShapeBounds('rectangle')
        const ellipseBoundsAfterUndo = tt.getShapeBounds('ellipse')

        expect(rectangleBoundsAfterUndo.maxY).toEqual(
          initialRectangleBounds.maxY
        )
        expect(ellipseBoundsAfterUndo.maxY).toEqual(initialEllipseBounds.maxY)

        tt.redo()

        const rectangleBoundsAfterRedo = tt.getShapeBounds('rectangle')
        const ellipseBoundsAfterRedo = tt.getShapeBounds('ellipse')

        expect(rectangleBoundsAfterRedo.maxY).toEqual(rectangleBounds.maxY)
        expect(ellipseBoundsAfterRedo.maxY).toEqual(ellipseBounds.maxY)
      })
    })

    describe('left', () => {
      it.todo('does, undoes and redoes command')
    })
    describe('center horizontal', () => {
      it.todo('does, undoes and redoes command')
    })
    describe('right', () => {
      it.todo('does, undoes and redoes command')
    })
  })
})
