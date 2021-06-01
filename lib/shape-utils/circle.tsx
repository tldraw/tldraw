import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import { CircleShape, ShapeType } from 'types'
import { registerShapeUtils } from './index'
import { boundsContained } from 'utils/bounds'
import { intersectCircleBounds } from 'utils/intersections'
import { pointInCircle } from 'utils/hitTests'
import { translateBounds } from 'utils/utils'

const circle = registerShapeUtils<CircleShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Circle,
      isGenerated: false,
      name: 'Circle',
      parentId: 'page0',
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      radius: 1,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      style: {
        fill: '#c6cacb',
        stroke: '#000',
      },
      ...props,
    }
  },

  render({ id, radius, style }) {
    return (
      <circle
        id={id}
        cx={radius}
        cy={radius}
        r={Math.max(0, radius - Number(style.strokeWidth) / 2)}
      />
    )
  },

  applyStyles(shape, style) {
    Object.assign(shape.style, style)
    return this
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const { radius } = shape

      const bounds = {
        minX: 0,
        maxX: radius * 2,
        minY: 0,
        maxY: radius * 2,
        width: radius * 2,
        height: radius * 2,
      }

      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    return this.getBounds(shape)
  },

  getCenter(shape) {
    return [shape.point[0] + shape.radius, shape.point[1] + shape.radius]
  },

  hitTest(shape, point) {
    return pointInCircle(
      point,
      vec.addScalar(shape.point, shape.radius),
      shape.radius
    )
  },

  hitTestBounds(shape, bounds) {
    const shapeBounds = this.getBounds(shape)

    return (
      boundsContained(shapeBounds, bounds) ||
      intersectCircleBounds(
        vec.addScalar(shape.point, shape.radius),
        shape.radius,
        bounds
      ).length > 0
    )
  },

  rotateTo(shape, rotation) {
    shape.rotation = rotation
    return this
  },

  translateTo(shape, point) {
    shape.point = vec.toPrecision(point)
    return this
  },

  transform(shape, bounds, { initialShape, transformOrigin, scaleX, scaleY }) {
    shape.radius =
      initialShape.radius * Math.min(Math.abs(scaleX), Math.abs(scaleY))

    shape.point = [
      bounds.minX +
        (bounds.width - shape.radius * 2) *
          (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
      bounds.minY +
        (bounds.height - shape.radius * 2) *
          (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
    ]

    return this
  },

  transformSingle(shape, bounds, info) {
    shape.radius = Math.min(bounds.width, bounds.height) / 2
    shape.point = [bounds.minX, bounds.minY]
    return this
  },

  setProperty(shape, prop, value) {
    shape[prop] = value
    return this
  },

  canTransform: true,
  canChangeAspectRatio: false,
  canStyleFill: true,
})

export default circle
