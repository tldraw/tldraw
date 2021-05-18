import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { CircleShape, ShapeType, TransformCorner, TransformEdge } from "types"
import { createShape } from "./index"
import { boundsContained } from "utils/bounds"
import { intersectCircleBounds } from "utils/intersections"
import { pointInCircle } from "utils/hitTests"
import { translateBounds } from "utils/utils"

const circle = createShape<CircleShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Circle,
      isGenerated: false,
      name: "Circle",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      radius: 20,
      style: {
        fill: "rgba(142, 143, 142, 1.000)",
        stroke: "#000",
      },
      ...props,
    }
  },

  render({ id, radius }) {
    return <circle id={id} cx={radius} cy={radius} r={radius} />
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const { radius } = shape

      const bounds = {
        minX: 0,
        maxX: radius * 2,
        minY: 0,
        maxY: radius * 2,
        width: radius * 2,
        height: radius * 2,
      }

      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    return this.getBounds(shape)
  },

  getCenter(shape) {
    return [shape.point[0] + shape.radius, shape.point[1] + shape.radius]
  },

  hitTest(shape, point) {
    return pointInCircle(
      point,
      vec.addScalar(shape.point, shape.radius),
      shape.radius
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

  transform(shape, bounds, { anchor }) {
    // Set the new corner or position depending on the anchor
    switch (anchor) {
      case TransformCorner.TopLeft: {
        shape.radius = Math.min(bounds.width, bounds.height) / 2
        shape.point = [
          bounds.maxX - shape.radius * 2,
          bounds.maxY - shape.radius * 2,
        ]
        break
      }
      case TransformCorner.TopRight: {
        shape.radius = Math.min(bounds.width, bounds.height) / 2
        shape.point = [bounds.minX, bounds.maxY - shape.radius * 2]
        break
      }
      case TransformCorner.BottomRight: {
        shape.radius = Math.min(bounds.width, bounds.height) / 2
        shape.point = [bounds.minX, bounds.minY]
        break
      }
      case TransformCorner.BottomLeft: {
        shape.radius = Math.min(bounds.width, bounds.height) / 2
        shape.point = [bounds.maxX - shape.radius * 2, bounds.minY]
        break
      }
      case TransformEdge.Top: {
        shape.radius = bounds.height / 2
        shape.point = [
          bounds.minX + (bounds.width / 2 - shape.radius),
          bounds.minY,
        ]
        break
      }
      case TransformEdge.Right: {
        shape.radius = bounds.width / 2
        shape.point = [
          bounds.maxX - shape.radius * 2,
          bounds.minY + (bounds.height / 2 - shape.radius),
        ]
        break
      }
      case TransformEdge.Bottom: {
        shape.radius = bounds.height / 2
        shape.point = [
          bounds.minX + (bounds.width / 2 - shape.radius),
          bounds.maxY - shape.radius * 2,
        ]
        break
      }
      case TransformEdge.Left: {
        shape.radius = bounds.width / 2
        shape.point = [
          bounds.minX,
          bounds.minY + (bounds.height / 2 - shape.radius),
        ]
        break
      }
    }

    return shape
  },

  canTransform: true,
})

export default circle
