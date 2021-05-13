import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { PolylineShape, ShapeType } from "types"
import { boundsCache } from "./index"
import { intersectPolylineBounds } from "utils/intersections"
import { boundsCollide, boundsContained } from "utils/bounds"
import { createShape } from "./base-shape"

const polyline = createShape<PolylineShape>({
  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Polyline,
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
    if (boundsCache.has(shape)) {
      return boundsCache.get(shape)
    }

    let minX = 0
    let minY = 0
    let maxX = 0
    let maxY = 0

    for (let [x, y] of shape.points) {
      minX = Math.min(x, minX)
      minY = Math.min(y, minY)
      maxX = Math.max(x, maxX)
      maxY = Math.max(y, maxY)
    }

    const bounds = {
      minX: minX + shape.point[0],
      minY: minY + shape.point[1],
      maxX: maxX + shape.point[0],
      maxY: maxY + shape.point[1],
      width: maxX - minX,
      height: maxY - minY,
    }

    boundsCache.set(shape, bounds)
    return bounds
  },

  hitTest(shape) {
    return true
  },

  hitTestBounds(this, shape, bounds) {
    const shapeBounds = this.getBounds(shape)
    return (
      boundsContained(shapeBounds, bounds) ||
      (boundsCollide(shapeBounds, bounds) &&
        intersectPolylineBounds(
          shape.points.map((point) => vec.add(point, shape.point)),
          bounds
        ).length > 0)
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
})

export default polyline
