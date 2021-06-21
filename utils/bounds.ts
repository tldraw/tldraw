import { Bounds } from 'types'
import {
  intersectPolygonBounds,
  intersectPolylineBounds,
} from './intersections'

/**
 * Get whether two bounds collide.
 * @param a Bounds
 * @param b Bounds
 * @returns
 */
export function boundsCollide(a: Bounds, b: Bounds) {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  )
}

/**
 * Get whether the bounds of A contain the bounds of B. A perfect match will return true.
 * @param a Bounds
 * @param b Bounds
 * @returns
 */
export function boundsContain(a: Bounds, b: Bounds) {
  return (
    a.minX < b.minX && a.minY < b.minY && a.maxY > b.maxY && a.maxX > b.maxX
  )
}

/**
 * Get whether the bounds of A are contained by the bounds of B.
 * @param a Bounds
 * @param b Bounds
 * @returns
 */
export function boundsContained(a: Bounds, b: Bounds) {
  return boundsContain(b, a)
}

/**
 * Get whether a set of points are all contained by a bounding box.
 * @returns
 */
export function boundsContainPolygon(a: Bounds, points: number[][]) {
  return points.every((point) => pointInBounds(point, a))
}

/**
 * Get whether a polygon collides a bounding box.
 * @param points
 * @param b
 */
export function boundsCollidePolygon(a: Bounds, points: number[][]) {
  return intersectPolygonBounds(points, a).length > 0
}

/**
 * Get whether two bounds are identical.
 * @param a Bounds
 * @param b Bounds
 * @returns
 */
export function boundsAreEqual(a: Bounds, b: Bounds) {
  return !(
    b.maxX !== a.maxX ||
    b.minX !== a.minX ||
    b.maxY !== a.maxY ||
    b.minY !== a.minY
  )
}

/**
 * Get whether a point is inside of a bounds.
 * @param A
 * @param b
 * @returns
 */
export function pointInBounds(A: number[], b: Bounds) {
  return !(A[0] < b.minX || A[0] > b.maxX || A[1] < b.minY || A[1] > b.maxY)
}

export function getRotatedEllipseBounds(
  x: number,
  y: number,
  rx: number,
  ry: number,
  rotation: number
) {
  const c = Math.cos(rotation)
  const s = Math.sin(rotation)
  const w = Math.hypot(rx * c, ry * s)
  const h = Math.hypot(rx * s, ry * c)

  return {
    minX: x + rx - w,
    minY: y + ry - h,
    maxX: x + rx + w,
    maxY: y + ry + h,
    width: w * 2,
    height: h * 2,
  }
}
