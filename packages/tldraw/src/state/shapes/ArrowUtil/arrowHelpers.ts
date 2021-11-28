import { Utils } from '@tldraw/core'
import { intersectCircleCircle, intersectCircleLineSegment } from '@tldraw/intersect'
import Vec from '@tldraw/vec'
import getStroke from 'perfect-freehand'
import { EASINGS } from '~constants'
import { getShapeStyle } from '../shared/shape-styles'
import type { ArrowShape, TldrawHandle } from '~types'
import { TLDR } from '../../TLDR'

export function getArrowArcPath(
  start: TldrawHandle,
  end: TldrawHandle,
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

export function getBendPoint(handles: ArrowShape['handles'], bend: number) {
  const { start, end } = handles

  const dist = Vec.dist(start.point, end.point)

  const midPoint = Vec.med(start.point, end.point)

  const bendDist = (dist / 2) * bend

  const u = Vec.uni(Vec.vec(start.point, end.point))

  const point = Vec.toFixed(
    Math.abs(bendDist) < 10 ? midPoint : Vec.add(midPoint, Vec.mul(Vec.per(u), bendDist))
  )

  return point
}

export function renderFreehandArrowShaft(shape: ArrowShape) {
  const { style, id } = shape

  const { start, end } = shape.handles

  const getRandom = Utils.rng(id)

  const strokeWidth = getShapeStyle(style).strokeWidth

  const startPoint = shape.decorations?.start
    ? Vec.nudge(start.point, end.point, strokeWidth)
    : start.point

  const endPoint = shape.decorations?.end
    ? Vec.nudge(end.point, start.point, strokeWidth)
    : end.point

  const stroke = getStroke([startPoint, endPoint], {
    size: strokeWidth,
    thinning: 0.618 + getRandom() * 0.2,
    easing: EASINGS.easeOutQuad,
    simulatePressure: true,
    streamline: 0,
    last: true,
  })

  const path = Utils.getSvgPathFromStroke(stroke)

  return path
}

export function renderCurvedFreehandArrowShaft(
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

  const startPoint = shape.decorations?.start
    ? Vec.rotWith(start.point, center, strokeWidth / length)
    : start.point

  const endPoint = shape.decorations?.end
    ? Vec.rotWith(end.point, center, -(strokeWidth / length))
    : end.point

  const startAngle = Vec.angle(center, startPoint)

  const endAngle = Vec.angle(center, endPoint)

  const points: number[][] = []

  const count = 8 + Math.floor((Math.abs(length) / 20) * 1 + getRandom() / 2)

  for (let i = 0; i < count; i++) {
    const t = easing(i / count)

    const angle = Utils.lerpAngles(startAngle, endAngle, t)

    points.push(Vec.toFixed(Vec.nudgeAtAngle(center, angle, radius)))
  }

  const stroke = getStroke([startPoint, ...points, endPoint], {
    size: 1 + strokeWidth,
    thinning: 0.618 + getRandom() * 0.2,
    easing: EASINGS.easeOutQuad,
    simulatePressure: false,
    streamline: 0,
    last: true,
  })

  const path = Utils.getSvgPathFromStroke(stroke)

  return path
}

export function getCtp(shape: ArrowShape) {
  const { start, end, bend } = shape.handles
  return Utils.circleFromThreePoints(start.point, end.point, bend.point)
}

export function getArrowArc(shape: ArrowShape) {
  const { start, end, bend } = shape.handles

  const [cx, cy, radius] = Utils.circleFromThreePoints(start.point, end.point, bend.point)

  const center = [cx, cy]

  const length = getArcLength(center, radius, start.point, end.point)

  return { center, radius, length }
}

export function getCurvedArrowHeadPoints(
  A: number[],
  r1: number,
  C: number[],
  r2: number,
  sweep: boolean
) {
  const ints = intersectCircleCircle(A, r1 * 0.618, C, r2).points

  if (!ints) {
    TLDR.warn('Could not find an intersection for the arrow head.')
    return { left: A, right: A }
  }

  const int = sweep ? ints[0] : ints[1]

  const left = int ? Vec.nudge(Vec.rotWith(int, A, Math.PI / 6), A, r1 * -0.382) : A

  const right = int ? Vec.nudge(Vec.rotWith(int, A, -Math.PI / 6), A, r1 * -0.382) : A

  return { left, right }
}

export function getStraightArrowHeadPoints(A: number[], B: number[], r: number) {
  const ints = intersectCircleLineSegment(A, r, A, B).points
  if (!ints) {
    TLDR.warn('Could not find an intersection for the arrow head.')
    return { left: A, right: A }
  }

  const int = ints[0]

  const left = int ? Vec.rotWith(int, A, Math.PI / 6) : A

  const right = int ? Vec.rotWith(int, A, -Math.PI / 6) : A

  return { left, right }
}

export function getCurvedArrowHeadPath(
  A: number[],
  r1: number,
  C: number[],
  r2: number,
  sweep: boolean
) {
  const { left, right } = getCurvedArrowHeadPoints(A, r1, C, r2, sweep)

  return `M ${left} L ${A} ${right}`
}

export function getStraightArrowHeadPath(A: number[], B: number[], r: number) {
  const { left, right } = getStraightArrowHeadPoints(A, B, r)

  return `M ${left} L ${A} ${right}`
}

export function getArrowPath(shape: ArrowShape) {
  const {
    decorations,
    handles: { start, end, bend: _bend },
    style,
  } = shape

  const { strokeWidth } = getShapeStyle(style, false)

  const arrowDist = Vec.dist(start.point, end.point)

  const arrowHeadLength = Math.min(arrowDist / 3, strokeWidth * 8)

  const path: (string | number)[] = []

  const isStraightLine = Vec.dist(_bend.point, Vec.toFixed(Vec.med(start.point, end.point))) < 1

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

export function getArcPoints(shape: ArrowShape) {
  const { start, bend, end } = shape.handles

  if (Vec.dist2(bend.point, Vec.med(start.point, end.point)) > 4) {
    const points: number[][] = []

    // We're an arc, calculate points along the arc
    const { center, radius } = getArrowArc(shape)

    const startAngle = Vec.angle(center, start.point)

    const endAngle = Vec.angle(center, end.point)

    for (let i = 1 / 20; i < 1; i += 1 / 20) {
      const angle = Utils.lerpAngles(startAngle, endAngle, i)
      points.push(Vec.nudgeAtAngle(center, angle, radius))
    }

    return points
  } else {
    return [start.point, end.point]
  }
}

export function isAngleBetween(a: number, b: number, c: number): boolean {
  if (c === a || c === b) return true
  const PI2 = Math.PI * 2
  const AB = (b - a + PI2) % PI2
  const AC = (c - a + PI2) % PI2
  return AB <= Math.PI !== AC > AB
}

export function getArcLength(C: number[], r: number, A: number[], B: number[]): number {
  const sweep = Utils.getSweep(C, A, B)
  return r * (2 * Math.PI) * (sweep / (2 * Math.PI))
}
