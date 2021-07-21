import { ShapeType } from 'types'
import TestState from '../test-utils'

describe('toggle command', () => {
  const tt = new TestState()
  tt.resetDocumentState()
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [0, 0],
        size: [100, 100],
        childIndex: 1,
        isLocked: false,
        isHidden: false,
        isAspectRatioLocked: false,
      },
      'rect1'
    )
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [400, 0],
        size: [100, 100],
        childIndex: 2,
        isHidden: false,
        isLocked: false,
        isAspectRatioLocked: false,
      },
      'rect2'
    )
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [800, 0],
        size: [100, 100],
        childIndex: 3,
        isHidden: true,
        isLocked: true,
        isAspectRatioLocked: true,
      },
      'rect3'
    )
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [1000, 0],
        size: [100, 100],
        childIndex: 4,
        isHidden: true,
        isLocked: true,
        isAspectRatioLocked: true,
      },
      'rect4'
    )
    .save()

  describe('toggles properties on single shape', () => {
    it('does command', () => {
      tt.restore().clickShape('rect1')

      tt.send('TOGGLED_SHAPE_LOCK')

      expect(tt.getShape('rect1').isLocked).toBe(true)

      tt.send('TOGGLED_SHAPE_LOCK')

      expect(tt.getShape('rect1').isLocked).toBe(false)
    })

    it('undoes and redoes command', () => {
      // Restore the saved data state, with the initial selection
      tt.restore().clickShape('rect1')

      tt.send('TOGGLED_SHAPE_LOCK')

      tt.send('UNDO')

      expect(tt.getShape('rect1').isLocked).toBe(false)

      tt.send('REDO')

      expect(tt.getShape('rect1').isLocked).toBe(true)
    })
  })

  describe('toggles properties on shapes with matching properties, starting from false', () => {
    it('does command', () => {
      // Restore the saved data state, with the initial selection
      tt.restore().clickShape('rect1').clickShape('rect2', { shiftKey: true })

      tt.send('TOGGLED_SHAPE_LOCK')

      expect(tt.getShape('rect1').isLocked).toBe(true)
      expect(tt.getShape('rect2').isLocked).toBe(true)

      tt.send('TOGGLED_SHAPE_LOCK')

      expect(tt.getShape('rect1').isLocked).toBe(false)
      expect(tt.getShape('rect2').isLocked).toBe(false)

      tt.send('TOGGLED_SHAPE_LOCK')

      expect(tt.getShape('rect1').isLocked).toBe(true)
      expect(tt.getShape('rect2').isLocked).toBe(true)
    })

    it('undoes and redoes command', () => {
      // Restore the saved data state, with the initial selection
      tt.restore().clickShape('rect1').clickShape('rect2', { shiftKey: true })

      tt.send('TOGGLED_SHAPE_LOCK').undo()

      expect(tt.getShape('rect1').isLocked).toBe(false)
      expect(tt.getShape('rect2').isLocked).toBe(false)

      tt.redo()

      expect(tt.getShape('rect1').isLocked).toBe(true)
      expect(tt.getShape('rect2').isLocked).toBe(true)
    })
  })

  describe('toggles properties on shapes with matching properties, starting from true', () => {
    it('does command', () => {
      // Restore the saved data state, with the initial selection
      tt.restore().clickShape('rect3').clickShape('rect4', { shiftKey: true })

      tt.send('TOGGLED_SHAPE_LOCK')

      expect(tt.getShape('rect3').isLocked).toBe(false)
      expect(tt.getShape('rect4').isLocked).toBe(false)

      tt.send('TOGGLED_SHAPE_LOCK')

      expect(tt.getShape('rect3').isLocked).toBe(true)
      expect(tt.getShape('rect4').isLocked).toBe(true)
    })

    it('undoes and redoes command', () => {
      // Restore the saved data state, with the initial selection
      tt.restore().clickShape('rect3').clickShape('rect4', { shiftKey: true })

      tt.send('TOGGLED_SHAPE_LOCK').undo()

      expect(tt.getShape('rect3').isLocked).toBe(true)
      expect(tt.getShape('rect4').isLocked).toBe(true)

      tt.redo()

      expect(tt.getShape('rect3').isLocked).toBe(false)
      expect(tt.getShape('rect4').isLocked).toBe(false)
    })
  })

  describe('toggles properties on shapes with different properties', () => {
    it('does command', () => {
      // Restore the saved data state, with the initial selection
      tt.restore()
        .clickShape('rect1')
        .clickShape('rect2', { shiftKey: true })
        .clickShape('rect3', { shiftKey: true })

      tt.send('TOGGLED_SHAPE_LOCK')

      expect(tt.getShape('rect1').isLocked).toBe(true)
      expect(tt.getShape('rect2').isLocked).toBe(true)
      expect(tt.getShape('rect3').isLocked).toBe(true)

      tt.send('TOGGLED_SHAPE_LOCK')

      expect(tt.getShape('rect1').isLocked).toBe(false)
      expect(tt.getShape('rect2').isLocked).toBe(false)
      expect(tt.getShape('rect3').isLocked).toBe(false)
    })

    it('undoes and redoes command', () => {
      tt.restore()
        .clickShape('rect1')
        .clickShape('rect2', { shiftKey: true })
        .clickShape('rect3', { shiftKey: true })

      tt.send('TOGGLED_SHAPE_LOCK').undo()

      expect(tt.getShape('rect1').isLocked).toBe(false)
      expect(tt.getShape('rect2').isLocked).toBe(false)
      expect(tt.getShape('rect3').isLocked).toBe(true)

      tt.redo()

      expect(tt.getShape('rect1').isLocked).toBe(true)
      expect(tt.getShape('rect2').isLocked).toBe(true)
      expect(tt.getShape('rect3').isLocked).toBe(true)
    })
  })

  describe('catch all for other toggle props', () => {
    const eventPropertyPairs = {
      TOGGLED_SHAPE_LOCK: 'isLocked',
      TOGGLED_SHAPE_HIDE: 'isHidden',
      TOGGLED_SHAPE_ASPECT_LOCK: 'isAspectRatioLocked',
    }

    it('toggles all event property pairs', () => {
      Object.entries(eventPropertyPairs).forEach(([eventName, propName]) => {
        // Restore the saved data state, with the initial selection
        tt.restore()
          .clickShape('rect1')
          .clickShape('rect2', { shiftKey: true })
          .clickShape('rect3', { shiftKey: true })

        tt.send(eventName)

        expect(tt.getShape('rect1')[propName]).toBe(true)
        expect(tt.getShape('rect2')[propName]).toBe(true)
        expect(tt.getShape('rect3')[propName]).toBe(true)

        tt.undo()

        expect(tt.getShape('rect1')[propName]).toBe(false)
        expect(tt.getShape('rect2')[propName]).toBe(false)
        expect(tt.getShape('rect3')[propName]).toBe(true)

        tt.redo()

        expect(tt.getShape('rect1')[propName]).toBe(true)
        expect(tt.getShape('rect2')[propName]).toBe(true)
        expect(tt.getShape('rect3')[propName]).toBe(true)

        tt.send(eventName)

        expect(tt.getShape('rect1')[propName]).toBe(false)
        expect(tt.getShape('rect2')[propName]).toBe(false)
        expect(tt.getShape('rect3')[propName]).toBe(false)
      })
    })
  })
})
