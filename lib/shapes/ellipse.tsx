import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { EllipseShape, ShapeType } from "types"
import { createShape } from "./index"
import { boundsContained } from "utils/bounds"
import { intersectEllipseBounds } from "utils/intersections"
import { pointInEllipse } from "utils/hitTests"

const ellipse = createShape<EllipseShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Ellipse,
      name: "Ellipse",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      radiusX: 20,
      radiusY: 20,
      rotation: 0,
      style: {},
      ...props,
    }
  },

  render({ id, radiusX, radiusY }) {
    return (
      <ellipse id={id} cx={radiusX} cy={radiusY} rx={radiusX} ry={radiusY} />
    )
  },

  getBounds(shape) {
    if (this.boundsCache.has(shape)) {
      return this.boundsCache.get(shape)
    }

    const {
      point: [x, y],
      radiusX,
      radiusY,
    } = shape

    const bounds = {
      minX: x,
      maxX: x + radiusX * 2,
      minY: y,
      maxY: y + radiusY * 2,
      width: radiusX * 2,
      height: radiusY * 2,
    }

    this.boundsCache.set(shape, bounds)

    return bounds
  },

  hitTest(shape, point) {
    return pointInEllipse(point, shape.point, shape.radiusX, shape.radiusY)
  },

  hitTestBounds(this, shape, brushBounds) {
    const shapeBounds = this.getBounds(shape)

    return (
      boundsContained(shapeBounds, brushBounds) ||
      intersectEllipseBounds(
        vec.add(shape.point, [shape.radiusX, shape.radiusY]),
        shape.radiusX,
        shape.radiusY,
        brushBounds
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

  scale(shape, scale: number) {
    return shape
  },

  stretch(shape, scaleX: number, scaleY: number) {
    return shape
  },

  transform(shape, bounds) {
    shape.point = [bounds.minX, bounds.minY]
    shape.radiusX = bounds.width / 2
    shape.radiusY = bounds.height / 2

    return shape
  },
})

export default ellipse
