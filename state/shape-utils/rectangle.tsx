import { uniqueId } from 'utils'
import vec from 'utils/vec'
import { DashStyle, RectangleShape, ShapeType } from 'types'
import { getSvgPathFromStroke, translateBounds, rng, shuffleArr } from 'utils'
import { defaultStyle, getShapeStyle } from 'state/shape-styles'
import getStroke from 'perfect-freehand'
import { registerShapeUtils } from './register'
import { getPerfectDashProps } from 'utils/dashes'

const pathCache = new WeakMap<number[], string>([])

const rectangle = registerShapeUtils<RectangleShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uniqueId(),

      type: ShapeType.Rectangle,
      isGenerated: false,
      name: 'Rectangle',
      parentId: 'page1',
      childIndex: 0,
      point: [0, 0],
      size: [1, 1],
      radius: 2,
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      style: defaultStyle,
      ...props,
    }
  },

  shouldRender(shape, prev) {
    return shape.size !== prev.size || shape.style !== prev.style
  },

  render(shape) {
    const { id, size, radius, style } = shape
    const styles = getShapeStyle(style)
    const strokeWidth = +styles.strokeWidth

    if (style.dash === DashStyle.Solid) {
      if (!pathCache.has(shape.size)) {
        renderPath(shape)
      }

      const path = pathCache.get(shape.size)

      return (
        <g id={id}>
          <rect
            rx={radius}
            ry={radius}
            x={+styles.strokeWidth / 2}
            y={+styles.strokeWidth / 2}
            width={Math.max(0, size[0] - strokeWidth)}
            height={Math.max(0, size[1] - strokeWidth)}
            strokeWidth={0}
            fill={styles.fill}
          />
          <path d={path} fill={styles.stroke} />
        </g>
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
        shape.style.dash === DashStyle.Dotted ? 'dotted' : 'dashed'
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
      <g id={id}>
        <rect
          x={sw / 2}
          y={sw / 2}
          width={w}
          height={h}
          fill={styles.fill}
          stroke="none"
        />
        {paths}
      </g>
    )
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const [width, height] = shape.size
      const bounds = {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      }

      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  hitTest() {
    return true
  },

  transform(shape, bounds, { initialShape, transformOrigin, scaleX, scaleY }) {
    if (shape.rotation === 0 && !shape.isAspectRatioLocked) {
      shape.size = [bounds.width, bounds.height]
      shape.point = [bounds.minX, bounds.minY]
    } else {
      shape.size = vec.mul(
        initialShape.size,
        Math.min(Math.abs(scaleX), Math.abs(scaleY))
      )

      shape.point = [
        bounds.minX +
          (bounds.width - shape.size[0]) *
            (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
        bounds.minY +
          (bounds.height - shape.size[1]) *
            (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
      ]

      shape.rotation =
        (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0)
          ? -initialShape.rotation
          : initialShape.rotation
    }

    return this
  },

  transformSingle(shape, bounds) {
    shape.size = [bounds.width, bounds.height]
    shape.point = [bounds.minX, bounds.minY]
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

  pathCache.set(shape.size, getSvgPathFromStroke(stroke))
}
