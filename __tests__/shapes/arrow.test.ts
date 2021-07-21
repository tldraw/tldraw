import { ArrowShape, ShapeType } from 'types'
import TestState from '../test-utils'

describe('arrow shape', () => {
  const tt = new TestState()
  tt.resetDocumentState().save()

  describe('creating arrows', () => {
    it('creates shape', () => {
      tt.reset().restore().send('SELECTED_ARROW_TOOL')

      expect(tt.state.isIn('arrow.creating')).toBe(true)

      tt.startClick('canvas').movePointerBy([100, 100]).stopClick('canvas')

      const id = tt.getSortedPageShapeIds()[0]

      const shape = tt.getShape<ArrowShape>(id)

      tt.assertShapeType(id, ShapeType.Arrow)

      expect(shape.handles.start.point).toEqual([0, 0])
      expect(shape.handles.bend.point).toEqual([50.5, 50.5])
      expect(shape.handles.end.point).toEqual([101, 101])
    })

    it('creates shapes when pointing a shape', () => {
      tt.reset().restore().send('SELECTED_ARROW_TOOL').send('TOGGLED_TOOL_LOCK')

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
        .send('SELECTED_ARROW_TOOL')

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

  it('creates compass-aligned shape with shift key', () => {
    // TODO
    null
  })

  it('changes start handle', () => {
    // TODO
    null
  })

  it('changes end handle', () => {
    // TODO
    null
  })

  it('changes bend handle', () => {
    // TODO
    null
  })

  it('resets bend handle when double-pointed', () => {
    // TODO
    null
  })
})
