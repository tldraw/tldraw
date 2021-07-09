import { getFromCache, uniqueId } from 'utils/utils'
import { DotShape, ShapeType } from 'types'
import { intersectCircleBounds } from 'utils/intersections'
import { boundsContained, translateBounds } from 'utils'
import { defaultStyle, getShapeStyle } from 'state/shape-styles'
import { registerShapeUtils } from './register'

const dot = registerShapeUtils<DotShape>({
  boundsCache: new WeakMap([]),

  defaultProps: {
    id: uniqueId(),
    type: ShapeType.Dot,
    name: 'Dot',
    parentId: 'page1',
    childIndex: 0,
    point: [0, 0],
    rotation: 0,
    style: defaultStyle,
  },

  render(shape) {
    const styles = getShapeStyle(shape.style)

    return <use href="#dot" stroke={styles.stroke} fill={styles.stroke} />
  },

  getBounds(shape) {
    const bounds = getFromCache(this.boundsCache, shape, (cache) => {
      cache.set(shape, {
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
        width: 1,
        height: 1,
      })
    })

    return translateBounds(bounds, shape.point)
  },

  getRotatedBounds(shape) {
    return this.getBounds(shape)
  },

  getCenter(shape) {
    return shape.point
  },

  hitTest() {
    return true
  },

  hitTestBounds(this, shape, brushBounds) {
    const shapeBounds = this.getBounds(shape)
    return (
      boundsContained(shapeBounds, brushBounds) ||
      intersectCircleBounds(shape.point, 4, brushBounds).length > 0
    )
  },

  transform(shape, bounds) {
    shape.point = [bounds.minX, bounds.minY]

    return this
  },

  canTransform: false,
  canChangeAspectRatio: false,
})

export default dot
