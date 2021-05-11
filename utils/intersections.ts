import { Bounds } from "types"
import * as vec from "utils/vec"

interface Intersection {
  didIntersect: boolean
  message: string
  points: number[][]
}

export function intersectCircleLine(
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

  const topIntersection = intersectCircleLine(c, r, tl, tr)
  if (topIntersection.didIntersect) {
    intersections.push({ ...topIntersection, message: "top" })
  }
  const rightIntersection = intersectCircleLine(c, r, tr, br)
  if (rightIntersection.didIntersect) {
    intersections.push({ ...rightIntersection, message: "right" })
  }
  const bottomIntersection = intersectCircleLine(c, r, bl, br)
  if (bottomIntersection.didIntersect) {
    intersections.push({ ...bottomIntersection, message: "bottom" })
  }
  const leftIntersection = intersectCircleLine(c, r, tl, bl)
  if (leftIntersection.didIntersect) {
    intersections.push({ ...leftIntersection, message: "left" })
  }

  return intersections
}

export function intersectCircleBounds(
  c: number[],
  r: number,
  bounds: Bounds
): Intersection[] {
  const { minX, minY, width, height } = bounds
  const intersections = intersectCircleRectangle(
    c,
    r,
    [minX, minY],
    [width, height]
  )

  return intersections
}
