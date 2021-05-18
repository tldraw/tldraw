import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { PolylineShape, ShapeType } from "types"
import { createShape } from "./index"
import { intersectPolylineBounds } from "utils/intersections"
import {
  boundsCollide,
  boundsContained,
  boundsContainPolygon,
} from "utils/bounds"
import { getBoundsFromPoints, translateBounds } from "utils/utils"

const polyline = createShape<PolylineShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Polyline,
      isGenerated: false,
      name: "Polyline",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      points: [[0, 0]],
      rotation: 0,
      style: {},
      ...props,
    }
  },

  render({ id, points }) {
    return <polyline id={id} points={points.toString()} />
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const bounds = getBoundsFromPoints(shape.points)
      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    return this.getBounds(shape)
  },

  getCenter(shape) {
    const bounds = this.getBounds(shape)
    return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
  },

  hitTest(shape, point) {
    let pt = vec.sub(point, shape.point)
    let prev = shape.points[0]

    for (let i = 1; i < shape.points.length; i++) {
      let curr = shape.points[i]
      if (vec.distanceToLineSegment(prev, curr, pt) < 4) {
        return true
      }
      prev = curr
    }

    return false
  },

  hitTestBounds(this, shape, brushBounds) {
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
      intersectPolylineBounds(
        shape.points.map((point) => vec.add(point, shape.point)),
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

  transform(
    shape,
    bounds,
    { initialShape, initialShapeBounds, isFlippedX, isFlippedY }
  ) {
    shape.points = shape.points.map((_, i) => {
      const [x, y] = initialShape.points[i]

      return [
        bounds.width *
          (isFlippedX
            ? 1 - x / initialShapeBounds.width
            : x / initialShapeBounds.width),
        bounds.height *
          (isFlippedY
            ? 1 - y / initialShapeBounds.height
            : y / initialShapeBounds.height),
      ]
    })

    shape.point = [bounds.minX, bounds.minY]
    return shape
  },

  canTransform: true,
})

export default polyline
