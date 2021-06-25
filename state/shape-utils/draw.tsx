import { uniqueId } from 'utils'
import vec from 'utils/vec'
import { DashStyle, DrawShape, ShapeStyles, ShapeType } from 'types'
import { intersectPolylineBounds } from 'utils/intersections'
import getStroke, { getStrokePoints } from 'perfect-freehand'
import {
  getBoundsCenter,
  getBoundsFromPoints,
  getSvgPathFromStroke,
  translateBounds,
  boundsContain,
} from 'utils'
import { defaultStyle, getShapeStyle } from 'state/shape-styles'
import { registerShapeUtils } from './register'

const rotatedCache = new WeakMap<DrawShape, number[][]>([])
const pathCache = new WeakMap<DrawShape['points'], string>([])
const polygonCache = new WeakMap<DrawShape['points'], string>([])

const draw = registerShapeUtils<DrawShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uniqueId(),

      type: ShapeType.Draw,
      isGenerated: false,
      name: 'Draw',
      parentId: 'page1',
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
      },
    }
  },

  render(shape) {
    const { id, points, style } = shape

    const styles = getShapeStyle(style)

    if (!pathCache.has(points)) {
      renderPath(shape, style)
    }

    if (points.length > 0 && points.length < 3) {
      return (
        <circle id={id} r={+styles.strokeWidth * 0.618} fill={styles.stroke} />
      )
    }

    const shouldFill =
      points.length > 3 &&
      vec.dist(points[0], points[points.length - 1]) < +styles.strokeWidth * 2

    if (shouldFill && !polygonCache.has(points)) {
      renderFill(shape, style)
    }

    return (
      <g id={id}>
        {shouldFill && (
          <path
            d={polygonCache.get(points)}
            fill={styles.fill}
            strokeWidth="0"
            stroke="none"
          />
        )}
        <path d={pathCache.get(points)} fill={styles.stroke} />
      </g>
    )
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const bounds = getBoundsFromPoints(shape.points)
      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    return translateBounds(
      getBoundsFromPoints(shape.points, shape.rotation),
      shape.point
    )
  },

  getCenter(shape) {
    return getBoundsCenter(this.getBounds(shape))
  },

  hitTest(shape, point) {
    const pt = vec.sub(point, shape.point)
    const min = +getShapeStyle(shape.style).strokeWidth
    return shape.points.some(
      (curr, i) =>
        i > 0 && vec.distanceToLineSegment(shape.points[i - 1], curr, pt) < min
    )
  },

  hitTestBounds(this, shape, brushBounds) {
    // Test axis-aligned shape
    if (shape.rotation === 0) {
      return (
        boundsContain(brushBounds, this.getBounds(shape)) ||
        intersectPolylineBounds(
          shape.points,
          translateBounds(brushBounds, vec.neg(shape.point))
        ).length > 0
      )
    }

    // Test rotated shape
    const rBounds = this.getRotatedBounds(shape)

    if (!rotatedCache.has(shape)) {
      const c = getBoundsCenter(getBoundsFromPoints(shape.points))
      rotatedCache.set(
        shape,
        shape.points.map((pt) => vec.rotWith(pt, c, shape.rotation))
      )
    }

    return (
      boundsContain(brushBounds, rBounds) ||
      intersectPolylineBounds(
        rotatedCache.get(shape),
        translateBounds(brushBounds, vec.neg(shape.point))
      ).length > 0
    )
  },

  transform(shape, bounds, { initialShape, scaleX, scaleY }) {
    const initialShapeBounds = this.boundsCache.get(initialShape)
    shape.points = initialShape.points.map(([x, y, r]) => {
      return [
        bounds.width *
          (scaleX < 0 // * sin?
            ? 1 - x / initialShapeBounds.width
            : x / initialShapeBounds.width),
        bounds.height *
          (scaleY < 0 // * cos?
            ? 1 - y / initialShapeBounds.height
            : y / initialShapeBounds.height),
        r,
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
    styles.dash = DashStyle.Solid
    shape.style = styles
    shape.points = [...shape.points]
    return this
  },

  onSessionComplete(shape) {
    const bounds = this.getBounds(shape)

    const [x1, y1] = vec.sub([bounds.minX, bounds.minY], shape.point)

    shape.points = shape.points.map(([x0, y0, p]) => [x0 - x1, y0 - y1, p])

    this.translateTo(shape, vec.add(shape.point, [x1, y1]))

    return this
  },

  canStyleFill: true,
})

export default draw

const simulatePressureSettings = {
  simulatePressure: true,
}

const realPressureSettings = {
  easing: (t: number) => t * t,
  simulatePressure: false,
  start: { taper: 1 },
  end: { taper: 1 },
}

function renderPath(shape: DrawShape, style: ShapeStyles) {
  const styles = getShapeStyle(style)

  if (shape.points.length < 2) {
    pathCache.set(shape.points, '')
    return
  }

  const options =
    shape.points[1][2] === 0.5 ? simulatePressureSettings : realPressureSettings

  const stroke = getStroke(shape.points, {
    size: 1 + +styles.strokeWidth * 2,
    thinning: 0.85,
    end: { taper: +styles.strokeWidth * 20 },
    start: { taper: +styles.strokeWidth * 20 },
    ...options,
  })

  pathCache.set(shape.points, getSvgPathFromStroke(stroke))
}

function renderFill(shape: DrawShape, style: ShapeStyles) {
  const styles = getShapeStyle(style)

  if (shape.points.length < 2) {
    polygonCache.set(shape.points, '')
    return
  }

  return polygonCache.set(
    shape.points,
    getSvgPathFromStroke(
      getStrokePoints(shape.points, {
        size: 1 + +styles.strokeWidth * 2,
        thinning: 0.85,
        end: { taper: +styles.strokeWidth * 20 },
        start: { taper: +styles.strokeWidth * 20 },
      }).map((pt) => pt.point)
    )
  )
}
