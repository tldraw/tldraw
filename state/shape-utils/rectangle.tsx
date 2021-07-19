import {
  uniqueId,
  getPerfectDashProps,
  getFromCache,
  expandBounds,
  getBoundsSides,
} from 'utils/utils'
import vec from 'utils/vec'
import { DashStyle, RectangleShape, ShapeType } from 'types'
import { getSvgPathFromStroke, translateBounds, rng, shuffleArr } from 'utils'
import { defaultStyle, getShapeStyle } from 'state/shape-styles'
import getStroke from 'perfect-freehand'
import { registerShapeUtils } from './register'
import { BindingIndicator } from 'components/canvas/misc'
import Intersect from 'utils/intersect'
import HitTest from 'utils/hit-test'

const pathCache = new WeakMap<number[], string>([])

const rectangle = registerShapeUtils<RectangleShape>({
  canBind: true,

  boundsCache: new WeakMap([]),

  defaultProps: {
    id: uniqueId(),
    type: ShapeType.Rectangle,
    name: 'Rectangle',
    parentId: 'page1',
    childIndex: 0,
    point: [0, 0],
    size: [1, 1],
    radius: 2,
    rotation: 0,
    style: defaultStyle,
  },

  shouldRender(shape, prev) {
    return shape.size !== prev.size || shape.style !== prev.style
  },

  render(shape, { isBinding, isDarkMode }) {
    const { id, size, style } = shape
    const { strokeWidth, fill, stroke } = getShapeStyle(style, isDarkMode)

    if (style.dash === DashStyle.Draw) {
      const pathData = getFromCache(pathCache, shape.size, (cache) => {
        cache.set(shape.size, renderPath(shape))
      })

      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          {isBinding && (
            <BindingIndicator
              as="rect"
              x={strokeWidth / 2 - 32}
              y={strokeWidth / 2 - 32}
              width={Math.max(0, size[0] - strokeWidth / 2) + 64}
              height={Math.max(0, size[1] - strokeWidth / 2) + 64}
            />
          )}
          <rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={Math.max(0, size[0] - strokeWidth / 2)}
            height={Math.max(0, size[1] - strokeWidth / 2)}
            fill={style.isFilled ? fill : 'transparent'}
            stroke="none"
          />
          <path
            d={pathData}
            fill={stroke}
            stroke={stroke}
            strokeWidth={strokeWidth}
            pointerEvents="all"
          />
        </g>
      )
    }

    const sw = strokeWidth * 1.618

    const w = Math.max(0, size[0] - sw / 2)
    const h = Math.max(0, size[1] - sw / 2)

    if (style.dash === DashStyle.Solid) {
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          {isBinding && (
            <BindingIndicator
              as="rect"
              x={sw / 2 - 32}
              y={sw / 2 - 32}
              width={w + 64}
              height={h + 64}
            />
          )}
          <rect
            x={sw / 2}
            y={sw / 2}
            width={w}
            height={h}
            fill={style.isFilled ? fill : 'transparent'}
            stroke={stroke}
            strokeWidth={sw}
            pointerEvents="all"
          />
        </g>
      )
    }

    // Draw dashed lines as separate lines

    const strokes: [number[], number[], number][] = [
      [[sw / 2, sw / 2], [w, sw / 2], w - sw / 2],
      [[w, sw / 2], [w, h], h - sw / 2],
      [[w, h], [sw / 2, h], w - sw / 2],
      [[sw / 2, h], [sw / 2, sw / 2], h - sw / 2],
    ]

    const paths = strokes.map(([start, end, length], i) => {
      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        length,
        sw,
        shape.style.dash
      )

      return (
        <line
          key={id + '_' + i}
          x1={start[0]}
          y1={start[1]}
          x2={end[0]}
          y2={end[1]}
          stroke={stroke}
          strokeWidth={sw}
          pointerEvents="stroke"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      )
    })

    return (
      <g strokeLinecap="round" strokeLinejoin="round">
        {isBinding && (
          <BindingIndicator
            as="rect"
            x={sw / 2 - 32}
            y={sw / 2 - 32}
            width={w + 64}
            height={h + 64}
          />
        )}
        <rect
          x={sw / 2}
          y={sw / 2}
          width={w}
          height={h}
          fill={fill}
          stroke="transparent"
          strokeWidth={sw}
          pointerEvents="all"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {paths}
      </g>
    )
  },

  getBounds(shape) {
    const bounds = getFromCache(this.boundsCache, shape, (cache) => {
      const [width, height] = shape.size
      cache.set(shape, {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      })
    })

    return translateBounds(bounds, shape.point)
  },

  hitTest() {
    return true
  },

  getBindingPoint(shape, point, origin, direction) {
    const bounds = this.getBounds(shape)

    const expandedBounds = expandBounds(bounds, [32, 32])

    let bindingPoint: number[]
    let distance: number

    if (!HitTest.bounds(point, expandedBounds)) return

    // The point is inside of the box, so we'll assume the user is
    // indicating a specific point inside of the box.
    if (HitTest.bounds(point, bounds)) {
      bindingPoint = vec.divV(
        vec.sub(point, [expandedBounds.minX, expandedBounds.minY]),
        [expandedBounds.width, expandedBounds.height]
      )

      distance = 0
    } else {
      // Find furthest intersection between ray from
      // origin through point and expanded bounds.
      const intersection = Intersect.ray
        .bounds(origin, direction, expandedBounds)
        .filter((int) => int.didIntersect)
        .map((int) => int.points[0])
        .sort((a, b) => vec.dist(b, origin) - vec.dist(a, origin))[0]

      // The anchor is a point between the handle and the intersection
      const anchor = vec.med(point, intersection)

      // Find the distance between the point and the real bounds of the shape
      const distanceFromShape = getBoundsSides(bounds)
        .map((side) => vec.distanceToLineSegment(side[1][0], side[1][1], point))
        .sort((a, b) => a - b)[0]

      if (
        vec.distanceToLineSegment(point, anchor, this.getCenter(shape)) < 12
      ) {
        // If we're close to the center, snap to the center
        bindingPoint = [0.5, 0.5]
      } else {
        // Or else calculate a normalized point
        bindingPoint = vec.divV(
          vec.sub(anchor, [expandedBounds.minX, expandedBounds.minY]),
          [expandedBounds.width, expandedBounds.height]
        )
      }

      distance = distanceFromShape
    }

    return {
      point: bindingPoint,
      distance,
    }
  },

  transform(shape, bounds, { initialShape, transformOrigin, scaleX, scaleY }) {
    if (shape.rotation === 0 && !shape.isAspectRatioLocked) {
      shape.size = vec.round([bounds.width, bounds.height])
      shape.point = vec.round([bounds.minX, bounds.minY])
    } else {
      shape.size = vec.round(
        vec.mul(initialShape.size, Math.min(Math.abs(scaleX), Math.abs(scaleY)))
      )

      shape.point = vec.round([
        bounds.minX +
          (bounds.width - shape.size[0]) *
            (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
        bounds.minY +
          (bounds.height - shape.size[1]) *
            (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
      ])

      shape.rotation =
        (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0)
          ? -initialShape.rotation
          : initialShape.rotation
    }

    return this
  },

  transformSingle(shape, bounds) {
    shape.size = vec.round([bounds.width, bounds.height])
    shape.point = vec.round([bounds.minX, bounds.minY])
    return this
  },
})

export default rectangle

function renderPath(shape: RectangleShape) {
  const styles = getShapeStyle(shape.style)

  const getRandom = rng(shape.id)

  const strokeWidth = +styles.strokeWidth

  const baseOffset = strokeWidth / 2

  const offsets = Array.from(Array(4)).map(() => [
    getRandom() * baseOffset,
    getRandom() * baseOffset,
  ])

  const sw = strokeWidth

  const w = Math.max(0, shape.size[0] - sw / 2)
  const h = Math.max(0, shape.size[1] - sw / 2)

  const tl = vec.add([sw / 2, sw / 2], offsets[0])
  const tr = vec.add([w, sw / 2], offsets[1])
  const br = vec.add([w, h], offsets[2])
  const bl = vec.add([sw / 2, h], offsets[3])

  const lines = shuffleArr(
    [
      vec.pointsBetween(tr, br),
      vec.pointsBetween(br, bl),
      vec.pointsBetween(bl, tl),
      vec.pointsBetween(tl, tr),
    ],
    Math.floor(5 + getRandom() * 4)
  )

  const stroke = getStroke(
    [...lines.flat().slice(2), ...lines[0], ...lines[0].slice(4)],
    {
      size: 1 + +styles.strokeWidth,
      thinning: 0.6,
      easing: (t) => t * t * t * t,
      end: { taper: +styles.strokeWidth * 20 },
      start: { taper: +styles.strokeWidth * 20 },
      simulatePressure: false,
    }
  )

  return getSvgPathFromStroke(stroke)
}
