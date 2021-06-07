import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import { RectangleShape, ShapeType } from 'types'
import { registerShapeUtils } from './index'
import { getSvgPathFromStroke, translateBounds, getNoise } from 'utils/utils'
import { defaultStyle, getShapeStyle } from 'lib/shape-styles'
import getStroke from 'perfect-freehand'

const pathCache = new WeakMap<RectangleShape, string>([])

const rectangle = registerShapeUtils<RectangleShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      seed: Math.random(),
      type: ShapeType.Rectangle,
      isGenerated: false,
      name: 'Rectangle',
      parentId: 'page0',
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

  render(shape) {
    const { id, size, radius, style, point } = shape
    const styles = getShapeStyle(style)

    if (!pathCache.has(shape)) {
      renderPath(shape)
    }

    const path = pathCache.get(shape)

    return (
      <g id={id}>
        <rect
          rx={radius}
          ry={radius}
          x={+styles.strokeWidth / 2}
          y={+styles.strokeWidth / 2}
          width={Math.max(0, size[0] + -styles.strokeWidth)}
          height={Math.max(0, size[1] + -styles.strokeWidth)}
          strokeWidth={0}
        />
        <path d={path} fill={styles.stroke} />
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

function easeInOut(t: number) {
  return t * (2 - t)
}

function ease(t: number) {
  return t * t * t
}

function pointsBetween(a: number[], b: number[], steps = 6) {
  return Array.from(Array(steps))
    .map((_, i) => ease(i / steps))
    .map((t) => [...vec.lrp(a, b, t), (1 - t) / 2])
}

function renderPath(shape: RectangleShape) {
  const styles = getShapeStyle(shape.style)

  const noise = getNoise(shape.seed)
  const off = -0.25 + shape.seed / 2

  const offsets = Array.from(Array(4)).map((_, i) => [
    noise(i, i + 1) * off * 16,
    noise(i + 2, i + 3) * off * 16,
  ])

  const [w, h] = shape.size
  const tl = vec.add([0, 0], offsets[0])
  const tr = vec.add([w, 0], offsets[1])
  const br = vec.add([w, h], offsets[2])
  const bl = vec.add([0, h], offsets[3])

  const lines = shuffleArr(
    [
      pointsBetween(tr, br),
      pointsBetween(br, bl),
      pointsBetween(bl, tl),
      pointsBetween(tl, tr),
    ],
    shape.id.charCodeAt(5)
  )

  const stroke = getStroke(
    [
      ...lines.flat().slice(4),
      ...lines[0].slice(0, 4),
      lines[0][4],
      lines[0][5],
      lines[0][5],
    ],
    {
      size: 1 + +styles.strokeWidth * 2,
      thinning: 0.6,
      easing: (t) => t * t * t * t,
      end: { taper: +styles.strokeWidth * 20 },
      start: { taper: +styles.strokeWidth * 20 },
      simulatePressure: false,
    }
  )

  pathCache.set(shape, getSvgPathFromStroke(stroke))
}

function shuffleArr<T>(arr: T[], offset: number): T[] {
  return arr.map((_, i) => arr[(i + offset) % arr.length])
}
