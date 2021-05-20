import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { DotShape, ShapeType } from "types"
import { registerShapeUtils } from "./index"
import { boundsContained } from "utils/bounds"
import { intersectCircleBounds } from "utils/intersections"
import styled from "styles"
import { DotCircle } from "components/canvas/misc"
import { translateBounds } from "utils/utils"

const dot = registerShapeUtils<DotShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Dot,
      isGenerated: false,
      name: "Dot",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      style: {
        fill: "#c6cacb",
        stroke: "#000",
      },
      ...props,
    }
  },

  render({ id }) {
    return <DotCircle id={id} cx={0} cy={0} r={4} />
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
    return shape
  },

  scale(shape, scale: number) {
    return shape
  },

  translate(shape, delta) {
    shape.point = vec.add(shape.point, delta)
    return shape
  },

  transform(shape, bounds) {
    shape.point = [bounds.minX, bounds.minY]

    return shape
  },

  transformSingle(shape, bounds, info) {
    return this.transform(shape, bounds, info)
  },

  canTransform: false,
})

export default dot
