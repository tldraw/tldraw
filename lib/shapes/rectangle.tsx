import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { RectangleShape, ShapeType } from "types"
import { createShape } from "./index"
import { boundsContained, boundsCollide } from "utils/bounds"

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
    if (this.boundsCache.has(shape)) {
      return this.boundsCache.get(shape)
    }

    const {
      point: [x, y],
      size: [width, height],
    } = shape

    const bounds = {
      minX: x,
      maxX: x + width,
      minY: y,
      maxY: y + height,
      width,
      height,
    }

    this.boundsCache.set(shape, bounds)

    return bounds
  },

  getCenter(shape) {
    const bounds = this.getBounds(shape)
    return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
  },

  hitTest(shape) {
    return true
  },

  hitTestBounds(shape, brushBounds) {
    const shapeBounds = this.getBounds(shape)
    return (
      boundsContained(shapeBounds, brushBounds) ||
      boundsCollide(shapeBounds, brushBounds)
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
