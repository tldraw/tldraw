import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { RayShape, ShapeType } from "types"
import { createShape } from "./index"
import { boundsContained } from "utils/bounds"
import { intersectCircleBounds } from "utils/intersections"
import { DotCircle } from "components/canvas/misc"

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
      direction: [0, 1],
      rotation: 0,
      style: {
        fill: "rgba(142, 143, 142, 1.000)",
        stroke: "#000",
        strokeWidth: 1,
      },
      ...props,
    }
  },

  render({ id, direction }) {
    const [x2, y2] = vec.add([0, 0], vec.mul(direction, 100000))

    return (
      <g id={id}>
        <line x1={0} y1={0} x2={x2} y2={y2} />
        <DotCircle cx={0} cy={0} r={4} />
      </g>
    )
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

  transform(shape, bounds) {
    shape.point = [bounds.minX, bounds.minY]

    return shape
  },

  canTransform: false,
})

export default ray
