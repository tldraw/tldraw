import { ShapeType } from 'types'
import TestState from '../test-utils'

describe('duplicate command', () => {
  const tt = new TestState()
  tt.resetDocumentState()
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [0, 0],
        size: [100, 100],
      },
      'rectangleShape'
    )
    .createShape(
      {
        type: ShapeType.Ellipse,
        point: [150, 150],
        radiusX: 50,
        radiusY: 50,
      },
      'ellipseShape'
    )
    .save()

  describe('when one item is selected', () => {
    it('does, undoes and redoes command', () => {
      tt.restore()

      const shapesBeforeDuplication = tt.getSortedPageShapeIds()

      tt.clickShape('rectangleShape').send('DUPLICATED')

      const shapesAfterDuplication = tt.getSortedPageShapeIds()

      const duplicatedShapeId = tt.selectedIds[0]
      const duplicatedShape = tt.getShape(duplicatedShapeId)

      expect(shapesAfterDuplication.length).toEqual(
        shapesBeforeDuplication.length + 1
      )
      expect(
        tt.assertShapeProps(duplicatedShape, {
          type: ShapeType.Rectangle,
          size: [100, 100],
        })
      )

      tt.undo()

      const shapesAfterUndo = tt.getSortedPageShapeIds()

      expect(shapesAfterUndo.length).toEqual(shapesBeforeDuplication.length)
      expect(tt.getShape(duplicatedShapeId)).toBe(undefined)
      expect(tt.idsAreSelected(['rectangleShape'])).toBe(true)

      tt.redo()

      expect(tt.getShape(duplicatedShapeId)).toBeTruthy()
      expect(tt.idsAreSelected([duplicatedShapeId])).toBe(true)
    })
  })

  describe('when multiple items are selected', () => {
    it('does, undoes and redoes command', () => {
      tt.restore()

      const shapesBeforeDuplication = tt.getSortedPageShapeIds()

      tt.clickShape('rectangleShape')
        .clickShape('ellipseShape', { shiftKey: true })
        .send('DUPLICATED')

      const shapesAfterDuplication = tt.getSortedPageShapeIds()

      const duplicatedShapesIds = tt.selectedIds
      const [duplicatedRectangle, duplicatedEllipse] = duplicatedShapesIds.map(
        (shapeId) => tt.getShape(shapeId)
      )

      expect(shapesAfterDuplication.length).toEqual(
        shapesBeforeDuplication.length * 2
      )
      expect(
        tt.assertShapeProps(duplicatedRectangle, {
          type: ShapeType.Rectangle,
          size: [100, 100],
        })
      )
      expect(
        tt.assertShapeProps(duplicatedEllipse, {
          type: ShapeType.Ellipse,
          radiusX: 50,
          radiusY: 50,
        })
      )

      tt.undo()

      const shapesAfterUndo = tt.getSortedPageShapeIds()

      expect(shapesAfterUndo.length).toEqual(shapesBeforeDuplication.length)
      duplicatedShapesIds.forEach((shapeId) => {
        expect(tt.getShape(shapeId)).toBe(undefined)
      })
      expect(tt.idsAreSelected(['rectangleShape', 'ellipseShape'])).toBe(true)

      tt.redo()

      duplicatedShapesIds.forEach((shapeId) => {
        expect(tt.getShape(shapeId)).toBeTruthy()
      })
      expect(tt.idsAreSelected(duplicatedShapesIds)).toBe(true)
    })
  })
})
