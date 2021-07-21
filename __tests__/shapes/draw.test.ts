import { ShapeType } from 'types'
import TestState from '../test-utils'

describe('draw shape', () => {
  const tt = new TestState()
  tt.resetDocumentState().save()

  describe('creating draws', () => {
    it('creates shape', () => {
      tt.reset().restore().send('SELECTED_DRAW_TOOL')

      expect(tt.state.isIn('draw.creating')).toBe(true)

      tt.startClick('canvas').movePointerBy([100, 100]).stopClick('canvas')

      const id = tt.getSortedPageShapeIds()[0]

      tt.assertShapeType(id, ShapeType.Draw)
    })

    it('creates shapes when pointing a shape', () => {
      tt.reset().restore().send('SELECTED_DRAW_TOOL').send('TOGGLED_TOOL_LOCK')

      tt.startClick('canvas').movePointerBy([100, 100]).stopClick('canvas')
      tt.startClick('canvas').movePointerBy([-200, 100]).stopClick('canvas')

      expect(tt.getSortedPageShapeIds()).toHaveLength(2)
    })

    it('creates shapes when shape locked', () => {
      tt.reset()
        .restore()
        .createShape(
          {
            type: ShapeType.Rectangle,
            point: [0, 0],
            size: [100, 100],
            childIndex: 1,
          },
          'rect1'
        )
        .send('SELECTED_DRAW_TOOL')

      tt.startClick('rect1').movePointerBy([100, 100]).stopClick('canvas')

      expect(tt.getSortedPageShapeIds()).toHaveLength(2)
    })

    it('cancels shape while creating', () => {
      // TODO
      null
    })
  })

  it('moves shape', () => {
    // TODO
    null
  })

  it('rotates shape', () => {
    // TODO
    null
  })

  it('rotates shape in a group', () => {
    // TODO
    null
  })

  it('measures shape bounds', () => {
    // TODO
    null
  })

  it('measures shape rotated bounds', () => {
    // TODO
    null
  })

  it('transforms single shape', () => {
    // TODO
    null
  })

  it('transforms in a group', () => {
    // TODO
    null
  })

  /* -------------------- Specific -------------------- */

  it('closes the shape when the start and end points are near enough', () => {
    // TODO
    null
  })

  it('remains closed after resizing up', () => {
    // TODO
    null
  })
})
