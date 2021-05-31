import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import * as svg from 'utils/svg'
import { ArrowShape, ShapeHandle, ShapeType } from 'types'
import { registerShapeUtils } from './index'
import { circleFromThreePoints, clamp, getSweep } from 'utils/utils'
import { boundsContained } from 'utils/bounds'
import { intersectCircleBounds } from 'utils/intersections'
import { getBoundsFromPoints, translateBounds } from 'utils/utils'
import { pointInCircle } from 'utils/hitTests'

const ctpCache = new WeakMap<ArrowShape['handles'], number[]>()

const arrow = registerShapeUtils<ArrowShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    const {
      point = [0, 0],
      points = [
        [0, 0],
        [0, 1],
      ],
      handles = {
        start: {
          id: 'start',
          index: 0,
          point: [0, 0],
        },
        end: {
          id: 'end',
          index: 1,
          point: [1, 1],
        },
        bend: {
          id: 'bend',
          index: 2,
          point: [0.5, 0.5],
        },
      },
    } = props

    return {
      id: uuid(),
      type: ShapeType.Arrow,
      isGenerated: false,
      name: 'Arrow',
      parentId: 'page0',
      childIndex: 0,
      point,
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      bend: 0,
      points,
      handles,
      decorations: {
        start: null,
        end: null,
        middle: null,
      },
      ...props,
      style: {
        strokeWidth: 2,
        ...props.style,
        fill: 'none',
      },
    }
  },

  render({ id, bend, points, handles, style }) {
    const { start, end, bend: _bend } = handles

    const arrowDist = vec.dist(start.point, end.point)
    const bendDist = arrowDist * bend

    const showCircle = Math.abs(bendDist) > 20

    const v = vec.rot(
      vec.mul(
        vec.neg(vec.uni(vec.sub(points[1], points[0]))),
        Math.min(arrowDist / 2, 16 + +style.strokeWidth * 2)
      ),
      showCircle ? (bend * Math.PI) / 2 : 0
    )
    const b = vec.add(points[1], vec.rot(v, Math.PI / 6))
    const c = vec.add(points[1], vec.rot(v, -(Math.PI / 6)))

    if (showCircle && !ctpCache.has(handles)) {
      ctpCache.set(
        handles,
        circleFromThreePoints(start.point, end.point, _bend.point)
      )
    }

    const circle = showCircle && ctpCache.get(handles)

    return (
      <g id={id}>
        {circle ? (
          <path
            d={[
              'M',
              start.point[0],
              start.point[1],
              'A',
              circle[2],
              circle[2],
              0,
              0,
              bend < 0 ? 0 : 1,
              end.point[0],
              end.point[1],
            ].join(' ')}
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <polyline
            points={[start.point, end.point].join(' ')}
            strokeLinecap="round"
          />
        )}
        <circle
          cx={start.point[0]}
          cy={start.point[1]}
          r={+style.strokeWidth}
          fill={style.stroke}
        />
        <polyline
          points={[b, points[1], c].join()}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    )
  },

  applyStyles(shape, style) {
    Object.assign(shape.style, style)
    return this
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      this.boundsCache.set(shape, getBoundsFromPoints(shape.points))
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    return this.getBounds(shape)
  },

  getCenter(shape) {
    const bounds = this.getBounds(shape)
    return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
  },

  hitTest(shape, point) {
    const { start, end, bend } = shape.handles
    if (shape.bend === 0) {
      return (
        vec.distanceToLineSegment(
          start.point,
          end.point,
          vec.sub(point, shape.point)
        ) < 4
      )
    }

    if (!ctpCache.has(shape.handles)) {
      ctpCache.set(
        shape.handles,
        circleFromThreePoints(start.point, end.point, bend.point)
      )
    }

    const [cx, cy, r] = ctpCache.get(shape.handles)

    return !pointInCircle(point, vec.add(shape.point, [cx, cy]), r - 4)
  },

  hitTestBounds(this, shape, brushBounds) {
    const shapeBounds = this.getBounds(shape)
    return (
      boundsContained(shapeBounds, brushBounds) ||
      intersectCircleBounds(shape.point, 4, brushBounds).length > 0
    )
  },

  rotateTo(shape, rotation) {
    // const rot = rotation - shape.rotation
    // const center = this.getCenter(shape)
    // shape.points = shape.points.map((pt) => vec.rotWith(pt, shape.point, rot))
    shape.rotation = rotation
    return this
  },

  translateTo(shape, point) {
    shape.point = vec.toPrecision(point)
    return this
  },

  transform(shape, bounds, { initialShape, scaleX, scaleY }) {
    const initialShapeBounds = this.getBounds(initialShape)

    // console.log([...shape.point], [bounds.minX, bounds.minY])

    shape.point = [bounds.minX, bounds.minY]

    shape.points = shape.points.map((_, i) => {
      const [x, y] = initialShape.points[i]
      let nw = x / initialShapeBounds.width
      let nh = y / initialShapeBounds.height

      if (i === 1) {
        let [x0, y0] = initialShape.points[0]
        if (x0 === x) nw = 1
        if (y0 === y) nh = 1
      }

      return [
        bounds.width * (scaleX < 0 ? 1 - nw : nw),
        bounds.height * (scaleY < 0 ? 1 - nh : nh),
      ]
    })

    const { start, end, bend } = shape.handles

    start.point = shape.points[0]
    end.point = shape.points[1]

    // start.point[0] = initialShape.handles.start.point[0] * scaleX
    // end.point[0] = initialShape.handles.end.point[0] * scaleX

    // start.point[1] = initialShape.handles.start.point[1] * scaleY
    // end.point[1] = initialShape.handles.end.point[1] * scaleY

    const bendDist = (vec.dist(start.point, end.point) / 2) * shape.bend
    const midPoint = vec.med(start.point, end.point)
    const u = vec.uni(vec.vec(start.point, end.point))

    bend.point =
      Math.abs(bendDist) > 10
        ? vec.add(midPoint, vec.mul(vec.per(u), bendDist))
        : midPoint

    shape.points = [shape.handles.start.point, shape.handles.end.point]

    return this
  },

  transformSingle(shape, bounds, info) {
    this.transform(shape, bounds, info)
    return this
  },

  setProperty(shape, prop, value) {
    shape[prop] = value
    return this
  },

  onHandleMove(shape, handles) {
    const { start, end, bend } = shape.handles

    for (let id in handles) {
      const handle = handles[id]

      shape.handles[handle.id] = handle

      if (handle.index < 2) {
        shape.points[handle.index] = handle.point
      }

      const dist = vec.dist(start.point, end.point)

      if (handle.id === 'bend') {
        const distance = vec.distanceToLineSegment(
          start.point,
          end.point,
          handle.point,
          true
        )
        shape.bend = clamp(distance / (dist / 2), -1, 1)
        if (!vec.clockwise(start.point, bend.point, end.point)) shape.bend *= -1
      }
    }

    const dist = vec.dist(start.point, end.point)
    const midPoint = vec.med(start.point, end.point)
    const bendDist = (dist / 2) * shape.bend
    const u = vec.uni(vec.vec(start.point, end.point))

    bend.point =
      Math.abs(bendDist) > 10
        ? vec.add(midPoint, vec.mul(vec.per(u), bendDist))
        : midPoint

    return this
  },

  canTransform: true,
  canChangeAspectRatio: true,
})

export default arrow

function getArrowArcPath(
  cx: number,
  cy: number,
  r: number,
  start: number[],
  end: number[]
) {
  return `
      A ${r},${r},0,
      ${getSweep([cx, cy], start, end) > 0 ? '1' : '0'},
      0,${end[0]},${end[1]}`
}
