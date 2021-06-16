import { uniqueId } from 'utils/utils'
import vec from 'utils/vec'
import { EllipseShape, ShapeType } from 'types'
import { getShapeUtils, registerShapeUtils } from './index'
import { boundsContained, getRotatedEllipseBounds } from 'utils/bounds'
import { intersectEllipseBounds } from 'utils/intersections'
import { pointInEllipse } from 'utils/hitTests'
import { ease, getSvgPathFromStroke, rng, translateBounds } from 'utils/utils'
import { defaultStyle, getShapeStyle } from 'lib/shape-styles'
import getStroke from 'perfect-freehand'

const pathCache = new WeakMap<EllipseShape, string>([])

const ellipse = registerShapeUtils<EllipseShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uniqueId(),
      seed: Math.random(),
      type: ShapeType.Ellipse,
      isGenerated: false,
      name: 'Ellipse',
      parentId: 'page1',
      childIndex: 0,
      point: [0, 0],
      radiusX: 1,
      radiusY: 1,
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      style: defaultStyle,
      ...props,
    }
  },

  render(shape) {
    const { id, radiusX, radiusY, style } = shape
    const styles = getShapeStyle(style)

    if (!pathCache.has(shape)) {
      renderPath(shape)
    }

    const path = pathCache.get(shape)

    return (
      <g id={id}>
        <ellipse
          id={id}
          cx={radiusX}
          cy={radiusY}
          rx={Math.max(0, radiusX - Number(styles.strokeWidth) / 2)}
          ry={Math.max(0, radiusY - Number(styles.strokeWidth) / 2)}
          stroke="none"
        />
        <path d={path} fill={styles.stroke} />
      </g>
    )

    // return (
    //   <ellipse
    //     id={id}
    //     cx={radiusX}
    //     cy={radiusY}
    //     rx={Math.max(0, radiusX - Number(styles.strokeWidth) / 2)}
    //     ry={Math.max(0, radiusY - Number(styles.strokeWidth) / 2)}
    //   />
    // )
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

  const rx = radiusX + getRandom() * strokeWidth
  const ry = radiusY + getRandom() * strokeWidth

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
    const rads = start + overlap * 2 + Math.PI * 2.5 * ease(i / 35)
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
