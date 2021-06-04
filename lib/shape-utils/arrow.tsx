import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import * as svg from 'utils/svg'
import {
  ArrowShape,
  ColorStyle,
  DashStyle,
  ShapeHandle,
  ShapeType,
  SizeStyle,
} from 'types'
import { registerShapeUtils } from './index'
import { circleFromThreePoints, clamp, isAngleBetween } from 'utils/utils'
import { pointInBounds } from 'utils/bounds'
import {
  intersectArcBounds,
  intersectLineSegmentBounds,
} from 'utils/intersections'
import { getBoundsFromPoints, translateBounds } from 'utils/utils'
import { pointInCircle } from 'utils/hitTests'
import { defaultStyle, getShapeStyle } from 'lib/shape-styles'

const ctpCache = new WeakMap<ArrowShape['handles'], number[]>()

function getCtp(shape: ArrowShape) {
  if (!ctpCache.has(shape.handles)) {
    const { start, end, bend } = shape.handles
    ctpCache.set(
      shape.handles,
      circleFromThreePoints(start.point, end.point, bend.point)
    )
  }

  return ctpCache.get(shape.handles)
}

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
        ...defaultStyle,
        ...props.style,
        isFilled: false,
      },
    }
  },

  render(shape) {
    const { id, bend, points, handles } = shape
    const { start, end, bend: _bend } = handles

    const arrowDist = vec.dist(start.point, end.point)
    const showCircle = !vec.isEqual(
      _bend.point,
      vec.med(start.point, end.point)
    )

    const style = getShapeStyle(shape.style)

    let body: JSX.Element
    let endAngle: number

    if (showCircle) {
      if (!ctpCache.has(handles)) {
        ctpCache.set(
          handles,
          circleFromThreePoints(start.point, end.point, _bend.point)
        )
      }

      const circle = getCtp(shape)

      body = (
        <path
          d={getArrowArcPath(start, end, circle, bend)}
          fill="none"
          strokeLinecap="round"
        />
      )

      const CE =
        vec.angle([circle[0], circle[1]], end.point) -
        vec.angle(start.point, end.point) +
        (Math.PI / 2) * (bend > 0 ? 0.98 : -0.98)

      endAngle = CE
    } else {
      body = (
        <polyline
          points={[start.point, end.point].join(' ')}
          strokeLinecap="round"
        />
      )
      endAngle = 0
    }

    // Arrowhead
    const length = Math.min(arrowDist / 2, 16 + +style.strokeWidth * 2)
    const u = vec.uni(vec.vec(start.point, end.point))
    const v = vec.rot(vec.mul(vec.neg(u), length), endAngle)
    const b = vec.add(points[1], vec.rot(v, Math.PI / 6))
    const c = vec.add(points[1], vec.rot(v, -(Math.PI / 6)))

    return (
      <g id={id}>
        {body}
        <circle
          cx={start.point[0]}
          cy={start.point[1]}
          r={+style.strokeWidth}
          fill={style.stroke}
          strokeDasharray="none"
        />
        <polyline
          points={[b, points[1], c].join()}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="none"
        />
      </g>
    )
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      this.boundsCache.set(shape, getBoundsFromPoints(shape.points))
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
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

    const [cx, cy, r] = getCtp(shape)

    return !pointInCircle(point, vec.add(shape.point, [cx, cy]), r - 4)
  },

  hitTestBounds(this, shape, brushBounds) {
    const { start, end, bend } = shape.handles

    const sp = vec.add(shape.point, start.point)
    const ep = vec.add(shape.point, end.point)

    if (pointInBounds(sp, brushBounds) || pointInBounds(ep, brushBounds)) {
      return true
    }

    if (vec.isEqual(vec.med(start.point, end.point), bend.point)) {
      return intersectLineSegmentBounds(sp, ep, brushBounds).length > 0
    } else {
      const [cx, cy, r] = getCtp(shape)
      const cp = vec.add(shape.point, [cx, cy])

      return intersectArcBounds(sp, ep, cp, r, brushBounds).length > 0
    }
  },

  transform(shape, bounds, { initialShape, scaleX, scaleY }) {
    const initialShapeBounds = this.getBounds(initialShape)

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

    bend.point = getBendPoint(shape)

    shape.points = [shape.handles.start.point, shape.handles.end.point]

    return this
  },

  onHandleChange(shape, handles) {
    for (let id in handles) {
      const handle = handles[id]

      shape.handles[handle.id] = handle

      if (handle.index < 2) {
        shape.points[handle.index] = handle.point
      }

      const { start, end, bend } = shape.handles

      const dist = vec.dist(start.point, end.point)

      if (handle.id === 'bend') {
        const midPoint = vec.med(start.point, end.point)
        const u = vec.uni(vec.vec(start.point, end.point))
        const ap = vec.add(midPoint, vec.mul(vec.per(u), dist / 2))
        const bp = vec.sub(midPoint, vec.mul(vec.per(u), dist / 2))

        bend.point = vec.nearestPointOnLineSegment(ap, bp, bend.point, true)
        shape.bend = vec.dist(bend.point, midPoint) / (dist / 2)

        const sa = vec.angle(end.point, start.point)
        const la = sa - Math.PI / 2
        if (isAngleBetween(sa, la, vec.angle(end.point, bend.point))) {
          shape.bend *= -1
        }
      }
    }

    shape.handles.bend.point = getBendPoint(shape)

    return this
  },

  applyStyles(shape, style) {
    Object.assign(shape.style, style)
    shape.style.isFilled = false
    return this
  },

  canStyleFill: false,
})

export default arrow

function getArrowArcPath(
  start: ShapeHandle,
  end: ShapeHandle,
  circle: number[],
  bend: number
) {
  return [
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
  ].join(' ')
}

function getBendPoint(shape: ArrowShape) {
  const { start, end } = shape.handles

  const dist = vec.dist(start.point, end.point)
  const midPoint = vec.med(start.point, end.point)
  const bendDist = (dist / 2) * shape.bend * Math.min(1, dist / 128)
  const u = vec.uni(vec.vec(start.point, end.point))

  return Math.abs(bendDist) < 10
    ? midPoint
    : vec.add(midPoint, vec.mul(vec.per(u), bendDist))
}
