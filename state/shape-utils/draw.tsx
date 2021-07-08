import { getFromCache, uniqueId } from 'utils/utils'
import vec from 'utils/vec'
import { DashStyle, DrawShape, ShapeType } from 'types'
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
const drawPathCache = new WeakMap<DrawShape['points'], string>([])
const simplePathCache = new WeakMap<DrawShape['points'], string>([])
const polygonCache = new WeakMap<DrawShape['points'], string>([])

const draw = registerShapeUtils<DrawShape>({
  boundsCache: new WeakMap([]),

  canStyleFill: true,

  defaultProps: {
    id: uniqueId(),
    type: ShapeType.Draw,
    name: 'Draw',
    parentId: 'page1',
    childIndex: 0,
    point: [0, 0],
    points: [],
    rotation: 0,

    style: defaultStyle,
  },

  shouldRender(shape, prev) {
    return shape.points !== prev.points || shape.style !== prev.style
  },

  render(shape) {
    const { id, points, style } = shape

    const styles = getShapeStyle(style)

    const strokeWidth = +styles.strokeWidth

    const shouldFill =
      points.length > 3 &&
      vec.dist(points[0], points[points.length - 1]) < +styles.strokeWidth * 2

    // For very short lines, draw a point instead of a line

    if (points.length > 0 && points.length < 3) {
      return (
        <g id={id}>
          <circle
            r={strokeWidth * 0.618}
            fill={styles.stroke}
            stroke={styles.stroke}
            strokeWidth={styles.strokeWidth}
          />
        </g>
      )
    }

    // For drawn lines, draw a line from the path cache

    if (shape.style.dash === DashStyle.Draw) {
      const polygonPathData = getFromCache(polygonCache, points, (cache) => {
        cache.set(shape.points, getFillPath(shape))
      })

      const drawPathData = getFromCache(drawPathCache, points, (cache) => {
        cache.set(shape.points, getDrawStrokePath(shape))
      })

      return (
        <g id={id}>
          {shouldFill && (
            <path
              d={polygonPathData}
              strokeWidth="0"
              stroke="none"
              fill={styles.fill}
            />
          )}
          <path
            d={drawPathData}
            fill={styles.stroke}
            stroke={styles.stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      )
    }

    // For solid, dash and dotted lines, draw a regular stroke path

    const strokeDasharray = {
      [DashStyle.Draw]: 'none',
      [DashStyle.Solid]: `none`,
      [DashStyle.Dotted]: `${strokeWidth / 10} ${strokeWidth * 3}`,
      [DashStyle.Dashed]: `${strokeWidth * 3} ${strokeWidth * 3}`,
    }[style.dash]

    const strokeDashoffset = {
      [DashStyle.Draw]: 'none',
      [DashStyle.Solid]: `none`,
      [DashStyle.Dotted]: `-${strokeWidth / 20}`,
      [DashStyle.Dashed]: `-${strokeWidth}`,
    }[style.dash]

    if (!simplePathCache.has(points)) {
      simplePathCache.set(points, getSolidStrokePath(shape))
    }

    const path = simplePathCache.get(points)

    return (
      <g id={id}>
        {style.dash !== DashStyle.Solid && (
          <path
            d={path}
            fill="transparent"
            stroke="transparent"
            strokeWidth={strokeWidth * 2}
          />
        )}
        <path
          d={path}
          fill={shouldFill ? styles.fill : 'none'}
          stroke={styles.stroke}
          strokeWidth={strokeWidth * 1.618}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      </g>
    )
  },

  getBounds(shape) {
    const bounds = getFromCache(this.boundsCache, shape, (cache) => {
      cache.set(shape, getBoundsFromPoints(shape.points))
    })

    return translateBounds(bounds, shape.point)
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

    const rotatedBounds = getFromCache(rotatedCache, shape, (cache) => {
      const c = getBoundsCenter(getBoundsFromPoints(shape.points))
      cache.set(
        shape,
        shape.points.map((pt) => vec.rotWith(pt, c, shape.rotation))
      )
    })

    return (
      boundsContain(brushBounds, rBounds) ||
      intersectPolylineBounds(
        rotatedBounds,
        translateBounds(brushBounds, vec.neg(shape.point))
      ).length > 0
    )
  },

  transform(shape, bounds, { initialShape, scaleX, scaleY }) {
    const initialShapeBounds = getFromCache(
      this.boundsCache,
      initialShape,
      (cache) => {
        cache.set(shape, getBoundsFromPoints(initialShape.points))
      }
    )

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

  // applyStyles(shape, style) {
  //   const styles = { ...shape.style, ...style }
  //   styles.dash = DashStyle.Solid
  //   shape.style = styles
  //   return this
  // },

  onSessionComplete(shape) {
    const bounds = this.getBounds(shape)

    const [x1, y1] = vec.sub([bounds.minX, bounds.minY], shape.point)

    shape.points = shape.points.map(([x0, y0, p]) => [x0 - x1, y0 - y1, p])

    this.translateTo(shape, vec.add(shape.point, [x1, y1]))

    return this
  },
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

/**
 * Get the fill path for a closed draw shape.
 *
 * ### Example
 *
 *```ts
 * someCache.set(getFillPath(shape))
 *```
 */
function getFillPath(shape: DrawShape) {
  const styles = getShapeStyle(shape.style)

  if (shape.points.length < 2) {
    return ''
  }

  return getSvgPathFromStroke(
    getStrokePoints(shape.points, {
      size: 1 + +styles.strokeWidth * 2,
      thinning: 0.85,
      end: { taper: +styles.strokeWidth * 20 },
      start: { taper: +styles.strokeWidth * 20 },
    }).map((pt) => pt.point)
  )
}

/**
 * Get the path data for a draw stroke.
 *
 * ### Example
 *
 *```ts
 * someCache.set(getDrawStrokePath(shape))
 *```
 */
function getDrawStrokePath(shape: DrawShape) {
  const styles = getShapeStyle(shape.style)

  if (shape.points.length < 2) {
    return ''
  }

  const options =
    shape.points[1][2] === 0.5 ? simulatePressureSettings : realPressureSettings

  const stroke = getStroke(shape.points, {
    size: 1 + +styles.strokeWidth * 2,
    thinning: 0.85,
    end: { taper: +styles.strokeWidth * 10 },
    start: { taper: +styles.strokeWidth * 10 },
    ...options,
  })

  return getSvgPathFromStroke(stroke)
}

function getSolidStrokePath(shape: DrawShape) {
  let { points } = shape

  let len = points.length

  if (len === 0) return 'M 0 0 L 0 0'
  if (len < 3) return `M ${points[0][0]} ${points[0][1]}`

  points = getStrokePoints(points).map((pt) => pt.point)

  len = points.length

  const d = points.reduce(
    (acc, [x0, y0], i, arr) => {
      if (i === len - 1) {
        acc.push('L', x0, y0)
        return acc
      }

      const [x1, y1] = arr[i + 1]
      acc.push(
        x0.toFixed(2),
        y0.toFixed(2),
        ((x0 + x1) / 2).toFixed(2),
        ((y0 + y1) / 2).toFixed(2)
      )
      return acc
    },
    ['M', points[0][0], points[0][1], 'Q']
  )

  const path = d.join(' ').replaceAll(/(\s[0-9]*\.[0-9]{2})([0-9]*)\b/g, '$1')

  return path
}

// /**
//  * Get the path data for a solid draw stroke.
//  *
//  * ### Example
//  *
//  *```ts
//  * getSolidStrokePath(shape)
//  *```
//  */
// function getSolidDrawStrokePath(shape: DrawShape) {
//   const styles = getShapeStyle(shape.style)

//   if (shape.points.length < 2) {
//     return ''
//   }

//   const options =
//     shape.points[1][2] === 0.5 ? simulatePressureSettings : realPressureSettings

//   const stroke = getStroke(shape.points, {
//     size: 1 + +styles.strokeWidth * 2,
//     thinning: 0,
//     end: { taper: +styles.strokeWidth * 10 },
//     start: { taper: +styles.strokeWidth * 10 },
//     ...options,
//   })

//   return getSvgPathFromStroke(stroke)
// }
