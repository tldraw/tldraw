import { getShapeUtils } from 'state/shape-utils'
import { getCommonBounds } from 'utils'
import TestState, { arrowId, rectangleId } from './test-utils'

describe('selection', () => {
  const tt = new TestState()

  it('measures correct bounds for selected item', () => {
    // Note: Each item should test its own bounds in its ./shapes/[shape].tsx file

    const shape = tt.getShape(rectangleId)

    tt.deselectAll().clickShape(rectangleId)

    expect(tt.state.values.selectedBounds).toStrictEqual(
      getShapeUtils(shape).getBounds(shape)
    )
  })

  it('measures correct bounds for rotated selected item', () => {
    const shape = tt.getShape(rectangleId)

    getShapeUtils(shape).rotateBy(shape, Math.PI * 2 * Math.random())

    tt.deselectAll().clickShape(rectangleId)

    expect(tt.state.values.selectedBounds).toStrictEqual(
      getShapeUtils(shape).getBounds(shape)
    )

    getShapeUtils(shape).rotateBy(shape, -Math.PI * 2 * Math.random())

    expect(tt.state.values.selectedBounds).toStrictEqual(
      getShapeUtils(shape).getBounds(shape)
    )
  })

  it('measures correct bounds for selected items', () => {
    const shape1 = tt.getShape(rectangleId)
    const shape2 = tt.getShape(arrowId)

    tt.deselectAll()
      .clickShape(shape1.id)
      .clickShape(shape2.id, { shiftKey: true })

    expect(tt.state.values.selectedBounds).toStrictEqual(
      getCommonBounds(
        getShapeUtils(shape1).getRotatedBounds(shape1),
        getShapeUtils(shape2).getRotatedBounds(shape2)
      )
    )
  })

  it('measures correct bounds for rotated selected items', () => {
    const shape1 = tt.getShape(rectangleId)
    const shape2 = tt.getShape(arrowId)

    getShapeUtils(shape1).rotateBy(shape1, Math.PI * 2 * Math.random())
    getShapeUtils(shape2).rotateBy(shape2, Math.PI * 2 * Math.random())

    tt.deselectAll()
      .clickShape(shape1.id)
      .clickShape(shape2.id, { shiftKey: true })

    expect(tt.state.values.selectedBounds).toStrictEqual(
      getCommonBounds(
        getShapeUtils(shape1).getRotatedBounds(shape1),
        getShapeUtils(shape2).getRotatedBounds(shape2)
      )
    )
  })
})
