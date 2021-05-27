import { v4 as uuid } from "uuid"
import * as vec from "utils/vec"
import { DrawShape, ShapeType } from "types"
import { registerShapeUtils } from "./index"
import { intersectPolylineBounds } from "utils/intersections"
import { boundsContainPolygon } from "utils/bounds"
import { getBoundsFromPoints, translateBounds } from "utils/utils"

const draw = registerShapeUtils<DrawShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Draw,
      isGenerated: false,
      name: "Draw",
      parentId: "page0",
      childIndex: 0,
      point: [0, 0],
      points: [[0, 0]],
      rotation: 0,
      ...props,
      style: {
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        ...props.style,
        fill: "transparent",
      },
    }
  },

  render({ id, points }) {
    return <polyline id={id} points={points.toString()} />
  },

  applyStyles(shape, style) {
    Object.assign(shape.style, style)
    shape.style.fill = "transparent"
    return this
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

  rotateTo(shape, rotation) {
    shape.rotation = rotation
    return this
  },

  translateTo(shape, point) {
    shape.point = point
    return this
  },

  transform(shape, bounds, { initialShape, scaleX, scaleY }) {
    const initialShapeBounds = this.boundsCache.get(initialShape)
    shape.points = initialShape.points.map(([x, y]) => {
      return [
        bounds.width *
          (scaleX < 0
            ? 1 - x / initialShapeBounds.width
            : x / initialShapeBounds.width),
        bounds.height *
          (scaleY < 0
            ? 1 - y / initialShapeBounds.height
            : y / initialShapeBounds.height),
      ]
    })

    const newBounds = getBoundsFromPoints(shape.points)

    shape.point = vec.sub(
      [bounds.minX, bounds.minY],
      [newBounds.minX, newBounds.minY]
    )
    return this
  },

  transformSingle(shape, bounds, info) {
    this.transform(shape, bounds, info)
    return this
  },

  setParent(shape, parentId) {
    shape.parentId = parentId
    return this
  },

  setChildIndex(shape, childIndex) {
    shape.childIndex = childIndex
    return this
  },

  setPoints(shape, points) {
    // const bounds = getBoundsFromPoints(points)
    // const corner = [bounds.minX, bounds.minY]
    // const nudged = points.map((point) => vec.sub(point, corner))
    // this.boundsCache.set(shape, translategetBoundsFromPoints(nudged))
    // shape.point = vec.add(shape.point, corner)

    shape.points = points

    return this
  },

  canTransform: true,
  canChangeAspectRatio: true,
})

export default draw
