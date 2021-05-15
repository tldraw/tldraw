import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { RayShape, ShapeType } from "types"
import { createShape } from "./index"
import { boundsContained } from "utils/bounds"
import { intersectCircleBounds } from "utils/intersections"

const ray = createShape<RayShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Ray,
      isGenerated: false,
      name: "Ray",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      direction: [0, 0],
      rotation: 0,
      style: {},
      ...props,
    }
  },

  render({ id }) {
    return <circle id={id} cx={4} cy={4} r={4} />
  },

  getBounds(shape) {
    if (this.boundsCache.has(shape)) {
      return this.boundsCache.get(shape)
    }

    const {
      point: [x, y],
    } = shape

    const bounds = {
      minX: x,
      maxX: x + 8,
      minY: y,
      maxY: y + 8,
      width: 8,
      height: 8,
    }

    this.boundsCache.set(shape, bounds)

    return bounds
  },

  hitTest(shape, test) {
    return vec.dist(shape.point, test) < 4
  },

  hitTestBounds(this, shape, brushBounds) {
    const shapeBounds = this.getBounds(shape)
    return (
      boundsContained(shapeBounds, brushBounds) ||
      intersectCircleBounds(shape.point, 4, brushBounds).length > 0
    )
  },

  rotate(shape) {
    return shape
  },

  translate(shape, delta) {
    shape.point = vec.add(shape.point, delta)
    return shape
  },

  scale(shape, scale: number) {
    return shape
  },

  stretch(shape, scaleX: number, scaleY: number) {
    return shape
  },

  transform(shape, bounds) {
    return shape
  },

  canTransform: false,
})

export default ray
