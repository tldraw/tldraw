import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { CircleShape, ShapeType } from "types"
import { createShape } from "./index"
import { boundsContained } from "utils/bounds"
import { intersectCircleBounds } from "utils/intersections"
import { pointInCircle } from "utils/hitTests"

const circle = createShape<CircleShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Circle,
      name: "Circle",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      radius: 20,
      style: {},
      ...props,
    }
  },

  render({ id, radius }) {
    return <circle id={id} cx={radius} cy={radius} r={radius} />
  },

  getBounds(shape) {
    if (this.boundsCache.has(shape)) {
      return this.boundsCache.get(shape)
    }

    const {
      point: [x, y],
      radius,
    } = shape

    const bounds = {
      minX: x,
      maxX: x + radius * 2,
      minY: y,
      maxY: y + radius * 2,
      width: radius * 2,
      height: radius * 2,
    }

    this.boundsCache.set(shape, bounds)

    return bounds
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

  rotate(shape) {
    return shape
  },

  translate(shape, delta) {
    shape.point = vec.add(shape.point, delta)
    return shape
  },

  scale(shape, scale) {
    return shape
  },

  stretch(shape, scaleX, scaleY) {
    return shape
  },

  transform(shape, bounds) {
    // shape.point = [bounds.minX, bounds.minY]
    shape.radius = Math.min(bounds.width, bounds.height) / 2
    shape.point = [
      bounds.minX + bounds.width / 2 - shape.radius,
      bounds.minY + bounds.height / 2 - shape.radius,
    ]

    return shape
  },
})

export default circle
