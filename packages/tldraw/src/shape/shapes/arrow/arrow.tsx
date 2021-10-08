import * as React from 'react'
import { ShapeUtil, SVGContainer, TLBounds, Utils, TLHandle } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import getStroke from 'perfect-freehand'
import { defaultStyle, getPerfectDashProps, getShapeStyle } from '~shape/shape-styles'
import {
  ArrowShape,
  Decoration,
  TLDrawShapeType,
  TLDrawToolType,
  DashStyle,
  ArrowBinding,
  TLDrawMeta,
  EllipseShape,
} from '~types'
import {
  intersectArcBounds,
  intersectCircleCircle,
  intersectCircleLineSegment,
  intersectLineSegmentBounds,
  intersectRayBounds,
  intersectRayEllipse,
} from '@tldraw/intersect'
import { EASINGS } from '~state/utils'

export const Arrow = new ShapeUtil<ArrowShape, SVGSVGElement, TLDrawMeta>(() => ({
  type: TLDrawShapeType.Arrow,

  toolType: TLDrawToolType.Handle,

  canStyleFill: false,

  pathCache: new WeakMap<ArrowShape, string>(),

  defaultProps: {
    id: 'id',
    type: TLDrawShapeType.Arrow,
    name: 'Arrow',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    rotation: 0,
    bend: 0,
    handles: {
      start: {
        id: 'start',
        index: 0,
        point: [0, 0],
        canBind: true,
      },
      end: {
        id: 'end',
        index: 1,
        point: [1, 1],
        canBind: true,
      },
      bend: {
        id: 'bend',
        index: 2,
        point: [0.5, 0.5],
      },
    },
    decorations: {
      end: Decoration.Arrow,
    },
    style: {
      ...defaultStyle,
      isFilled: false,
    },
  },

  Component({ shape, meta, events }, ref) {
    const {
      handles: { start, bend, end },
      decorations = {},
      style,
    } = shape

    const isDraw = style.dash === DashStyle.Draw

    const isStraightLine = Vec.dist(bend.point, Vec.round(Vec.med(start.point, end.point))) < 1

    const styles = getShapeStyle(style, meta.isDarkMode)

    const { strokeWidth } = styles

    const arrowDist = Vec.dist(start.point, end.point)

    const arrowHeadLength = Math.min(arrowDist / 3, strokeWidth * 8)

    const sw = isDraw ? strokeWidth * 2 : 1 + strokeWidth * 2

    let shaftPath: JSX.Element | null
    let startArrowHead: { left: number[]; right: number[] } | undefined
    let endArrowHead: { left: number[]; right: number[] } | undefined

    const getRandom = Utils.rng(shape.id)

    const easing = EASINGS[getRandom() > 0 ? 'easeInOutSine' : 'easeInOutCubic']

    if (isStraightLine) {
      const path = isDraw
        ? renderFreehandArrowShaft(shape, arrowDist, easing)
        : 'M' + Vec.round(start.point) + 'L' + Vec.round(end.point)

      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        arrowDist,
        sw,
        shape.style.dash,
        2
      )

      if (decorations.start) {
        startArrowHead = getStraightArrowHeadPoints(start.point, end.point, arrowHeadLength)
      }

      if (decorations.end) {
        endArrowHead = getStraightArrowHeadPoints(end.point, start.point, arrowHeadLength)
      }

      // Straight arrow path
      shaftPath =
        arrowDist > 2 ? (
          <>
            <path
              d={path}
              fill="none"
              strokeWidth={Math.max(8, strokeWidth * 2)}
              strokeDasharray="none"
              strokeDashoffset="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="stroke"
            />
            <path
              d={path}
              fill={styles.stroke}
              stroke={styles.stroke}
              strokeWidth={isDraw ? 0 : sw}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="stroke"
            />
          </>
        ) : null
    } else {
      const circle = getCtp(shape)

      const { center, radius, length } = getArrowArc(shape)

      const path = isDraw
        ? renderCurvedFreehandArrowShaft(shape, circle, length, easing)
        : getArrowArcPath(start, end, circle, shape.bend)

      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        length - 1,
        sw,
        shape.style.dash,
        2
      )

      if (decorations.start) {
        startArrowHead = getCurvedArrowHeadPoints(
          start.point,
          arrowHeadLength,
          center,
          radius,
          length < 0
        )
      }

      if (decorations.end) {
        endArrowHead = getCurvedArrowHeadPoints(
          end.point,
          arrowHeadLength,
          center,
          radius,
          length >= 0
        )
      }

      // Curved arrow path
      shaftPath = (
        <>
          <path
            d={path}
            fill="none"
            stroke="none"
            strokeWidth={Math.max(8, sw)}
            strokeDasharray="none"
            strokeDashoffset="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="stroke"
          />
          <path
            d={path}
            fill={isDraw ? styles.stroke : 'none'}
            stroke={styles.stroke}
            strokeWidth={isDraw ? 0 : sw}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="stroke"
          />
        </>
      )
    }

    return (
      <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
        <g pointerEvents="none">
          {shaftPath}
          {startArrowHead && (
            <path
              d={`M ${startArrowHead.left} L ${start.point} ${startArrowHead.right}`}
              fill="none"
              stroke={styles.stroke}
              strokeWidth={sw}
              strokeDashoffset="none"
              strokeDasharray="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="stroke"
            />
          )}
          {endArrowHead && (
            <path
              d={`M ${endArrowHead.left} L ${end.point} ${endArrowHead.right}`}
              fill="none"
              stroke={styles.stroke}
              strokeWidth={sw}
              strokeDashoffset="none"
              strokeDasharray="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="stroke"
            />
          )}
        </g>
      </SVGContainer>
    )
  },

  Indicator({ shape }) {
    const path = getArrowPath(shape)

    return <path d={path} />
  },

  shouldRender(prev, next) {
    return (
      next.decorations !== prev.decorations ||
      next.handles !== prev.handles ||
      next.style !== prev.style
    )
  },

  getBounds(shape) {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      const points = getArcPoints(shape)
      return Utils.getBoundsFromPoints(points)
    })

    return Utils.translateBounds(bounds, shape.point)
  },

  getRotatedBounds(shape) {
    let points = getArcPoints(shape)

    const { minX, minY, maxX, maxY } = Utils.getBoundsFromPoints(points)

    if (shape.rotation !== 0) {
      points = points.map((pt) =>
        Vec.rotWith(pt, [(minX + maxX) / 2, (minY + maxY) / 2], shape.rotation || 0)
      )
    }

    return Utils.translateBounds(Utils.getBoundsFromPoints(points), shape.point)
  },

  getCenter(shape) {
    const { start, end } = shape.handles
    return Vec.add(shape.point, Vec.med(start.point, end.point))
  },

  hitTestBounds(shape, brushBounds: TLBounds) {
    const { start, end, bend } = shape.handles

    const sp = Vec.add(shape.point, start.point)

    const ep = Vec.add(shape.point, end.point)

    if (Utils.pointInBounds(sp, brushBounds) || Utils.pointInBounds(ep, brushBounds)) {
      return true
    }

    if (Vec.isEqual(Vec.med(start.point, end.point), bend.point)) {
      return intersectLineSegmentBounds(sp, ep, brushBounds).length > 0
    } else {
      const [cx, cy, r] = getCtp(shape)

      const cp = Vec.add(shape.point, [cx, cy])

      return intersectArcBounds(cp, r, sp, ep, brushBounds).length > 0
    }
  },

  transform(_shape, bounds, { initialShape, scaleX, scaleY }) {
    const initialShapeBounds = this.getBounds(initialShape)

    const handles: (keyof ArrowShape['handles'])[] = ['start', 'end']

    const nextHandles = { ...initialShape.handles }

    handles.forEach((handle) => {
      const [x, y] = nextHandles[handle].point

      const nw = x / initialShapeBounds.width

      const nh = y / initialShapeBounds.height

      nextHandles[handle] = {
        ...nextHandles[handle],
        point: [
          bounds.width * (scaleX < 0 ? 1 - nw : nw),
          bounds.height * (scaleY < 0 ? 1 - nh : nh),
        ],
      }
    })

    const { start, bend, end } = nextHandles

    const dist = Vec.dist(start.point, end.point)

    const midPoint = Vec.med(start.point, end.point)

    const bendDist = (dist / 2) * initialShape.bend

    const u = Vec.uni(Vec.vec(start.point, end.point))

    const point = Vec.add(midPoint, Vec.mul(Vec.per(u), bendDist))

    nextHandles['bend'] = {
      ...bend,
      point: Vec.round(Math.abs(bendDist) < 10 ? midPoint : point),
    }

    return {
      point: Vec.round([bounds.minX, bounds.minY]),
      handles: nextHandles,
    }
  },

  onDoubleClickHandle(shape, handle) {
    switch (handle) {
      case 'bend': {
        return {
          bend: 0,
          handles: {
            ...shape.handles,
            bend: {
              ...shape.handles.bend,
              point: getBendPoint(shape.handles, shape.bend),
            },
          },
        }
      }
      case 'start': {
        return {
          decorations: {
            ...shape.decorations,
            start: shape.decorations?.start ? undefined : Decoration.Arrow,
          },
        }
      }
      case 'end': {
        return {
          decorations: {
            ...shape.decorations,
            end: shape.decorations?.end ? undefined : Decoration.Arrow,
          },
        }
      }
    }

    return this
  },

  onBindingChange(shape, binding: ArrowBinding, target, targetBounds, center) {
    const handle = shape.handles[binding.meta.handleId as keyof ArrowShape['handles']]

    const expandedBounds = Utils.expandBounds(targetBounds, 32)

    // The anchor is the "actual" point in the target shape
    // (Remember that the binding.point is normalized)
    const anchor = Vec.sub(
      Vec.add(
        [expandedBounds.minX, expandedBounds.minY],
        Vec.mulV(
          [expandedBounds.width, expandedBounds.height],
          Vec.rotWith(binding.meta.point, [0.5, 0.5], target.rotation || 0)
        )
      ),
      shape.point
    )

    // We're looking for the point to put the dragging handle
    let handlePoint = anchor

    if (binding.meta.distance) {
      const intersectBounds = Utils.expandBounds(targetBounds, binding.meta.distance)

      // The direction vector starts from the arrow's opposite handle
      const origin = Vec.add(
        shape.point,
        shape.handles[handle.id === 'start' ? 'end' : 'start'].point
      )

      // And passes through the dragging handle
      const direction = Vec.uni(Vec.sub(Vec.add(anchor, shape.point), origin))

      // Ellipses are special here
      if (target.type === TLDrawShapeType.Ellipse) {
        const hits = intersectRayEllipse(
          origin,
          direction,
          center,
          (target as EllipseShape).radius[0] + binding.meta.distance,
          (target as EllipseShape).radius[1] + binding.meta.distance,
          target.rotation || 0
        ).points.sort((a, b) => Vec.dist(a, origin) - Vec.dist(b, origin))

        if (!hits[0]) {
          console.warn('No intersections')
        }

        handlePoint = Vec.sub(hits[0], shape.point)
      } else {
        // Otherwise, intersect the bounding box as a square
        let hits = intersectRayBounds(origin, direction, intersectBounds, target.rotation)
          .filter((int) => int.didIntersect)
          .map((int) => int.points[0])
          .sort((a, b) => Vec.dist(a, origin) - Vec.dist(b, origin))

        if (hits.length < 2) {
          hits = intersectRayBounds(origin, Vec.neg(direction), intersectBounds)
            .filter((int) => int.didIntersect)
            .map((int) => int.points[0])
            .sort((a, b) => Vec.dist(a, origin) - Vec.dist(b, origin))
        }

        if (!hits[0]) {
          console.warn('No intersection.')
          return
        }

        handlePoint = Vec.sub(hits[0], shape.point)
      }
    }

    return this.onHandleChange(
      shape,
      {
        [handle.id]: {
          ...handle,
          point: Vec.round(handlePoint),
        },
      },
      { shiftKey: false }
    )
  },

  onHandleChange(shape, handles, { shiftKey }) {
    let nextHandles = Utils.deepMerge<ArrowShape['handles']>(shape.handles, handles)
    let nextBend = shape.bend

    // If the user is holding shift, we want to snap the handles to angles
    Object.values(handles).forEach((handle) => {
      if ((handle.id === 'start' || handle.id === 'end') && shiftKey) {
        const point = handle.point

        const other = handle.id === 'start' ? shape.handles.end : shape.handles.start

        const angle = Vec.angle(other.point, point)

        const distance = Vec.dist(other.point, point)

        const newAngle = Utils.snapAngleToSegments(angle, 24)

        handle.point = Vec.nudgeAtAngle(other.point, newAngle, distance)
      }
    })

    nextHandles = {
      ...nextHandles,
      start: {
        ...nextHandles.start,
        point: Vec.round(nextHandles.start.point),
      },
      end: {
        ...nextHandles.end,
        point: Vec.round(nextHandles.end.point),
      },
    }

    // If the user is moving the bend handle, we want to move the bend point
    if ('bend' in handles) {
      const { start, end, bend } = nextHandles

      const distance = Vec.dist(start.point, end.point)

      const midPoint = Vec.med(start.point, end.point)

      const angle = Vec.angle(start.point, end.point)

      const u = Vec.uni(Vec.vec(start.point, end.point))

      // Create a line segment perendicular to the line between the start and end points
      const ap = Vec.add(midPoint, Vec.mul(Vec.per(u), distance / 2))
      const bp = Vec.sub(midPoint, Vec.mul(Vec.per(u), distance / 2))

      const bendPoint = Vec.nearestPointOnLineSegment(ap, bp, bend.point, true)

      // Find the distance between the midpoint and the nearest point on the
      // line segment to the bend handle's dragged point
      const bendDist = Vec.dist(midPoint, bendPoint)

      // The shape's "bend" is the ratio of the bend to the distance between
      // the start and end points. If the bend is below a certain amount, the
      // bend should be zero.
      nextBend = Utils.clamp(bendDist / (distance / 2), -0.99, 0.99)

      // If the point is to the left of the line segment, we make the bend
      // negative, otherwise it's positive.
      const angleToBend = Vec.angle(start.point, bendPoint)

      // If resulting bend is low enough that the handle will snap to center,
      // then also snap the bend to center
      if (Vec.isEqual(midPoint, getBendPoint(nextHandles, nextBend))) {
        nextBend = 0
      } else if (Utils.isAngleBetween(angle, angle + Math.PI, angleToBend)) {
        // Otherwise, fix the bend direction
        nextBend *= -1
      }
    }

    const nextShape = {
      point: shape.point,
      bend: nextBend,
      handles: {
        ...nextHandles,
        bend: {
          ...nextHandles.bend,
          point: getBendPoint(nextHandles, nextBend),
        },
      },
    }

    // Zero out the handles to prevent handles with negative points. If a handle's x or y
    // is below zero, we need to move the shape left or up to make it zero.

    const topLeft = shape.point

    const nextBounds = this.getBounds({ ...nextShape } as ArrowShape)

    const offset = Vec.sub([nextBounds.minX, nextBounds.minY], topLeft)

    if (!Vec.isEqual(offset, [0, 0])) {
      Object.values(nextShape.handles).forEach((handle) => {
        handle.point = Vec.round(Vec.sub(handle.point, offset))
      })

      nextShape.point = Vec.round(Vec.add(nextShape.point, offset))
    }

    return nextShape
  },
}))

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

function getArrowArcPath(start: TLHandle, end: TLHandle, circle: number[], bend: number) {
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

function getBendPoint(handles: ArrowShape['handles'], bend: number) {
  const { start, end } = handles

  const dist = Vec.dist(start.point, end.point)

  const midPoint = Vec.med(start.point, end.point)

  const bendDist = (dist / 2) * bend

  const u = Vec.uni(Vec.vec(start.point, end.point))

  const point = Vec.round(
    Math.abs(bendDist) < 10 ? midPoint : Vec.add(midPoint, Vec.mul(Vec.per(u), bendDist))
  )

  return point
}

function renderFreehandArrowShaft(
  shape: ArrowShape,
  length: number,
  easing: (t: number) => number
) {
  const { style, id } = shape

  const { start, end } = shape.handles

  const getRandom = Utils.rng(id)

  const strokeWidth = getShapeStyle(style).strokeWidth

  const count = 4 + Math.floor((Math.abs(length) / 40) * (1 + getRandom() / 2))

  const stroke = getStroke(
    [...Vec.pointsBetween(start.point, end.point, count, easing), end.point, end.point, end.point],
    {
      size: strokeWidth * 3,
      thinning: 0.618 + getRandom() * 0.2,
      start: shape.decorations?.start
        ? { taper: 32 + 0.25 * Math.abs(getRandom()) }
        : { cap: true },
      end: shape.decorations?.end ? { taper: 32 + 0.25 * Math.abs(getRandom()) } : { cap: true },
      easing: EASINGS.easeOutQuad,
      simulatePressure: true,
      smoothing: 0,
      streamline: 0,
      last: true,
    }
  )

  const path = Utils.getSvgPathFromStroke(stroke)

  return path
}

function renderCurvedFreehandArrowShaft(
  shape: ArrowShape,
  circle: number[],
  length: number,
  easing: (t: number) => number
) {
  const { style, id } = shape

  const { start, end } = shape.handles

  const getRandom = Utils.rng(id)

  const strokeWidth = getShapeStyle(style).strokeWidth

  const center = [circle[0], circle[1]]

  const radius = circle[2]

  const startAngle = Vec.angle(center, start.point)

  const endAngle = Vec.angle(center, end.point)

  const points: number[][] = []

  const count = 8 + Math.floor((Math.abs(length) / 40) * 1 + getRandom() / 2)

  for (let i = 0; i < count + 1; i++) {
    const t = easing(i / count)

    const angle = Utils.lerpAngles(startAngle, endAngle, t)

    points.push(Vec.round(Vec.nudgeAtAngle(center, angle, radius)))
  }

  const stroke = getStroke([...points, end.point, end.point, end.point], {
    size: strokeWidth * 3,
    thinning: 0.618 + getRandom() * 0.2,
    start: shape.decorations?.start ? { taper: 32 + 0.25 * Math.abs(getRandom()) } : { cap: true },
    end: shape.decorations?.end ? { taper: 32 + 0.25 * Math.abs(getRandom()) } : { cap: true },
    easing: EASINGS.easeOutQuad,
    simulatePressure: true,
    streamline: 0,
    smoothing: 0,
    last: true,
  })

  const path = Utils.getSvgPathFromStroke(stroke)

  return path
}

function getCtp(shape: ArrowShape) {
  const { start, end, bend } = shape.handles
  return Utils.circleFromThreePoints(start.point, end.point, bend.point)
}

function getArrowArc(shape: ArrowShape) {
  const { start, end, bend } = shape.handles

  const [cx, cy, radius] = Utils.circleFromThreePoints(start.point, end.point, bend.point)

  const center = [cx, cy]

  const length = Utils.getArcLength(center, radius, start.point, end.point)

  return { center, radius, length }
}

function getCurvedArrowHeadPoints(
  A: number[],
  r1: number,
  C: number[],
  r2: number,
  sweep: boolean
) {
  const ints = intersectCircleCircle(A, r1 * 0.618, C, r2).points
  if (!ints) {
    console.warn('Could not find an intersection for the arrow head.')
    return { left: A, right: A }
  }

  const int = sweep ? ints[0] : ints[1]

  const left = int ? Vec.nudge(Vec.rotWith(int, A, Math.PI / 6), A, r1 * -0.382) : A

  const right = int ? Vec.nudge(Vec.rotWith(int, A, -Math.PI / 6), A, r1 * -0.382) : A

  return { left, right }
}

function getStraightArrowHeadPoints(A: number[], B: number[], r: number) {
  const ints = intersectCircleLineSegment(A, r, A, B).points
  if (!ints) {
    console.warn('Could not find an intersection for the arrow head.')
    return { left: A, right: A }
  }

  const int = ints[0]

  const left = int ? Vec.rotWith(int, A, Math.PI / 6) : A

  const right = int ? Vec.rotWith(int, A, -Math.PI / 6) : A
  return { left, right }
}

function getCurvedArrowHeadPath(A: number[], r1: number, C: number[], r2: number, sweep: boolean) {
  const { left, right } = getCurvedArrowHeadPoints(A, r1, C, r2, sweep)

  return `M ${left} L ${A} ${right}`
}

function getStraightArrowHeadPath(A: number[], B: number[], r: number) {
  const { left, right } = getStraightArrowHeadPoints(A, B, r)

  return `M ${left} L ${A} ${right}`
}

function getArrowPath(shape: ArrowShape) {
  const {
    decorations,
    handles: { start, end, bend: _bend },
    style,
  } = shape

  const { strokeWidth } = getShapeStyle(style, false)

  const arrowDist = Vec.dist(start.point, end.point)

  const arrowHeadLength = Math.min(arrowDist / 3, strokeWidth * 8)

  const path: (string | number)[] = []

  const isStraightLine = Vec.dist(_bend.point, Vec.round(Vec.med(start.point, end.point))) < 1

  if (isStraightLine) {
    // Path (line segment)
    path.push(`M ${start.point} L ${end.point}`)

    // Start arrow head
    if (decorations?.start) {
      path.push(getStraightArrowHeadPath(start.point, end.point, arrowHeadLength))
    }

    // End arrow head
    if (decorations?.end) {
      path.push(getStraightArrowHeadPath(end.point, start.point, arrowHeadLength))
    }
  } else {
    const { center, radius, length } = getArrowArc(shape)

    // Path (arc)
    path.push(`M ${start.point} A ${radius} ${radius} 0 0 ${length > 0 ? '1' : '0'} ${end.point}`)

    // Start Arrow head
    if (decorations?.start) {
      path.push(getCurvedArrowHeadPath(start.point, arrowHeadLength, center, radius, length < 0))
    }

    // End arrow head
    if (decorations?.end) {
      path.push(getCurvedArrowHeadPath(end.point, arrowHeadLength, center, radius, length >= 0))
    }
  }

  return path.join(' ')
}

function getArcPoints(shape: ArrowShape) {
  const { start, bend, end } = shape.handles

  const points: number[][] = [start.point, end.point]

  if (Vec.dist2(bend.point, Vec.med(start.point, end.point)) > 4) {
    // We're an arc, calculate points along the arc
    const { center, radius } = getArrowArc(shape)

    const startAngle = Vec.angle(center, start.point)

    const endAngle = Vec.angle(center, end.point)

    for (let i = 1 / 20; i < 1; i += 1 / 20) {
      const angle = Utils.lerpAngles(startAngle, endAngle, i)
      points.push(Vec.nudgeAtAngle(center, angle, radius))
    }
  }

  return points
}
