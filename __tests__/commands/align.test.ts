import { ShapeType } from 'types'
import TestState from '../test-utils'

describe('align command', () => {
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

  describe('read-only mode', () => {
    it('is disabled', () => {
      tt.restore()
      tt.state.send('TOGGLED_READ_ONLY')

      tt.clickShape('rectangleShape').clickShape('ellipseShape', {
        shiftKey: true,
      })

      expect(tt.state.can('ALIGNED')).toBe(false)
    })
  })

  describe('when one item is selected', () => {
    it('is disabled', () => {
      tt.restore()

      tt.clickShape('rectangleShape').send('ALIGNED')

      expect(tt.state.can('ALIGNED')).toBe(false)
    })
  })

  describe('when multiple items are selected', () => {
    describe('top', () => {
      it.todo('does, undoes and redoes command')
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
