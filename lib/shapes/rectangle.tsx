import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { RectangleShape, ShapeType } from "types"
import { createShape } from "./index"
import { boundsCollidePolygon, boundsContainPolygon } from "utils/bounds"
import { getBoundsFromPoints, rotateBounds, translateBounds } from "utils/utils"

const rectangle = createShape<RectangleShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Rectangle,
      isGenerated: false,
      name: "Rectangle",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      size: [1, 1],
      rotation: 0,
      style: {
        fill: "rgba(142, 143, 142, 1.000)",
        stroke: "#000",
      },
      ...props,
    }
  },

  render({ id, size }) {
    return <rect id={id} width={size[0]} height={size[1]} />
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const [width, height] = shape.size
      const bounds = {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      }

      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    const b = this.getBounds(shape)
    const center = [b.minX + b.width / 2, b.minY + b.height / 2]

    // Rotate corners of the shape, then find the minimum among those points.
    const rotatedCorners = [
      [b.minX, b.minY],
      [b.maxX, b.minY],
      [b.maxX, b.maxY],
      [b.minX, b.maxY],
    ].map((point) => vec.rotWith(point, center, shape.rotation))

    return getBoundsFromPoints(rotatedCorners)
  },

  getCenter(shape) {
    const bounds = this.getRotatedBounds(shape)
    return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
  },

  hitTest(shape) {
    return true
  },

  hitTestBounds(shape, brushBounds) {
    const b = this.getBounds(shape)
    const center = [b.minX + b.width / 2, b.minY + b.height / 2]

    const rotatedCorners = [
      [b.minX, b.minY],
      [b.maxX, b.minY],
      [b.maxX, b.maxY],
      [b.minX, b.maxY],
    ].map((point) => vec.rotWith(point, center, shape.rotation))

    return (
      boundsContainPolygon(brushBounds, rotatedCorners) ||
      boundsCollidePolygon(brushBounds, rotatedCorners)
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

  transform(shape, bounds) {
    shape.point = [bounds.minX, bounds.minY]
    shape.size = [bounds.width, bounds.height]

    return shape
  },

  canTransform: true,
})

export default rectangle
