import { getArcLength, uniqueId } from 'utils/utils'
import vec from 'utils/vec'
import {
  getSvgPathFromStroke,
  rng,
  getBoundsFromPoints,
  translateBounds,
  pointsBetween,
} from 'utils/utils'
import { ArrowShape, DashStyle, ShapeHandle, ShapeType } from 'types'
import { circleFromThreePoints, isAngleBetween } from 'utils/utils'
import { pointInBounds } from 'utils/hitTests'
import {
  intersectArcBounds,
  intersectLineSegmentBounds,
} from 'utils/intersections'
import { pointInCircle } from 'utils/hitTests'
import { defaultStyle, getShapeStyle } from 'state/shape-styles'
import getStroke from 'perfect-freehand'
import React from 'react'
import { registerShapeUtils } from './register'
import { getPerfectDashProps } from 'utils/dashes'

const pathCache = new WeakMap<ArrowShape, string>([])

// A cache for semi-expensive circles calculated from three points
function getCtp(shape: ArrowShape) {
  const { start, end, bend } = shape.handles
  return circleFromThreePoints(start.point, end.point, bend.point)
}

const arrow = registerShapeUtils<ArrowShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    const {
      point = [0, 0],
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
      id: uniqueId(),
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
    const { id, bend, handles, style } = shape
    const { start, end, bend: _bend } = handles

    const isStraightLine = vec.isEqual(
      _bend.point,
      vec.med(start.point, end.point)
    )

    const styles = getShapeStyle(style)

    const strokeWidth = +styles.strokeWidth

    const arrowDist = vec.dist(start.point, end.point)

    if (isStraightLine) {
      // Render a straight arrow as a freehand path.
      if (!pathCache.has(shape)) {
        renderPath(shape)
      }

      const path = pathCache.get(shape)

      const { strokeDasharray, strokeDashoffset } =
        shape.style.dash === DashStyle.Solid
          ? {
              strokeDasharray: 'none',
              strokeDashoffset: '0',
            }
          : getPerfectDashProps(
              arrowDist,
              strokeWidth * 1.618,
              shape.style.dash === DashStyle.Dotted ? 'dotted' : 'dashed',
              2
            )

      return (
        <g id={id}>
          {/* Improves hit testing */}
          <path
            d={path}
            stroke="transparent"
            fill="none"
            strokeWidth={Math.max(8, strokeWidth * 2)}
            strokeDasharray="none"
            strokeDashoffset="none"
            strokeLinecap="round"
          />
          {/* Arrowshaft */}
          <path
            d={path}
            fill="none"
            strokeWidth={
              strokeWidth * (style.dash === DashStyle.Solid ? 1 : 1.618)
            }
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
          {/* Arrowhead */}
          {style.dash !== DashStyle.Solid && (
            <path
              d={getArrowHeadPath(shape, 0)}
              strokeWidth={strokeWidth * 1.618}
              fill="none"
              strokeDashoffset="none"
              strokeDasharray="none"
            />
          )}
        </g>
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

    const path = getArrowArcPath(start, end, circle, bend)

    const { strokeDasharray, strokeDashoffset } =
      shape.style.dash === DashStyle.Solid
        ? {
            strokeDasharray: 'none',
            strokeDashoffset: '0',
          }
        : getPerfectDashProps(
            getArcLength(
              [circle[0], circle[1]],
              circle[2],
              start.point,
              end.point
            ) - 1,
            strokeWidth * 1.618,
            shape.style.dash === DashStyle.Dotted ? 'dotted' : 'dashed',
            2
          )

    return (
      <g id={id}>
        {/* Improves hit testing */}
        <path
          d={path}
          stroke="transparent"
          fill="none"
          strokeWidth={Math.max(8, strokeWidth * 2)}
          strokeLinecap="round"
          strokeDasharray="none"
        />
        {/* Arrow Shaft */}
        <path
          d={path}
          fill="none"
          strokeWidth={strokeWidth * 1.618}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
        {/* Arrowhead */}
        <path
          d={pathCache.get(shape)}
          strokeWidth={strokeWidth * 1.618}
          strokeDasharray="none"
          fill="none"
        />
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

  onHandleChange(shape, handles) {
    // const oldBounds = this.getRotatedBounds(shape)
    // const prevCenter = getBoundsCenter(oldBounds)

    for (const id in handles) {
      const handle = handles[id]

      shape.handles[handle.id] = handle

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

function renderPath(shape: ArrowShape, endAngle = 0) {
  const { style, id } = shape
  const { start, end } = shape.handles

  const getRandom = rng(id)

  const strokeWidth = +getShapeStyle(style).strokeWidth * 2

  const sw = strokeWidth

  // Start
  const a = start.point

  // End
  const b = end.point

  // Middle
  const m = vec.add(
    vec.lrp(start.point, end.point, 0.25 + Math.abs(getRandom()) / 2),
    [getRandom() * sw, getRandom() * sw]
  )

  // Left and right sides of the arrowhead
  let { left: c, right: d } = getArrowHeadPoints(shape, endAngle)

  // Switch which side of the arrow is drawn first
  if (getRandom() > 0) [c, d] = [d, c]

  if (style.dash !== DashStyle.Solid) {
    pathCache.set(
      shape,
      (endAngle ? ['M', c, 'L', b, d] : ['M', a, 'L', b]).join(' ')
    )
    return
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
        // The arrow shaft
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

function getArrowHeadPath(shape: ArrowShape, endAngle = 0) {
  const { end } = shape.handles
  const { left, right } = getArrowHeadPoints(shape, endAngle)
  return ['M', left, 'L', end.point, right].join(' ')
}

function getArrowHeadPoints(shape: ArrowShape, endAngle = 0) {
  const { start, end } = shape.handles

  const stroke = +getShapeStyle(shape.style).strokeWidth * 2

  const arrowDist = vec.dist(start.point, end.point)

  const arrowHeadlength = Math.min(arrowDist / 3, stroke * 4)

  // Unit vector from start to end
  const u = vec.uni(vec.vec(start.point, end.point))

  // The end of the arrowhead wings
  const v = vec.rot(vec.mul(vec.neg(u), arrowHeadlength), endAngle)

  // Use the shape's random seed to create minor offsets for the angles
  const getRandom = rng(shape.id)

  return {
    left: vec.add(
      end.point,
      vec.rot(v, Math.PI / 6 + (Math.PI / 8) * getRandom())
    ),
    right: vec.add(
      end.point,
      vec.rot(v, -(Math.PI / 6) + (Math.PI / 8) * getRandom())
    ),
  }
}
