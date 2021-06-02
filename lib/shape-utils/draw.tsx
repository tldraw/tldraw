import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import { DashStyle, DrawShape, ShapeStyles, ShapeType } from 'types'
import { registerShapeUtils } from './index'
import { intersectPolylineBounds } from 'utils/intersections'
import { boundsContainPolygon } from 'utils/bounds'
import getStroke from 'perfect-freehand'
import {
  getBoundsCenter,
  getBoundsFromPoints,
  getSvgPathFromStroke,
  translateBounds,
} from 'utils/utils'
import { defaultStyle, getShapeStyle } from 'lib/shape-styles'

const pathCache = new WeakMap<DrawShape['points'], string>([])

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
      points: [],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: {
        ...defaultStyle,
        ...props.style,
        isFilled: false,
      },
    }
  },

  render(shape) {
    const { id, points, style } = shape

    const styles = getShapeStyle(style)

    if (!pathCache.has(points)) {
      renderPath(shape, style)
    }

    if (points.length < 2) {
      return (
        <circle id={id} r={+styles.strokeWidth * 0.618} fill={styles.stroke} />
      )
    }

    return <path id={id} d={pathCache.get(points)} fill={styles.stroke} />
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const bounds = getBoundsFromPoints(shape.points)
      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    const bounds =
      this.boundsCache.get(shape) || getBoundsFromPoints(shape.points)

    const center = getBoundsCenter(bounds)

    const rotatedPts = shape.points.map((pt) =>
      vec.rotWith(pt, center, shape.rotation)
    )
    const rotatedBounds = translateBounds(
      getBoundsFromPoints(rotatedPts),
      shape.point
    )

    return rotatedBounds
  },

  getCenter(shape) {
    const bounds = this.getRotatedBounds(shape)
    return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
  },

  hitTest(shape, point) {
    let pt = vec.sub(point, shape.point)
    const min = +getShapeStyle(shape.style).strokeWidth
    return shape.points.some(
      (curr, i) =>
        i > 0 && vec.distanceToLineSegment(shape.points[i - 1], curr, pt) < min
    )
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

  applyStyles(shape, style) {
    const styles = { ...shape.style, ...style }
    styles.isFilled = false
    styles.dash = DashStyle.Solid
    shape.style = styles
    shape.points = [...shape.points]
    return this
  },

  canStyleFill: false,
})

export default draw

function renderPath(shape: DrawShape, style: ShapeStyles) {
  const styles = getShapeStyle(style)

  pathCache.set(
    shape.points,
    getSvgPathFromStroke(
      getStroke(shape.points, {
        size: +styles.strokeWidth * 2,
        thinning: 0.9,
        end: { taper: 100 },
        start: { taper: 40 },
      })
    )
  )
}
