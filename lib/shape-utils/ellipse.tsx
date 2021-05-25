import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { EllipseShape, ShapeType } from "types"
import { registerShapeUtils } from "./index"
import { boundsContained, getRotatedEllipseBounds } from "utils/bounds"
import { intersectEllipseBounds } from "utils/intersections"
import { pointInEllipse } from "utils/hitTests"
import {
  getBoundsFromPoints,
  getRotatedCorners,
  rotateBounds,
  translateBounds,
} from "utils/utils"

const ellipse = registerShapeUtils<EllipseShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Ellipse,
      isGenerated: false,
      name: "Ellipse",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      radiusX: 20,
      radiusY: 20,
      rotation: 0,
      style: {
        fill: "#c6cacb",
        stroke: "#000",
      },
      ...props,
    }
  },

  render({ id, radiusX, radiusY }) {
    return (
      <ellipse id={id} cx={radiusX} cy={radiusY} rx={radiusX} ry={radiusY} />
    )
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const { radiusX, radiusY } = shape

      const bounds = {
        minX: 0,
        minY: 0,
        maxX: radiusX * 2,
        maxY: radiusY * 2,
        width: radiusX * 2,
        height: radiusY * 2,
      }

      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    return getRotatedEllipseBounds(
      shape.point[0],
      shape.point[1],
      shape.radiusX,
      shape.radiusY,
      shape.rotation
    )
  },

  getCenter(shape) {
    return [shape.point[0] + shape.radiusX, shape.point[1] + shape.radiusY]
  },

  hitTest(shape, point) {
    return pointInEllipse(
      point,
      vec.add(shape.point, [shape.radiusX, shape.radiusY]),
      shape.radiusX,
      shape.radiusY,
      shape.rotation
    )
  },

  hitTestBounds(this, shape, brushBounds) {
    const shapeBounds = this.getBounds(shape)

    return (
      boundsContained(shapeBounds, brushBounds) ||
      intersectEllipseBounds(
        vec.add(shape.point, [shape.radiusX, shape.radiusY]),
        shape.radiusX,
        shape.radiusY,
        brushBounds,
        shape.rotation
      ).length > 0
    )
  },

  rotateTo(shape, rotation) {
    shape.rotation = rotation
    return this
  },

  translateTo(shape, point) {
    shape.point = point
    return this
  },

  transform(shape, bounds, { scaleX, scaleY, initialShape }) {
    shape.point = [bounds.minX, bounds.minY]
    shape.radiusX = bounds.width / 2
    shape.radiusY = bounds.height / 2

    shape.rotation =
      (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0)
        ? -initialShape.rotation
        : initialShape.rotation

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

  canTransform: true,
  canChangeAspectRatio: true,
})

export default ellipse
