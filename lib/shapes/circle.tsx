import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { CircleShape, ShapeType } from "types"
import { boundsCache } from "./index"
import { boundsContained } from "utils/bounds"
import { intersectCircleBounds } from "utils/intersections"
import { createShape } from "./base-shape"

const circle = createShape<CircleShape>({
  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Circle,
      name: "Circle",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      radius: 20,
      rotation: 0,
      style: {},
      ...props,
    }
  },

  render({ id, radius }) {
    return <circle id={id} cx={radius} cy={radius} r={radius} />
  },

  getBounds(shape) {
    if (boundsCache.has(shape)) {
      return boundsCache.get(shape)
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

    boundsCache.set(shape, bounds)
    return bounds
  },

  hitTest(shape, test) {
    return (
      vec.dist(vec.addScalar(shape.point, shape.radius), test) < shape.radius
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
})

export default circle
