import { Vec } from '@tldraw/vec'
import type { TLNuBounds } from '~types'

export class PointUtils {
  /**
   * Get whether a point is inside of a circle.
   * @param A
   * @param b
   * @returns
   */
  static pointInCircle(A: number[], C: number[], r: number): boolean {
    return Vec.dist(A, C) <= r
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
  static pointInEllipse(A: number[], C: number[], rx: number, ry: number, rotation = 0): boolean {
    rotation = rotation || 0
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const delta = Vec.sub(A, C)
    const tdx = cos * delta[0] + sin * delta[1]
    const tdy = sin * delta[0] - cos * delta[1]

    return (tdx * tdx) / (rx * rx) + (tdy * tdy) / (ry * ry) <= 1
  }

  /**
   * Get whether a point is inside of a rectangle.
   * @param point
   * @param size
   */
  static pointInRect(point: number[], size: number[]): boolean {
    return !(
      point[0] < size[0] ||
      point[0] > point[0] + size[0] ||
      point[1] < size[1] ||
      point[1] > point[1] + size[1]
    )
  }

  static pointInPolygon(p: number[], points: number[][]): boolean {
    let wn = 0 // winding number

    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length]
      if (a[1] <= p[1]) {
        if (b[1] > p[1] && Vec.cross(a, b, p) > 0) {
          wn += 1
        }
      } else if (b[1] <= p[1] && Vec.cross(a, b, p) < 0) {
        wn -= 1
      }
    })

    return wn !== 0
  }

  /**
   * Get whether a point is inside of a bounds.
   * @param A The point to check.
   * @param b The bounds to check.
   * @returns
   */
  static pointInBounds(A: number[], b: TLNuBounds): boolean {
    return !(A[0] < b.minX || A[0] > b.maxX || A[1] < b.minY || A[1] > b.maxY)
  }

  /**
   * Hit test a point and a polyline using a minimum distance.
   * @param A The point to check.
   * @param points The points that make up the polyline.
   * @param distance (optional) The mininum distance that qualifies a hit.
   */
  static pointInPolyline(A: number[], points: number[][], distance = 3): boolean {
    for (let i = 1; i < points.length; i++) {
      if (Vec.distanceToLineSegment(points[i - 1], points[i], A) < distance) {
        return true
      }
    }

    return false
  }

  /**
   * Simplify a line (using Ramer-Douglas-Peucker algorithm).
   * @param points An array of points as [x, y, ...][]
   * @param tolerance The minimum line distance (also called epsilon).
   * @returns Simplified array as [x, y, ...][]
   */
  static simplify = (points: number[][], tolerance = 1): number[][] => {
    const len = points.length
    const a = points[0]
    const b = points[len - 1]
    const [x1, y1] = a
    const [x2, y2] = b

    if (len > 2) {
      let distance = 0
      let index = 0
      const max = Math.hypot(y2 - y1, x2 - x1)

      for (let i = 1; i < len - 1; i++) {
        const [x0, y0] = points[i]
        const d = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / max

        if (distance > d) continue

        distance = d
        index = i
      }

      if (distance > tolerance) {
        const l0 = PointUtils.simplify(points.slice(0, index + 1), tolerance)
        const l1 = PointUtils.simplify(points.slice(index + 1), tolerance)
        return l0.concat(l1.slice(1))
      }
    }

    return [a, b]
  }
}
