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

export function getRectangleAnchorPoint() {
  // // Algorithm time! We need to find the binding point (a normalized point inside of the shape, or around the shape, where the arrow will point to) and the distance from the binding shape to the anchor.
  // const bounds = this.getBounds(shape)
  // const expandedBounds = this.getExpandedBounds(shape)
  // // The point must be inside of the expanded bounding box
  // if (!Utils.pointInBounds(point, expandedBounds)) return
  // const intersections = intersectRayBounds(origin, direction, expandedBounds)
  //   .filter((int) => int.didIntersect)
  //   .map((int) => int.points[0])
  // if (!intersections.length) return
  // // The center of the shape
  // const center = this.getCenter(shape)
  // // Find furthest intersection between ray from origin through point and expanded bounds. TODO: What if the shape has a curve? In that case, should we intersect the circle-from-three-points instead?
  // const intersection = intersections.sort((a, b) => Vec.dist(b, origin) - Vec.dist(a, origin))[0]
  // // The point between the handle and the intersection
  // const middlePoint = Vec.med(point, intersection)
  // // The anchor is the point in the shape where the arrow will be pointing
  // let anchor: number[]
  // // The distance is the distance from the anchor to the handle
  // let distance: number
  // if (bindAnywhere) {
  //   // If the user is indicating that they want to bind inside of the shape, we just use the handle's point
  //   anchor = Vec.dist(point, center) < BINDING_DISTANCE / 2 ? center : point
  //   distance = 0
  // } else {
  //   if (Vec.distanceToLineSegment(point, middlePoint, center) < BINDING_DISTANCE / 2) {
  //     // If the line segment would pass near to the center, snap the anchor the center point
  //     anchor = center
  //   } else {
  //     // Otherwise, the anchor is the middle point between the handle and the intersection
  //     anchor = middlePoint
  //   }
  //   if (Utils.pointInBounds(point, bounds)) {
  //     // If the point is inside of the shape, use the shape's binding distance
  //     distance = this.bindingDistance
  //   } else {
  //     // Otherwise, use the actual distance from the handle point to nearest edge
  //     distance = Math.max(
  //       this.bindingDistance,
  //       Utils.getBoundsSides(bounds)
  //         .map((side) => Vec.distanceToLineSegment(side[1][0], side[1][1], point))
  //         .sort((a, b) => a - b)[0]
  //     )
  //   }
  // }
  // // The binding point is a normalized point indicating the position of the anchor.
  // // An anchor at the middle of the shape would be (0.5, 0.5). When the shape's bounds
  // // changes, we will re-recalculate the actual anchor point by multiplying the
  // // normalized point by the shape's new bounds.
  // const bindingPoint = Vec.divV(Vec.sub(anchor, [expandedBounds.minX, expandedBounds.minY]), [
  //   expandedBounds.width,
  //   expandedBounds.height,
  // ])
  // return {
  //   point: Vec.clampV(bindingPoint, 0, 1),
  //   distance,
  // }
}

export function getEllipseAnchorPoint() {
  //     const expandedBounds = this.getExpandedBounds(shape)
  //     const center = this.getCenter(shape)
  //     let bindingPoint: number[]
  //     let distance: number
  //     if (
  //       !Utils.pointInEllipse(
  //         point,
  //         center,
  //         shape.radius[0] + this.bindingDistance,
  //         shape.radius[1] + this.bindingDistance
  //       )
  //     )
  //       return
  //     if (bindAnywhere) {
  //       if (Vec.dist(point, this.getCenter(shape)) < 12) {
  //         bindingPoint = [0.5, 0.5]
  //       } else {
  //         bindingPoint = Vec.divV(Vec.sub(point, [expandedBounds.minX, expandedBounds.minY]), [
  //           expandedBounds.width,
  //           expandedBounds.height,
  //         ])
  //       }
  //       distance = 0
  //     } else {
  //       let intersection = intersectRayEllipse(
  //         origin,
  //         direction,
  //         center,
  //         shape.radius[0],
  //         shape.radius[1],
  //         shape.rotation || 0
  //       ).points.sort((a, b) => Vec.dist(a, origin) - Vec.dist(b, origin))[0]
  //       if (!intersection) {
  //         intersection = intersectLineSegmentEllipse(
  //           point,
  //           center,
  //           center,
  //           shape.radius[0],
  //           shape.radius[1],
  //           shape.rotation || 0
  //         ).points.sort((a, b) => Vec.dist(a, point) - Vec.dist(b, point))[0]
  //       }
  //       if (!intersection) {
  //         return undefined
  //       }
  //       // The anchor is a point between the handle and the intersection
  //       const anchor = Vec.med(point, intersection)
  //       if (Vec.distanceToLineSegment(point, anchor, this.getCenter(shape)) < 12) {
  //         // If we're close to the center, snap to the center
  //         bindingPoint = [0.5, 0.5]
  //       } else {
  //         // Or else calculate a normalized point
  //         bindingPoint = Vec.divV(Vec.sub(anchor, [expandedBounds.minX, expandedBounds.minY]), [
  //           expandedBounds.width,
  //           expandedBounds.height,
  //         ])
  //       }
  //       if (
  //         Utils.pointInEllipse(point, center, shape.radius[0], shape.radius[1], shape.rotation || 0)
  //       ) {
  //         // Pad the arrow out by 16 points
  //         distance = this.bindingDistance / 2
  //       } else {
  //         // Find the distance between the point and the ellipse
  //         const innerIntersection = intersectLineSegmentEllipse(
  //           point,
  //           center,
  //           center,
  //           shape.radius[0],
  //           shape.radius[1],
  //           shape.rotation || 0
  //         ).points[0]
  //         if (!innerIntersection) {
  //           return undefined
  //         }
  //         distance = Math.max(this.bindingDistance / 2, Vec.dist(point, innerIntersection))
  //       }
  //     }
  //     return {
  //       point: bindingPoint,
  //       distance,
  //     }
  //   }
}

export function getTriangleAnchorPoint() {
  //   // Algorithm time! We need to find the binding point (a normalized point inside of the shape, or around the shape, where the arrow will point to) and the distance from the binding shape to the anchor.
  //   const expandedBounds = this.getExpandedBounds(shape)
  //   if (!Utils.pointInBounds(point, expandedBounds)) return
  //   const points = getTrianglePoints(shape).map((pt) => Vec.add(pt, shape.point))
  //   const expandedPoints = getTrianglePoints(shape, this.bindingDistance).map((pt) =>
  //     Vec.add(pt, shape.point)
  //   )
  //   const closestDistanceToEdge = Utils.pointsToLineSegments(points, true)
  //     .map(([a, b]) => Vec.distanceToLineSegment(a, b, point))
  //     .sort((a, b) => a - b)[0]
  //   if (
  //     !(Utils.pointInPolygon(point, expandedPoints) || closestDistanceToEdge < this.bindingDistance)
  //   )
  //     return
  //   const intersections = Utils.pointsToLineSegments(expandedPoints.concat([expandedPoints[0]]))
  //     .map((segment) => intersectRayLineSegment(origin, direction, segment[0], segment[1]))
  //     .filter((intersection) => intersection.didIntersect)
  //     .flatMap((intersection) => intersection.points)
  //   if (!intersections.length) return
  //   // The center of the triangle
  //   const center = Vec.add(getTriangleCentroid(shape), shape.point)
  //   // Find furthest intersection between ray from origin through point and expanded bounds. TODO: What if the shape has a curve? In that case, should we intersect the circle-from-three-points instead?
  //   const intersection = intersections.sort((a, b) => Vec.dist(b, origin) - Vec.dist(a, origin))[0]
  //   // The point between the handle and the intersection
  //   const middlePoint = Vec.med(point, intersection)
  //   let anchor: number[]
  //   let distance: number
  //   if (bindAnywhere) {
  //     anchor = Vec.dist(point, center) < BINDING_DISTANCE / 2 ? center : point
  //     distance = 0
  //   } else {
  //     if (Vec.distanceToLineSegment(point, middlePoint, center) < BINDING_DISTANCE / 2) {
  //       anchor = center
  //     } else {
  //       anchor = middlePoint
  //     }
  //     if (Utils.pointInPolygon(point, points)) {
  //       distance = this.bindingDistance
  //     } else {
  //       distance = Math.max(this.bindingDistance, closestDistanceToEdge)
  //     }
  //   }
  //   const bindingPoint = Vec.divV(Vec.sub(anchor, [expandedBounds.minX, expandedBounds.minY]), [
  //     expandedBounds.width,
  //     expandedBounds.height,
  //   ])
  //   return {
  //     point: Vec.clampV(bindingPoint, 0, 1),
  //     distance,
  //   }
}
