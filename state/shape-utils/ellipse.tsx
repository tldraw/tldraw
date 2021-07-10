import vec from 'utils/vec'
import { DashStyle, EllipseShape, ShapeType } from 'types'
import { getShapeUtils } from './index'
import { intersectEllipseBounds } from 'utils/intersections'
import {
  uniqueId,
  getSvgPathFromStroke,
  rng,
  translateBounds,
  pointInEllipse,
  boundsContained,
  getRotatedEllipseBounds,
  getPerfectDashProps,
} from 'utils'
import { defaultStyle, getShapeStyle } from 'state/shape-styles'
import getStroke from 'perfect-freehand'
import { registerShapeUtils } from './register'

const pathCache = new WeakMap<EllipseShape, string>([])

const ellipse = registerShapeUtils<EllipseShape>({
  boundsCache: new WeakMap([]),

  defaultProps: {
    id: uniqueId(),
    type: ShapeType.Ellipse,
    name: 'Ellipse',
    parentId: 'page1',
    childIndex: 0,
    point: [0, 0],
    radiusX: 1,
    radiusY: 1,
    rotation: 0,
    style: defaultStyle,
  },

  shouldRender(shape, prev) {
    return (
      shape.radiusY !== prev.radiusY ||
      shape.radiusX !== prev.radiusX ||
      shape.style !== prev.style
    )
  },

  render(shape, { isDarkMode }) {
    const { radiusX, radiusY, style } = shape
    const styles = getShapeStyle(style, isDarkMode)
    const strokeWidth = +styles.strokeWidth

    const rx = Math.max(0, radiusX - strokeWidth / 2)
    const ry = Math.max(0, radiusY - strokeWidth / 2)

    if (style.dash === DashStyle.Draw) {
      if (!pathCache.has(shape)) {
        renderPath(shape)
      }

      const path = pathCache.get(shape)

      return (
        <>
          {style.isFilled && (
            <ellipse
              cx={radiusX}
              cy={radiusY}
              rx={rx}
              ry={ry}
              stroke="none"
              fill={styles.fill}
              pointerEvents="fill"
            />
          )}
          <path
            d={path}
            fill={styles.stroke}
            stroke={styles.stroke}
            strokeWidth={strokeWidth}
            pointerEvents="all"
          />
        </>
      )
    }

    const h = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2)

    const perimeter =
      Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))

    const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
      perimeter,
      strokeWidth * 1.618,
      shape.style.dash,
      4
    )

    const sw = strokeWidth * 1.618

    return (
      <ellipse
        cx={radiusX}
        cy={radiusY}
        rx={rx}
        ry={ry}
        fill={styles.fill}
        stroke={styles.stroke}
        strokeWidth={sw}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        pointerEvents={style.isFilled ? 'all' : 'stroke'}
      />
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

  transform(shape, bounds, { scaleX, scaleY, initialShape }) {
    // TODO: Locked aspect ratio transform

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
})

export default ellipse

function renderPath(shape: EllipseShape) {
  const { style, id, radiusX, radiusY, point } = shape

  const getRandom = rng(id)

  const center = vec.sub(getShapeUtils(shape).getCenter(shape), point)

  const strokeWidth = +getShapeStyle(style).strokeWidth

  const rx = radiusX + getRandom() * strokeWidth - strokeWidth / 2
  const ry = radiusY + getRandom() * strokeWidth - strokeWidth / 2

  const points: number[][] = []
  const start = Math.PI + Math.PI * getRandom()

  const overlap = Math.PI / 12

  for (let i = 2; i < 8; i++) {
    const rads = start + overlap * 2 * (i / 8)
    const x = rx * Math.cos(rads) + center[0]
    const y = ry * Math.sin(rads) + center[1]
    points.push([x, y])
  }

  for (let i = 5; i < 32; i++) {
    const t = i / 35
    const rads = start + overlap * 2 + Math.PI * 2.5 * (t * t * t)
    const x = rx * Math.cos(rads) + center[0]
    const y = ry * Math.sin(rads) + center[1]
    points.push([x, y])
  }

  for (let i = 0; i < 8; i++) {
    const rads = start + overlap * 2 * (i / 4)
    const x = rx * Math.cos(rads) + center[0]
    const y = ry * Math.sin(rads) + center[1]
    points.push([x, y])
  }

  const stroke = getStroke(points, {
    size: 1 + strokeWidth,
    thinning: 0.6,
    easing: (t) => t * t * t * t,
    end: { taper: strokeWidth * 20 },
    start: { taper: strokeWidth * 20 },
    simulatePressure: false,
  })

  pathCache.set(shape, getSvgPathFromStroke(stroke))
}
