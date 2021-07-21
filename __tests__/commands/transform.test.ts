import { Corner, Edge, RectangleShape, ShapeType } from 'types'
import { rng } from 'utils'
import TestState from '../test-utils'

describe('transform command', () => {
  const tt = new TestState()
  tt.resetDocumentState()
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [100, 100],
        size: [100, 100],
        childIndex: 1,
      },
      'rect1'
    )
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [500, 400],
        size: [200, 200],
        childIndex: 2,
      },
      'rect2'
    )
    .clickShape('rect1')
    .clickShape('rect2', { shiftKey: true })
    .save()

  function getSnapInfo() {
    return {
      rect1: {
        point: tt.getShape<RectangleShape>('rect1').point,
        size: tt.getShape<RectangleShape>('rect1').size,
      },
      rect2: {
        point: tt.getShape<RectangleShape>('rect2').point,
        size: tt.getShape<RectangleShape>('rect2').size,
      },
    }
  }

  it('sets up initial bounds', () => {
    expect(tt.selectedIds).toEqual(['rect1', 'rect2'])

    expect(tt.state.values.selectedBounds).toMatchObject({
      minX: 100,
      minY: 100,
      maxX: 700,
      maxY: 600,
      width: 600,
      height: 500,
    })
  })

  describe('when transforming from the bottom-right corner', () => {
    it('does command', () => {
      // Restore the saved data state, with the initial selection
      tt.restore()

      // Move the bounds handle
      tt.startClickingBoundsHandle(Corner.BottomRight)
        .movePointerBy([100, 100])
        .stopClickingBounds()

      // Ensure the bounds have been transformed
      expect(tt.state.values.selectedBounds).toMatchObject({
        minX: 100,
        minY: 100,
        maxX: 800,
        maxY: 700,
        width: 700,
        height: 600,
      })

      expect(getSnapInfo()).toMatchSnapshot()
    })

    it('un-does command', () => {
      // Repeat the same actions, but add an undo at the end
      tt.restore()
        .startClickingBoundsHandle(Corner.BottomRight)
        .movePointerBy([100, 100])
        .stopClickingBounds()
        .undo()

      // Expect the bounds to be the initial bounds
      expect(tt.state.values.selectedBounds).toMatchObject({
        minX: 100,
        minY: 100,
        maxX: 700,
        maxY: 600,
        width: 600,
        height: 500,
      })

      expect(getSnapInfo()).toMatchSnapshot()
    })

    it('re-does command', () => {
      // Repeat the same actions but add an undo and a redo at the end
      tt.restore()
        .startClickingBoundsHandle(Corner.BottomRight)
        .movePointerBy([100, 100])
        .stopClickingBounds()
        .undo()
        .redo()

      // Expect the bounds to be the transformed bounds
      expect(tt.state.values.selectedBounds).toMatchObject({
        minX: 100,
        minY: 100,
        maxX: 800,
        maxY: 700,
        width: 700,
        height: 600,
      })

      expect(getSnapInfo()).toMatchSnapshot()
    })
  })

  // From here on, let's assume that the undo and redos work as expected,
  // so let's only test the command's execution.

  it('transforms from the top edge', () => {
    tt.restore()
      .startClickingBoundsHandle(Edge.Top)
      .movePointerBy([100, 100])
      .stopClickingBounds()

    // Ensure the bounds have been transformed
    expect(tt.state.values.selectedBounds).toMatchObject({
      minX: 100,
      minY: 200,
      maxX: 700,
      maxY: 600,
      width: 600,
      height: 400,
    })

    expect(getSnapInfo()).toMatchSnapshot()
  })

  it('transforms from the right edge', () => {
    tt.restore()
      .startClickingBoundsHandle(Edge.Right)
      .movePointerBy([100, 100])
      .stopClickingBounds()

    // Ensure the bounds have been transformed
    expect(tt.state.values.selectedBounds).toMatchObject({
      minX: 100,
      minY: 100,
      maxX: 800,
      maxY: 600,
      width: 700,
      height: 500,
    })

    expect(getSnapInfo()).toMatchSnapshot()
  })

  it('transforms from the bottom edge', () => {
    tt.restore()
      .startClickingBoundsHandle(Edge.Bottom)
      .movePointerBy([100, 100])
      .stopClickingBounds()

    // Ensure the bounds have been transformed
    expect(tt.state.values.selectedBounds).toMatchObject({
      minX: 100,
      minY: 100,
      maxX: 700,
      maxY: 700,
      width: 600,
      height: 600,
    })

    expect(getSnapInfo()).toMatchSnapshot()
  })

  it('transforms from the left edge', () => {
    tt.restore()
      .startClickingBoundsHandle(Edge.Left)
      .movePointerBy([100, 100])
      .stopClickingBounds()

    // Ensure the bounds have been transformed
    expect(tt.state.values.selectedBounds).toMatchObject({
      minX: 200,
      minY: 100,
      maxX: 700,
      maxY: 600,
      width: 500,
      height: 500,
    })

    expect(getSnapInfo()).toMatchSnapshot()
  })

  it('transforms from the top-left corner', () => {
    tt.restore()
      .startClickingBoundsHandle(Corner.TopLeft)
      .movePointerBy([100, 100])
      .stopClickingBounds()

    // Ensure the bounds have been transformed
    expect(tt.state.values.selectedBounds).toMatchObject({
      minX: 200,
      minY: 200,
      maxX: 700,
      maxY: 600,
      width: 500,
      height: 400,
    })

    expect(getSnapInfo()).toMatchSnapshot()
  })

  it('transforms from the top-right corner', () => {
    tt.restore()
      .startClickingBoundsHandle(Corner.TopRight)
      .movePointerBy([100, 100])
      .stopClickingBounds()

    // Ensure the bounds have been transformed
    expect(tt.state.values.selectedBounds).toMatchObject({
      minX: 100,
      minY: 200,
      maxX: 800,
      maxY: 600,
      width: 700,
      height: 400,
    })

    expect(getSnapInfo()).toMatchSnapshot()
  })

  it('transforms from the bottom-right corner', () => {
    tt.restore()
      .startClickingBoundsHandle(Corner.BottomRight)
      .movePointerBy([100, 100])
      .stopClickingBounds()

    // Ensure the bounds have been transformed
    expect(tt.state.values.selectedBounds).toMatchObject({
      minX: 100,
      minY: 100,
      maxX: 800,
      maxY: 700,
      width: 700,
      height: 600,
    })

    expect(getSnapInfo()).toMatchSnapshot()
  })

  it('transforms from the bottom-left corner', () => {
    tt.restore()
      .startClickingBoundsHandle(Corner.BottomLeft)
      .movePointerBy([100, 100])
      .stopClickingBounds()

    // Ensure the bounds have been transformed
    expect(tt.state.values.selectedBounds).toMatchObject({
      minX: 200,
      minY: 100,
      maxX: 700,
      maxY: 700,
      width: 500,
      height: 600,
    })

    expect(getSnapInfo()).toMatchSnapshot()
  })

  describe('snapshot tests', () => {
    it('transforms corners', () => {
      const getRandom = rng('transform-tests-random-number-generator')

      for (const corner of Object.values(Corner)) {
        tt.restore()
          .startClickingBoundsHandle(corner)
          .movePointerBy([getRandom() * 200, getRandom() * 200])
          .stopClickingBounds()

        // Ensure the bounds have been transformed
        expect(tt.state.values.selectedBounds).toMatchSnapshot()

        expect(getSnapInfo()).toMatchSnapshot()
      }
    })

    it('transforms edges', () => {
      const getRandom = rng('transform-tests-random-number-generator')

      for (const edge of Object.values(Edge)) {
        tt.restore()
          .startClickingBoundsHandle(edge)
          .movePointerBy([getRandom() * 200, getRandom() * 200])
          .stopClickingBounds()

        // Ensure the bounds have been transformed
        expect(tt.state.values.selectedBounds).toMatchSnapshot()

        expect(getSnapInfo()).toMatchSnapshot()
      }
    })

    it('shift-transforms corners', () => {
      const getRandom = rng('transform-tests-random-number-generator')

      for (const corner of Object.values(Corner)) {
        tt.restore()
          .startClickingBoundsHandle(corner)
          .movePointerBy([getRandom() * 200, getRandom() * 200], {
            shiftKey: true,
          })
          .stopClickingBounds()

        // Ensure the bounds have been transformed
        expect(tt.state.values.selectedBounds).toMatchSnapshot()

        expect(getSnapInfo()).toMatchSnapshot()
      }
    })

    it('shift-transforms edges', () => {
      const getRandom = rng('transform-tests-random-number-generator')

      for (const edge of Object.values(Edge)) {
        tt.restore()
          .startClickingBoundsHandle(edge)
          .movePointerBy([getRandom() * 200, getRandom() * 200], {
            shiftKey: true,
          })
          .stopClickingBounds()

        // Ensure the bounds have been transformed
        expect(tt.state.values.selectedBounds).toMatchSnapshot()

        expect(getSnapInfo()).toMatchSnapshot()
      }
    })
  })
})
