import { Bounds } from 'types'
import vec from './vec'

/**
 * Get whether a point is inside of a bounds.
 * @param A
 * @param b
 * @returns
 */
export function pointInBounds(A: number[], b: Bounds) {
  return !(A[0] < b.minX || A[0] > b.maxX || A[1] < b.minY || A[1] > b.maxY)
}

/**
 * Get whether a point is inside of a circle.
 * @param A
 * @param b
 * @returns
 */
export function pointInCircle(A: number[], C: number[], r: number) {
  return vec.dist(A, C) <= r
}

/**
 * Get whether a point is inside of an ellipse.
 * @param point
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 * @returns
 */
export function pointInEllipse(
  A: number[],
  C: number[],
  rx: number,
  ry: number,
  rotation = 0
) {
  rotation = rotation || 0
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const delta = vec.sub(A, C)
  const tdx = cos * delta[0] + sin * delta[1]
  const tdy = sin * delta[0] - cos * delta[1]

  return (tdx * tdx) / (rx * rx) + (tdy * tdy) / (ry * ry) <= 1
}
