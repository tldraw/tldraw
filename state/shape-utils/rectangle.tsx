import { uniqueId, getPerfectDashProps, getFromCache } from 'utils/utils'
import vec from 'utils/vec'
import { DashStyle, RectangleShape, ShapeType } from 'types'
import { getSvgPathFromStroke, translateBounds, rng, shuffleArr } from 'utils'
import { defaultStyle, getShapeStyle } from 'state/shape-styles'
import getStroke from 'perfect-freehand'
import { registerShapeUtils } from './register'

const pathCache = new WeakMap<number[], string>([])

const rectangle = registerShapeUtils<RectangleShape>({
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

  render(shape, { isHovered, isDarkMode }) {
    const { id, size, radius, style } = shape
    const styles = getShapeStyle(style, isDarkMode)
    const strokeWidth = +styles.strokeWidth

    if (style.dash === DashStyle.Draw) {
      const pathData = getFromCache(pathCache, shape.size, (cache) => {
        cache.set(shape.size, renderPath(shape))
      })

      return (
        <>
          <rect
            rx={radius}
            ry={radius}
            x={+styles.strokeWidth / 2}
            y={+styles.strokeWidth / 2}
            width={Math.max(0, size[0] - strokeWidth)}
            height={Math.max(0, size[1] - strokeWidth)}
            fill={style.isFilled ? styles.fill : 'transparent'}
            stroke="none"
          />
          <path
            d={pathData}
            fill={styles.stroke}
            stroke={styles.stroke}
            strokeWidth={styles.strokeWidth}
            filter={isHovered ? 'url(#expand)' : 'none'}
            pointerEvents="all"
          />
        </>
      )
    }

    const sw = strokeWidth * 1.618

    const w = Math.max(0, size[0] - sw / 2)
    const h = Math.max(0, size[1] - sw / 2)

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
          stroke={styles.stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      )
    })

    return (
      <>
        <rect
          x={sw / 2}
          y={sw / 2}
          width={w}
          height={h}
          fill={styles.fill}
          stroke="transparent"
          strokeWidth={sw}
          pointerEvents="all"
        />
        <g filter={isHovered ? 'url(#expand)' : 'none'} pointerEvents="stroke">
          {paths}
        </g>
      </>
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
