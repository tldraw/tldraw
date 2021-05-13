import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { RectangleShape, ShapeType } from "types"
import { boundsCache } from "./index"
import { boundsContained, boundsCollide } from "utils/bounds"
import { createShape } from "./base-shape"

const rectangle = createShape<RectangleShape>({
  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Rectangle,
      name: "Rectangle",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      size: [1, 1],
      rotation: 0,
      style: {},
      ...props,
    }
  },

  render({ id, size }) {
    return <rect id={id} width={size[0]} height={size[1]} />
  },

  getBounds(shape) {
    if (boundsCache.has(shape)) {
      return boundsCache.get(shape)
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

    boundsCache.set(shape, bounds)
    return bounds
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

  stretch(shape, scaleX, scaleY) {
    return shape
  },
})

export default rectangle
