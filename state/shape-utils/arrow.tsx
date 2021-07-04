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

const pathCache = new WeakMap<ArrowShape, string>([])

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

    // shape.handles.bend.point = getBendPoint(shape)

    return shape
  },

  shouldRender(shape, prev) {
    return shape.handles !== prev.handles || shape.style !== prev.style
  },

  render(shape) {
    const { id, bend, handles, style } = shape
    const { start, end, bend: _bend } = handles

    const isStraightLine = vec.isEqual(
      _bend.point,
      vec.med(start.point, end.point)
    )

    const styles = getShapeStyle(style)

    const strokeWidth = +styles.strokeWidth

    const sw = strokeWidth * 1.618

    const arrowDist = vec.dist(start.point, end.point)

    let shaftPath: JSX.Element
    let startAngle: number
    let endAngle: number

    if (isStraightLine) {
      const straight_sw =
        strokeWidth *
        (style.dash === DashStyle.Draw && bend === 0 ? 0.5 : 1.618)

      if (shape.style.dash === DashStyle.Draw && !pathCache.has(shape)) {
        renderFreehandArrowShaft(shape)
      }

      const path =
        shape.style.dash === DashStyle.Draw
          ? pathCache.get(shape)
          : 'M' + start.point + 'L' + end.point

      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        arrowDist,
        sw,
        shape.style.dash,
        2
      )

      startAngle = Math.PI

      endAngle = 0

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
            strokeWidth={straight_sw}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </>
      )
    } else {
      const circle = getCtp(shape)

      const path = getArrowArcPath(start, end, circle, bend)

      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        getArcLength(
          [circle[0], circle[1]],
          circle[2],
          start.point,
          end.point
        ) - 1,
        sw,
        shape.style.dash,
        2
      )

      startAngle =
        vec.angle([circle[0], circle[1]], start.point) -
        vec.angle(end.point, start.point) +
        (Math.PI / 2) * (bend > 0 ? 0.98 : -0.98)

      endAngle =
        vec.angle([circle[0], circle[1]], end.point) -
        vec.angle(start.point, end.point) +
        (Math.PI / 2) * (bend > 0 ? 0.98 : -0.98)

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
            fill="none"
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
            d={getArrowHeadPath(shape, start.point, startAngle)}
            fill="none"
            stroke={styles.stroke}
            strokeWidth={sw}
            strokeDashoffset="none"
            strokeDasharray="none"
          />
        )}
        {shape.decorations.end === Decoration.Arrow && (
          <path
            d={getArrowHeadPath(shape, end.point, endAngle)}
            fill="none"
            stroke={styles.stroke}
            strokeWidth={sw}
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
      const { start, bend, end } = shape.handles
      this.boundsCache.set(
        shape,
        getBoundsFromPoints([start.point, bend.point, end.point])
      )
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
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

  onHandleChange(shape, handles) {
    for (const id in handles) {
      const handle = handles[id]

      shape.handles[handle.id] = handle
    }

    const midPoint = vec.med(shape.handles.start.point, shape.handles.end.point)

    if ('bend' in handles) {
      const { start, end, bend } = shape.handles

      const dist = vec.dist(start.point, end.point)

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

    shape.handles.bend.point = getBendPoint(shape)

    if (vec.isEqual(shape.handles.bend.point, midPoint)) {
      shape.bend = 0
    }

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

  return Math.abs(bendDist) < 10
    ? midPoint
    : vec.add(midPoint, vec.mul(vec.per(u), bendDist))
}

function renderFreehandArrowShaft(shape: ArrowShape) {
  const { style, id } = shape
  const { start, end } = shape.handles

  const getRandom = rng(id)

  const strokeWidth = +getShapeStyle(style).strokeWidth * 2

  const st = Math.abs(getRandom())

  const stroke = getStroke(
    [
      start.point,
      ...vec.pointsBetween(start.point, end.point),
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
    }
  )

  pathCache.set(shape, getSvgPathFromStroke(stroke))
}

function getArrowHeadPath(shape: ArrowShape, point: number[], angle = 0) {
  const { left, right } = getArrowHeadPoints(shape, point, angle)
  return ['M', left, 'L', point, right].join(' ')
}

function getArrowHeadPoints(shape: ArrowShape, point: number[], angle = 0) {
  const { start, end } = shape.handles

  const stroke = +getShapeStyle(shape.style).strokeWidth * 2

  const arrowDist = vec.dist(start.point, end.point)

  const arrowHeadlength = Math.min(arrowDist / 3, stroke * 4)

  // Unit vector from start to end
  const u = vec.uni(vec.vec(start.point, end.point))

  // The end of the arrowhead wings
  const v = vec.rot(vec.mul(vec.neg(u), arrowHeadlength), angle)

  // Use the shape's random seed to create minor offsets for the angles
  const getRandom = rng(shape.id)

  return {
    left: vec.add(
      point,
      vec.rot(v, Math.PI / 6 + (Math.PI / 12) * getRandom())
    ),
    right: vec.add(
      point,
      vec.rot(v, -(Math.PI / 6) + (Math.PI / 12) * getRandom())
    ),
  }
}
