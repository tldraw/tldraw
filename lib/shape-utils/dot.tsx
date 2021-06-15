import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import { DotShape, ShapeType } from 'types'
import { registerShapeUtils } from './index'
import { boundsContained } from 'utils/bounds'
import { intersectCircleBounds } from 'utils/intersections'
import { translateBounds } from 'utils/utils'
import { defaultStyle } from 'lib/shape-styles'

const dot = registerShapeUtils<DotShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      seed: Math.random(),
      type: ShapeType.Dot,
      isGenerated: false,
      name: 'Dot',
      parentId: 'page1',
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: {
        ...defaultStyle,
        ...props.style,
        isFilled: false,
      },
    }
  },

  render({ id }) {
    return <use id={id} href="#dot" fill="black" />
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const bounds = {
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
        width: 1,
        height: 1,
      }

      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    return this.getBounds(shape)
  },

  getCenter(shape) {
    return shape.point
  },

  hitTest(shape, test) {
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
