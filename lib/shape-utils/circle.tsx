import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { CircleShape, ShapeType, Corner, Edge } from "types"
import { registerShapeUtils } from "./index"
import { boundsContained } from "utils/bounds"
import { intersectCircleBounds } from "utils/intersections"
import { pointInCircle } from "utils/hitTests"
import { getTransformAnchor, translateBounds } from "utils/utils"

const circle = registerShapeUtils<CircleShape>({
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
        fill: "#c6cacb",
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

  transform(shape, bounds, { type, initialShape, scaleX, scaleY }) {
    const anchor = getTransformAnchor(type, scaleX < 0, scaleY < 0)

    // Set the new corner or position depending on the anchor
    switch (anchor) {
      case Corner.TopLeft: {
        shape.radius = Math.min(bounds.width, bounds.height) / 2
        shape.point = [
          bounds.maxX - shape.radius * 2,
          bounds.maxY - shape.radius * 2,
        ]
        break
      }
      case Corner.TopRight: {
        shape.radius = Math.min(bounds.width, bounds.height) / 2
        shape.point = [bounds.minX, bounds.maxY - shape.radius * 2]
        break
      }
      case Corner.BottomRight: {
        shape.radius = Math.min(bounds.width, bounds.height) / 2
        shape.point = [
          bounds.maxX - shape.radius * 2,
          bounds.maxY - shape.radius * 2,
        ]
        break
        break
      }
      case Corner.BottomLeft: {
        shape.radius = Math.min(bounds.width, bounds.height) / 2
        shape.point = [bounds.maxX - shape.radius * 2, bounds.minY]
        break
      }
      case Edge.Top: {
        shape.radius = bounds.height / 2
        shape.point = [
          bounds.minX + (bounds.width / 2 - shape.radius),
          bounds.minY,
        ]
        break
      }
      case Edge.Right: {
        shape.radius = bounds.width / 2
        shape.point = [
          bounds.maxX - shape.radius * 2,
          bounds.minY + (bounds.height / 2 - shape.radius),
        ]
        break
      }
      case Edge.Bottom: {
        shape.radius = bounds.height / 2
        shape.point = [
          bounds.minX + (bounds.width / 2 - shape.radius),
          bounds.maxY - shape.radius * 2,
        ]
        break
      }
      case Edge.Left: {
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

  transformSingle(shape, bounds, info) {
    return this.transform(shape, bounds, info)
  },

  canTransform: true,
})

export default circle
