import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { LineShape, ShapeType } from "types"
import { registerShapeUtils } from "./index"
import { boundsContained } from "utils/bounds"
import { intersectCircleBounds } from "utils/intersections"
import { DotCircle } from "components/canvas/misc"
import { translateBounds } from "utils/utils"

const line = registerShapeUtils<LineShape>({
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
        fill: "#c6cacb",
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
        <DotCircle cx={0} cy={0} r={3} />
      </g>
    )
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

  rotate(shape) {
    return this
  },

  translate(shape, delta) {
    shape.point = vec.add(shape.point, delta)
    return this
  },

  transform(shape, bounds) {
    shape.point = [bounds.minX, bounds.minY]

    return this
  },

  transformSingle(shape, bounds, info) {
    return this.transform(shape, bounds, info)
  },

  setParent(shape, parentId) {
    shape.parentId = parentId
    return this
  },

  setChildIndex(shape, childIndex) {
    shape.childIndex = childIndex
    return this
  },

  canTransform: false,
  canChangeAspectRatio: false,
})

export default line
