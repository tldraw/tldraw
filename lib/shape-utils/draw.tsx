import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import { DrawShape, ShapeType } from 'types'
import { registerShapeUtils } from './index'
import { intersectPolylineBounds } from 'utils/intersections'
import { boundsContainPolygon } from 'utils/bounds'
import getStroke from 'perfect-freehand'
import {
  getBoundsFromPoints,
  getRotatedCorners,
  getSvgPathFromStroke,
  translateBounds,
} from 'utils/utils'

const pathCache = new WeakMap<DrawShape, string>([])

const draw = registerShapeUtils<DrawShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Draw,
      isGenerated: false,
      name: 'Draw',
      parentId: 'page0',
      childIndex: 0,
      point: [0, 0],
      points: [[0, 0]],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: {
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        ...props.style,
        fill: props.style.stroke,
      },
    }
  },

  render(shape) {
    const { id, points, style } = shape

    if (!pathCache.has(shape)) {
      if (points.length < 2) {
        const left = [+style.strokeWidth, 0]
        let d: number[][] = []
        for (let i = 0; i < 10; i++) {
          d.push(vec.rotWith(left, [0, 0], i * ((Math.PI * 2) / 8)))
        }
        pathCache.set(shape, getSvgPathFromStroke(d))
      } else {
        pathCache.set(
          shape,
          getSvgPathFromStroke(
            getStroke(points, { size: +style.strokeWidth * 2, thinning: 0.9 })
          )
        )
      }
    }

    return <path id={id} d={pathCache.get(shape)} />
  },

  applyStyles(shape, style) {
    Object.assign(shape.style, style)
    shape.style.fill = shape.style.stroke
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
    return getBoundsFromPoints(
      getRotatedCorners(this.getBounds(shape), shape.rotation)
    )
  },

  getCenter(shape) {
    const bounds = this.getRotatedBounds(shape)
    return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
  },

  hitTest(shape, point) {
    let pt = vec.sub(point, shape.point)
    let prev = shape.points[0]

    for (let i = 1; i < shape.points.length; i++) {
      let curr = shape.points[i]
      if (
        vec.distanceToLineSegment(prev, curr, pt) < +shape.style.strokeWidth
      ) {
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
    // console.log(shape.points.map(([x, y]) => [x, y]))
    // const bounds = this.getBounds(shape)
    // const center = [bounds.width / 2, bounds.height / 2]
    // shape.points = shape.points.map((pt) => vec.rotWith(pt, center, rotation))
    return this
  },

  translateTo(shape, point) {
    shape.point = vec.toPrecision(point)
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

  setProperty(shape, prop, value) {
    shape[prop] = value
    return this
  },

  canTransform: true,
  canChangeAspectRatio: true,
})

export default draw
