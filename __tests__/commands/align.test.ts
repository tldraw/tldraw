import { AlignType, ShapeType } from 'types'
import TestState from '../test-utils'

describe('align command', () => {
  const tt = new TestState()
  tt.resetDocumentState()
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [0, 0],
        size: [150, 100],
      },
      'rectangle'
    )
    .createShape(
      {
        type: ShapeType.Ellipse,
        point: [150, 150],
        radiusX: 50,
        radiusY: 50,
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

        expect(initialRectangleBounds.minY).toEqual(0)
        expect(initialEllipseBounds.minY).toEqual(150)

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
      it.todo('does, undoes and redoes command')
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
