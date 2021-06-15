import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import { RectangleShape, ShapeType } from 'types'
import { registerShapeUtils } from './index'
import {
  getSvgPathFromStroke,
  translateBounds,
  rng,
  shuffleArr,
  pointsBetween,
} from 'utils/utils'
import { defaultStyle, getShapeStyle } from 'lib/shape-styles'
import getStroke from 'perfect-freehand'

const pathCache = new WeakMap<number[], string>([])

const rectangle = registerShapeUtils<RectangleShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      seed: Math.random(),
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

  render(shape) {
    const { id, size, radius, style } = shape
    const styles = getShapeStyle(style)

    if (!pathCache.has(shape.size)) {
      renderPath(shape)
    }

    const path = pathCache.get(shape.size)

    return (
      <g id={id}>
        <rect
          className="hi"
          rx={radius}
          ry={radius}
          x={+styles.strokeWidth / 2}
          y={+styles.strokeWidth / 2}
          width={Math.max(0, size[0] + -styles.strokeWidth)}
          height={Math.max(0, size[1] + -styles.strokeWidth)}
          strokeWidth={0}
          fill={styles.fill}
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

function renderPath(shape: RectangleShape) {
  const styles = getShapeStyle(shape.style)

  const getRandom = rng(shape.id)

  const baseOffset = +styles.strokeWidth / 2

  const offsets = Array.from(Array(4)).map((_, i) => [
    getRandom() * baseOffset,
    getRandom() * baseOffset,
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
