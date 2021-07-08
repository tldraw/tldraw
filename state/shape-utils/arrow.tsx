import vec from 'utils/vec'
import {
  getArcLength,
  uniqueId,
  getSvgPathFromStroke,
  rng,
  getBoundsFromPoints,
  translateBounds,
  pointInBounds,
  pointInCircle,
  circleFromThreePoints,
  isAngleBetween,
  getPerfectDashProps,
  clampToRotationToSegments,
  lerpAngles,
  clamp,
  getFromCache,
} from 'utils'
import {
  ArrowShape,
  DashStyle,
  Decoration,
  ShapeHandle,
  ShapeType,
} from 'types'
import {
  intersectArcBounds,
  intersectLineSegmentBounds,
} from 'utils/intersections'
import { defaultStyle, getShapeStyle } from 'state/shape-styles'
import getStroke from 'perfect-freehand'
import React from 'react'
import { registerShapeUtils } from './register'

const pathCache = new WeakMap<ArrowShape['handles'], string>([])

// A cache for semi-expensive circles calculated from three points
function getCtp(shape: ArrowShape) {
  const { start, end, bend } = shape.handles
  return circleFromThreePoints(start.point, end.point, bend.point)
}

const arrow = registerShapeUtils<ArrowShape>({
  boundsCache: new WeakMap([]),

  defaultProps: {
    id: uniqueId(),
    type: ShapeType.Arrow,

    name: 'Arrow',
    parentId: 'page1',
    childIndex: 0,
    point: [0, 0],
    rotation: 0,

    bend: 0,
    handles: {
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
    decorations: {
      start: null,
      middle: null,
      end: Decoration.Arrow,
    },
    style: {
      ...defaultStyle,
      isFilled: false,
    },
  },

  create(props) {
    const shape = {
      ...this.defaultProps,
      ...props,
      decorations: {
        ...this.defaultProps.decorations,
        ...props.decorations,
      },
      style: {
        ...this.defaultProps.style,
        ...props.style,
        isFilled: false,
      },
    }

    return shape
  },

  shouldRender(shape, prev) {
    return shape.handles !== prev.handles || shape.style !== prev.style
  },

  render(shape) {
    const { id, bend, handles, style } = shape
    const { start, end, bend: _bend } = handles

    const isStraightLine =
      vec.dist(_bend.point, vec.round(vec.med(start.point, end.point))) < 1

    const isDraw = shape.style.dash === DashStyle.Draw

    const styles = getShapeStyle(style)

    const { strokeWidth } = styles

    const arrowDist = vec.dist(start.point, end.point)

    const arrowHeadlength = Math.min(arrowDist / 3, strokeWidth * 8)

    let shaftPath: JSX.Element
    let insetStart: number[]
    let insetEnd: number[]

    if (isStraightLine) {
      const sw = strokeWidth * (isDraw ? 0.618 : 1.618)

      const path = isDraw
        ? getFromCache(pathCache, shape.handles, (cache) =>
            cache.set(shape.handles, renderFreehandArrowShaft(shape))
          )
        : 'M' + vec.round(start.point) + 'L' + vec.round(end.point)

      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        arrowDist,
        sw,
        shape.style.dash,
        2
      )

      insetStart = vec.nudge(start.point, end.point, arrowHeadlength)
      insetEnd = vec.nudge(end.point, start.point, arrowHeadlength)

      // Straight arrow path
      shaftPath = (
        <>
          <path
            d={path}
            fill="none"
            stroke="transparent"
            strokeWidth={Math.max(8, strokeWidth * 2)}
            strokeDasharray="none"
            strokeDashoffset="none"
            strokeLinecap="round"
          />
          <path
            d={path}
            fill={styles.stroke}
            stroke={styles.stroke}
            strokeWidth={sw}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </>
      )
    } else {
      const circle = getCtp(shape)

      const sw = strokeWidth * (isDraw ? 0.618 : 1.618)

      const path = isDraw
        ? getFromCache(pathCache, shape.handles, (cache) =>
            cache.set(
              shape.handles,
              renderCurvedFreehandArrowShaft(shape, circle)
            )
          )
        : getArrowArcPath(start, end, circle, bend)

      const arcLength = getArcLength(
        [circle[0], circle[1]],
        circle[2],
        start.point,
        end.point
      )

      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        arcLength - 1,
        sw,
        shape.style.dash,
        2
      )

      const center = [circle[0], circle[1]]
      const radius = circle[2]
      const sa = vec.angle(center, start.point)
      const ea = vec.angle(center, end.point)
      const t = arrowHeadlength / Math.abs(arcLength)

      insetStart = vec.nudgeAtAngle(center, lerpAngles(sa, ea, t), radius)
      insetEnd = vec.nudgeAtAngle(center, lerpAngles(ea, sa, t), radius)

      // Curved arrow path
      shaftPath = (
        <>
          <path
            d={path}
            fill="none"
            stroke="transparent"
            strokeWidth={Math.max(8, strokeWidth * 2)}
            strokeDasharray="none"
            strokeDashoffset="none"
            strokeLinecap="round"
          />
          <path
            d={path}
            fill={isDraw ? styles.stroke : 'none'}
            stroke={styles.stroke}
            strokeWidth={sw}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          ></path>
        </>
      )
    }

    return (
      <g id={id}>
        {shaftPath}
        {shape.decorations.start === Decoration.Arrow && (
          <path
            d={getArrowHeadPath(shape, start.point, insetStart)}
            fill="none"
            stroke={styles.stroke}
            strokeWidth={strokeWidth * 1.618}
            strokeDashoffset="none"
            strokeDasharray="none"
          />
        )}
        {shape.decorations.end === Decoration.Arrow && (
          <path
            d={getArrowHeadPath(shape, end.point, insetEnd)}
            fill="none"
            stroke={styles.stroke}
            strokeWidth={strokeWidth * 1.618}
            strokeDashoffset="none"
            strokeDasharray="none"
          />
        )}
      </g>
    )
  },

  rotateBy(shape, delta) {
    const { start, end, bend } = shape.handles
    const mp = vec.med(start.point, end.point)
    start.point = vec.rotWith(start.point, mp, delta)
    end.point = vec.rotWith(end.point, mp, delta)
    bend.point = vec.rotWith(bend.point, mp, delta)

    this.onHandleChange(shape, shape.handles, {
      delta: [0, 0],
      shiftKey: false,
    })

    return this
  },

  rotateTo(shape, rotation, delta) {
    const { start, end, bend } = shape.handles
    const mp = vec.med(start.point, end.point)
    start.point = vec.rotWith(start.point, mp, delta)
    end.point = vec.rotWith(end.point, mp, delta)
    bend.point = vec.rotWith(bend.point, mp, delta)

    this.onHandleChange(shape, shape.handles, {
      delta: [0, 0],
      shiftKey: false,
    })

    return this
  },

  getBounds(shape) {
    const bounds = getFromCache(this.boundsCache, shape, (cache) => {
      const { start, bend, end } = shape.handles
      cache.set(
        shape,
        getBoundsFromPoints([start.point, bend.point, end.point])
      )
    })

    return translateBounds(bounds, shape.point)
  },

  getRotatedBounds(shape) {
    const { start, bend, end } = shape.handles
    return translateBounds(
      getBoundsFromPoints([start.point, bend.point, end.point], shape.rotation),
      shape.point
    )
  },

  getCenter(shape) {
    const { start, end } = shape.handles
    return vec.add(shape.point, vec.med(start.point, end.point))
  },

  hitTest(shape, point) {
    const { start, end } = shape.handles
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

    // let nw = initialShape.point[0] / initialShapeBounds.width
    // let nh = initialShape.point[1] / initialShapeBounds.height

    // shape.point = [
    //   bounds.width * (scaleX < 0 ? 1 - nw : nw),
    //   bounds.height * (scaleY < 0 ? 1 - nh : nh),
    // ]

    shape.point = [bounds.minX, bounds.minY]

    const handles = ['start', 'end']

    handles.forEach((handle) => {
      const [x, y] = initialShape.handles[handle].point
      const nw = x / initialShapeBounds.width
      const nh = y / initialShapeBounds.height

      shape.handles[handle].point = [
        bounds.width * (scaleX < 0 ? 1 - nw : nw),
        bounds.height * (scaleY < 0 ? 1 - nh : nh),
      ]
    })

    const { start, bend, end } = shape.handles

    const dist = vec.dist(start.point, end.point)

    const midPoint = vec.med(start.point, end.point)

    const bendDist = (dist / 2) * initialShape.bend

    const u = vec.uni(vec.vec(start.point, end.point))

    const point = vec.add(midPoint, vec.mul(vec.per(u), bendDist))

    bend.point = Math.abs(bendDist) < 10 ? midPoint : point

    return this
  },

  onDoublePointHandle(shape, handle) {
    switch (handle) {
      case 'bend': {
        shape.bend = 0
        shape.handles.bend.point = getBendPoint(shape)
        break
      }
      case 'start': {
        shape.decorations.start = shape.decorations.start
          ? null
          : Decoration.Arrow
        break
      }
      case 'end': {
        shape.decorations.end = shape.decorations.end ? null : Decoration.Arrow
        break
      }
    }

    return this
  },

  onHandleChange(shape, handles, { shiftKey }) {
    // Apple changes to the handles
    for (const id in handles) {
      const handle = handles[id]
      shape.handles[handle.id] = handle
    }

    // If the user is holding shift, we want to snap the handles to angles
    for (const id in handles) {
      if ((id === 'start' || id === 'end') && shiftKey) {
        const point = handles[id].point
        const other = id === 'start' ? shape.handles.end : shape.handles.start
        const angle = vec.angle(other.point, point)
        const distance = vec.dist(other.point, point)
        const newAngle = clampToRotationToSegments(angle, 24)

        shape.handles[id].point = vec.nudgeAtAngle(
          other.point,
          newAngle,
          distance
        )
      }
    }

    // If the user is moving the bend handle, we want to move the bend point
    if ('bend' in handles) {
      const { start, end, bend } = shape.handles

      const distance = vec.dist(start.point, end.point)
      const midPoint = vec.med(start.point, end.point)
      const angle = vec.angle(start.point, end.point)
      const u = vec.uni(vec.vec(start.point, end.point))

      // Create a line segment perendicular to the line between the start and end points
      const ap = vec.add(midPoint, vec.mul(vec.per(u), distance / 2))
      const bp = vec.sub(midPoint, vec.mul(vec.per(u), distance / 2))

      const bendPoint = vec.nearestPointOnLineSegment(ap, bp, bend.point, true)

      // Find the distance between the midpoint and the nearest point on the
      // line segment to the bend handle's dragged point
      const bendDist = vec.dist(midPoint, bendPoint)

      // The shape's "bend" is the ratio of the bend to the distance between
      // the start and end points. If the bend is below a certain amount, the
      // bend should be zero.
      shape.bend = clamp(bendDist / (distance / 2), -0.99, 0.99)

      // If the point is to the left of the line segment, we make the bend
      // negative, otherwise it's positive.
      const angleToBend = vec.angle(start.point, bendPoint)

      if (isAngleBetween(angle, angle + Math.PI, angleToBend)) {
        shape.bend *= -1
      }
    }

    shape.handles.start.point = vec.round(shape.handles.start.point)
    shape.handles.end.point = vec.round(shape.handles.end.point)
    shape.handles.bend.point = getBendPoint(shape)

    return this
  },

  onSessionComplete(shape) {
    const bounds = this.getBounds(shape)

    const offset = vec.sub([bounds.minX, bounds.minY], shape.point)

    this.translateTo(shape, vec.add(shape.point, offset))

    const { start, end, bend } = shape.handles

    start.point = vec.round(vec.sub(start.point, offset))
    end.point = vec.round(vec.sub(end.point, offset))
    bend.point = vec.round(vec.sub(bend.point, offset))

    shape.handles = { ...shape.handles }

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
  const bendDist = (dist / 2) * shape.bend
  const u = vec.uni(vec.vec(start.point, end.point))

  const point = vec.round(
    Math.abs(bendDist) < 10
      ? midPoint
      : vec.add(midPoint, vec.mul(vec.per(u), bendDist))
  )

  return point
}

function renderFreehandArrowShaft(shape: ArrowShape) {
  const { style, id } = shape
  const { start, end } = shape.handles

  const getRandom = rng(id)

  const strokeWidth = +getShapeStyle(style).strokeWidth * 2

  const st = Math.abs(getRandom())

  const stroke = getStroke(
    [
      ...vec.pointsBetween(start.point, end.point),
      end.point,
      end.point,
      end.point,
      end.point,
    ],
    {
      size: strokeWidth / 2,
      thinning: 0.5 + getRandom() * 0.3,
      easing: (t) => t * t,
      end: { taper: 1 },
      start: { taper: 1 + 32 * (st * st * st) },
      simulatePressure: true,
      last: true,
    }
  )

  const path = getSvgPathFromStroke(stroke)

  return path
}

function renderCurvedFreehandArrowShaft(shape: ArrowShape, circle: number[]) {
  const { style, id } = shape
  const { start, end } = shape.handles

  const getRandom = rng(id)

  const strokeWidth = +getShapeStyle(style).strokeWidth * 2

  const st = Math.abs(getRandom())

  const center = [circle[0], circle[1]]
  const radius = circle[2]

  const startAngle = vec.angle(center, start.point)

  const endAngle = vec.angle(center, end.point)

  const points: number[][] = []

  for (let i = 0; i < 21; i++) {
    const t = i / 20
    const angle = lerpAngles(startAngle, endAngle, t)
    points.push(vec.round(vec.nudgeAtAngle(center, angle, radius)))
  }

  const stroke = getStroke([...points, end.point, end.point], {
    size: strokeWidth / 2,
    thinning: 0.5 + getRandom() * 0.3,
    easing: (t) => t * t,
    end: {
      taper: shape.decorations.end ? 1 : 1 + strokeWidth * 5 * (st * st * st),
    },
    start: {
      taper: shape.decorations.start ? 1 : 1 + strokeWidth * 5 * (st * st * st),
    },
    simulatePressure: true,
    streamline: 0.01,
    last: true,
  })

  const path = getSvgPathFromStroke(stroke)

  return path
}

function getArrowHeadPath(shape: ArrowShape, point: number[], inset: number[]) {
  const { left, right } = getArrowHeadPoints(shape, point, inset)
  return ['M', left, 'L', point, right].join(' ')
}

function getArrowHeadPoints(
  shape: ArrowShape,
  point: number[],
  inset: number[]
) {
  // Use the shape's random seed to create minor offsets for the angles
  const getRandom = rng(shape.id)

  return {
    left: vec.rotWith(inset, point, Math.PI / 6 + (Math.PI / 12) * getRandom()),
    right: vec.rotWith(
      inset,
      point,
      -Math.PI / 6 + (Math.PI / 12) * getRandom()
    ),
  }
}
