import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import {
  ease,
  getSvgPathFromStroke,
  rng,
  getBoundsFromPoints,
  translateBounds,
  pointsBetween,
} from 'utils/utils'
import { ArrowShape, Bounds, ShapeHandle, ShapeType } from 'types'
import { registerShapeUtils } from './index'
import { circleFromThreePoints, isAngleBetween } from 'utils/utils'
import { pointInBounds } from 'utils/bounds'
import {
  intersectArcBounds,
  intersectLineSegmentBounds,
} from 'utils/intersections'
import { pointInCircle } from 'utils/hitTests'
import { defaultStyle, getShapeStyle } from 'lib/shape-styles'
import getStroke from 'perfect-freehand'

const ctpCache = new WeakMap<ArrowShape['handles'], number[]>()
const pathCache = new WeakMap<ArrowShape, string>([])

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
      seed: Math.random(),
      type: ShapeType.Arrow,
      isGenerated: false,
      name: 'Arrow',
      parentId: 'page1',
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
    const { id, bend, handles } = shape
    const { start, end, bend: _bend } = handles

    const arrowDist = vec.dist(start.point, end.point)

    const showCircle = !vec.isEqual(
      _bend.point,
      vec.med(start.point, end.point)
    )

    const style = getShapeStyle(shape.style)

    let body: JSX.Element

    if (showCircle) {
      if (!ctpCache.has(handles)) {
        ctpCache.set(
          handles,
          circleFromThreePoints(start.point, end.point, _bend.point)
        )
      }

      const circle = getCtp(shape)

      if (!pathCache.has(shape)) {
        renderPath(
          shape,
          vec.angle([circle[0], circle[1]], end.point) -
            vec.angle(start.point, end.point) +
            (Math.PI / 2) * (bend > 0 ? 0.98 : -0.98)
        )
      }

      const path = pathCache.get(shape)

      body = (
        <>
          <path
            d={getArrowArcPath(start, end, circle, bend)}
            fill="none"
            strokeWidth={(+style.strokeWidth * 1.85).toString()}
            strokeLinecap="round"
          />
          <path d={path} strokeWidth={+style.strokeWidth * 1.5} />
        </>
      )
    } else {
      if (!pathCache.has(shape)) {
        renderPath(shape)
      }

      const path = pathCache.get(shape)

      body = <path d={path} />
    }

    return (
      <g id={id}>
        {body}
        {/* <circle
          cx={start.point[0]}
          cy={start.point[1]}
          r={Math.max(4, +style.strokeWidth)}
          fill={style.stroke}
          strokeDasharray="none"
        /> */}
      </g>
    )
  },

  rotateBy(shape, delta) {
    const { start, end, bend } = shape.handles
    const mp = vec.med(start.point, end.point)
    start.point = vec.rotWith(start.point, mp, delta)
    end.point = vec.rotWith(end.point, mp, delta)
    bend.point = vec.rotWith(bend.point, mp, delta)

    this.onHandleChange(shape, shape.handles)

    return this
  },

  rotateTo(shape, rotation, delta) {
    const { start, end, bend } = shape.handles
    const mp = vec.med(start.point, end.point)
    start.point = vec.rotWith(start.point, mp, delta)
    end.point = vec.rotWith(end.point, mp, delta)
    bend.point = vec.rotWith(bend.point, mp, delta)

    this.onHandleChange(shape, shape.handles)

    return this
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const { start, end } = shape.handles
      this.boundsCache.set(shape, getBoundsFromPoints([start.point, end.point]))
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    const { start, end } = shape.handles
    return translateBounds(
      getBoundsFromPoints([start.point, end.point], shape.rotation),
      shape.point
    )
  },

  getCenter(shape) {
    const { start, end } = shape.handles
    return vec.add(shape.point, vec.med(start.point, end.point))
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
    // const oldBounds = this.getRotatedBounds(shape)
    // const prevCenter = getBoundsCenter(oldBounds)

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

    // const newBounds = this.getRotatedBounds(shape)
    // const newCenter = getBoundsCenter(newBounds)

    // shape.point = vec.add(shape.point, vec.neg(vec.sub(newCenter, prevCenter)))

    return this
  },

  onSessionComplete(shape) {
    const bounds = this.getBounds(shape)

    const offset = vec.sub([bounds.minX, bounds.minY], shape.point)

    this.translateTo(shape, vec.add(shape.point, offset))

    const { start, end, bend } = shape.handles

    start.point = vec.sub(start.point, offset)
    end.point = vec.sub(end.point, offset)
    bend.point = vec.sub(bend.point, offset)

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

function getResizeOffset(a: Bounds, b: Bounds) {
  const { minX: x0, minY: y0, width: w0, height: h0 } = a
  const { minX: x1, minY: y1, width: w1, height: h1 } = b

  let delta: number[]

  if (h0 === h1 && w0 !== w1) {
    if (x0 !== x1) {
      // moving left edge, pin right edge
      delta = vec.sub([x1, y1 + h1 / 2], [x0, y0 + h0 / 2])
    } else {
      // moving right edge, pin left edge
      delta = vec.sub([x1 + w1, y1 + h1 / 2], [x0 + w0, y0 + h0 / 2])
    }
  } else if (h0 !== h1 && w0 === w1) {
    if (y0 !== y1) {
      // moving top edge, pin bottom edge
      delta = vec.sub([x1 + w1 / 2, y1], [x0 + w0 / 2, y0])
    } else {
      // moving bottom edge, pin top edge
      delta = vec.sub([x1 + w1 / 2, y1 + h1], [x0 + w0 / 2, y0 + h0])
    }
  } else if (x0 !== x1) {
    if (y0 !== y1) {
      // moving top left, pin bottom right
      delta = vec.sub([x1, y1], [x0, y0])
    } else {
      // moving bottom left, pin top right
      delta = vec.sub([x1, y1 + h1], [x0, y0 + h0])
    }
  } else if (y0 !== y1) {
    // moving top right, pin bottom left
    delta = vec.sub([x1 + w1, y1], [x0 + w0, y0])
  } else {
    // moving bottom right, pin top left
    delta = vec.sub([x1 + w1, y1 + h1], [x0 + w0, y0 + h0])
  }

  return delta
}

function renderPath(shape: ArrowShape, endAngle = 0) {
  const { style, id } = shape
  const { start, end, bend } = shape.handles

  const getRandom = rng(id)
  const offsetA = getRandom()

  const strokeWidth = +getShapeStyle(style).strokeWidth * 2

  const arrowDist = vec.dist(start.point, end.point)

  const styles = getShapeStyle(shape.style)

  const sw = +styles.strokeWidth

  const length = Math.min(arrowDist / 2, 24 + sw * 2)
  const u = vec.uni(vec.vec(start.point, end.point))
  const v = vec.rot(vec.mul(vec.neg(u), length), endAngle)

  // Start
  const a = start.point

  // Middle
  const m = vec.add(
    vec.lrp(start.point, end.point, 0.25 + Math.abs(getRandom()) / 2),
    [getRandom() * sw, getRandom() * sw]
  )

  // End
  const b = end.point

  // Left
  let c = vec.add(
    end.point,
    vec.rot(v, Math.PI / 6 + (Math.PI / 8) * getRandom())
  )

  // Right
  let d = vec.add(
    end.point,
    vec.rot(v, -(Math.PI / 6) + (Math.PI / 8) * getRandom())
  )

  if (getRandom() > 0.5) {
    ;[c, d] = [d, c]
  }

  const points = endAngle
    ? [
        // Just the arrowhead
        ...pointsBetween(b, c),
        ...pointsBetween(c, b),
        ...pointsBetween(b, d),
        ...pointsBetween(d, b),
      ]
    : [
        // The shaft too
        b,
        a,
        ...pointsBetween(a, m),
        ...pointsBetween(m, b),
        ...pointsBetween(b, c),
        ...pointsBetween(c, b),
        ...pointsBetween(b, d),
        ...pointsBetween(d, b),
      ]

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
