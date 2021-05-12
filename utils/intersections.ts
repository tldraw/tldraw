import { Bounds } from "types"
import * as vec from "utils/vec"

interface Intersection {
  didIntersect: boolean
  message: string
  points: number[][]
}

function getIntersection(
  points: number[][],
  message = points.length ? "Intersection" : "No intersection"
) {
  return { didIntersect: points.length > 0, message, points }
}

export function intersectLineSegments(
  a1: number[],
  a2: number[],
  b1: number[],
  b2: number[]
) {
  const AB = vec.sub(a1, b1)
  const BV = vec.sub(b2, b1)
  const AV = vec.sub(a2, a1)

  const ua_t = BV[0] * AB[1] - BV[1] * AB[0]
  const ub_t = AV[0] * AB[1] - AV[1] * AB[0]
  const u_b = BV[1] * AV[0] - BV[0] * AV[1]

  if (ua_t === 0 || ub_t === 0) {
    return getIntersection([], "Coincident")
  }

  if (u_b === 0) {
    return getIntersection([], "Parallel")
  }

  if (u_b != 0) {
    const ua = ua_t / u_b
    const ub = ub_t / u_b
    if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
      return getIntersection([vec.add(a1, vec.mul(AV, ua))])
    }
  }

  return getIntersection([])
}

export function intersectCircleLineSegment(
  c: number[],
  r: number,
  a1: number[],
  a2: number[]
): Intersection {
  const a =
    (a2[0] - a1[0]) * (a2[0] - a1[0]) + (a2[1] - a1[1]) * (a2[1] - a1[1])
  const b =
    2 * ((a2[0] - a1[0]) * (a1[0] - c[0]) + (a2[1] - a1[1]) * (a1[1] - c[1]))
  const cc =
    c[0] * c[0] +
    c[1] * c[1] +
    a1[0] * a1[0] +
    a1[1] * a1[1] -
    2 * (c[0] * a1[0] + c[1] * a1[1]) -
    r * r

  const deter = b * b - 4 * a * cc

  if (deter < 0) {
    return { didIntersect: false, message: "outside", points: [] }
  }

  if (deter === 0) {
    return { didIntersect: false, message: "tangent", points: [] }
  }

  var e = Math.sqrt(deter)
  var u1 = (-b + e) / (2 * a)
  var u2 = (-b - e) / (2 * a)
  if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
    if ((u1 < 0 && u2 < 0) || (u1 > 1 && u2 > 1)) {
      return { didIntersect: false, message: "outside", points: [] }
    } else {
      return { didIntersect: false, message: "inside", points: [] }
    }
  }

  const result = { didIntersect: true, message: "intersection", points: [] }
  if (0 <= u1 && u1 <= 1) result.points.push(vec.lrp(a1, a2, u1))
  if (0 <= u2 && u2 <= 1) result.points.push(vec.lrp(a1, a2, u2))

  return result
}

export function intersectCircleRectangle(
  c: number[],
  r: number,
  point: number[],
  size: number[]
): Intersection[] {
  const tl = point
  const tr = vec.add(point, [size[0], 0])
  const br = vec.add(point, size)
  const bl = vec.add(point, [0, size[1]])

  const intersections: Intersection[] = []

  const topIntersection = intersectCircleLineSegment(c, r, tl, tr)
  const rightIntersection = intersectCircleLineSegment(c, r, tr, br)
  const bottomIntersection = intersectCircleLineSegment(c, r, bl, br)
  const leftIntersection = intersectCircleLineSegment(c, r, tl, bl)

  if (topIntersection.didIntersect) {
    intersections.push({ ...topIntersection, message: "top" })
  }

  if (rightIntersection.didIntersect) {
    intersections.push({ ...rightIntersection, message: "right" })
  }

  if (bottomIntersection.didIntersect) {
    intersections.push({ ...bottomIntersection, message: "bottom" })
  }

  if (leftIntersection.didIntersect) {
    intersections.push({ ...leftIntersection, message: "left" })
  }

  return intersections
}

export function intersectRectangleLineSegment(
  point: number[],
  size: number[],
  a1: number[],
  a2: number[]
) {
  const tl = point
  const tr = vec.add(point, [size[0], 0])
  const br = vec.add(point, size)
  const bl = vec.add(point, [0, size[1]])

  const intersections: Intersection[] = []

  const topIntersection = intersectLineSegments(a1, a2, tl, tr)
  const rightIntersection = intersectLineSegments(a1, a2, tr, br)
  const bottomIntersection = intersectLineSegments(a1, a2, bl, br)
  const leftIntersection = intersectLineSegments(a1, a2, tl, bl)

  if (topIntersection.didIntersect) {
    intersections.push({ ...topIntersection, message: "top" })
  }

  if (rightIntersection.didIntersect) {
    intersections.push({ ...rightIntersection, message: "right" })
  }

  if (bottomIntersection.didIntersect) {
    intersections.push({ ...bottomIntersection, message: "bottom" })
  }

  if (leftIntersection.didIntersect) {
    intersections.push({ ...leftIntersection, message: "left" })
  }

  return intersections
}

/* -------------------------------------------------- */
/*                  Shape vs. Bounds                  */
/* -------------------------------------------------- */

export function intersectCircleBounds(
  c: number[],
  r: number,
  bounds: Bounds
): Intersection[] {
  const { minX, minY, width, height } = bounds
  return intersectCircleRectangle(c, r, [minX, minY], [width, height])
}

export function intersectLineSegmentBounds(
  a1: number[],
  a2: number[],
  bounds: Bounds
) {
  const { minX, minY, width, height } = bounds
  return intersectRectangleLineSegment([minX, minY], [width, height], a1, a2)
}

export function intersectPolylineBounds(points: number[][], bounds: Bounds) {
  const { minX, minY, width, height } = bounds
  const intersections: Intersection[] = []

  for (let i = 1; i < points.length; i++) {
    intersections.push(
      ...intersectRectangleLineSegment(
        [minX, minY],
        [width, height],
        points[i - 1],
        points[i]
      )
    )
  }

  return intersections
}
