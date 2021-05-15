import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { LineShape, ShapeType } from "types"
import { createShape } from "./index"
import { boundsContained } from "utils/bounds"
import { intersectCircleBounds } from "utils/intersections"

const line = createShape<LineShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Line,
      isGenerated: false,
      name: "Line",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      direction: [0, 0],
      rotation: 0,
      style: {
        fill: "#777",
        stroke: "#000",
      },
      ...props,
    }
  },

  render({ id, direction }) {
    const [x1, y1] = vec.add([0, 0], vec.mul(direction, 100000))
    const [x2, y2] = vec.sub([0, 0], vec.mul(direction, 100000))

    return (
      <g id={id}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <circle cx={0} cy={0} r={4} />
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
      maxX: x + 1,
      minY: y,
      maxY: y + 1,
      width: 1,
      height: 1,
    }

    this.boundsCache.set(shape, bounds)

    return bounds
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

export default line
