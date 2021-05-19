import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import {
  RectangleShape,
  ShapeType,
  TransformCorner,
  TransformEdge,
} from "types"
import { createShape } from "./index"
import { boundsCollidePolygon, boundsContainPolygon } from "utils/bounds"
import {
  getBoundsFromPoints,
  getRotatedCorners,
  rotateBounds,
  translateBounds,
} from "utils/utils"

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
        fill: "#c6cacb",
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
    return getBoundsFromPoints(
      getRotatedCorners(this.getBounds(shape), shape.rotation)
    )
  },

  getCenter(shape) {
    const bounds = this.getRotatedBounds(shape)
    return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
  },

  hitTest(shape) {
    return true
  },

  hitTestBounds(shape, brushBounds) {
    const rotatedCorners = getRotatedCorners(
      this.getBounds(shape),
      shape.rotation
    )

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

  transform(shape, bounds, { initialShape, scaleX, scaleY }) {
    if (shape.rotation === 0) {
      shape.size = [bounds.width, bounds.height]
      shape.point = [bounds.minX, bounds.minY]
    } else {
      // Center shape in resized bounds
      shape.size = vec.mul(
        initialShape.size,
        Math.min(Math.abs(scaleX), Math.abs(scaleY))
      )

      shape.point = vec.sub(
        vec.med([bounds.minX, bounds.minY], [bounds.maxX, bounds.maxY]),
        vec.div(shape.size, 2)
      )
    }

    // Set rotation for flipped shapes
    shape.rotation = initialShape.rotation
    if (scaleX < 0) shape.rotation *= -1
    if (scaleY < 0) shape.rotation *= -1

    return shape
  },

  transformSingle(shape, bounds) {
    shape.size = [bounds.width, bounds.height]
    shape.point = [bounds.minX, bounds.minY]
    return shape
  },

  canTransform: true,
})

export default rectangle
