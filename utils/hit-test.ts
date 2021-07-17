import { Bounds } from 'types'
import vec from './vec'

class HitTest {
  // Get whether a point lies inside of a rectangle.
  static rectangle(A: number[], point: number[], size: number[]): boolean {
    return !(
      A[0] < point[0] ||
      A[0] > point[0] + size[0] ||
      A[1] < point[1] ||
      A[1] > point[1] + size[1]
    )
  }

  // Get whether a point lies inside of a rectangle.
  static bounds(A: number[], b: Bounds): boolean {
    return this.rectangle(A, [b.minX, b.minY], [b.width, b.height])
  }

  // Get whether a point lies inside of a circle.
  static circle(A: number[], C: number[], r: number): boolean {
    return vec.dist(A, C) <= r
  }

  // Get whether a point lies inside of an ellipse.
  static ellipse(
    A: number[],
    C: number[],
    rx: number,
    ry: number,
    rotation = 0
  ): boolean {
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const delta = vec.sub(A, C)
    const tdx = cos * delta[0] + sin * delta[1]
    const tdy = sin * delta[0] - cos * delta[1]

    return (tdx * tdx) / (rx * rx) + (tdy * tdy) / (ry * ry) <= 1
  }

  // Get whether a point lies within a polygon.
  static polygon(point: number[], polygon: number[][]): boolean {
    const length = polygon.length
    let counter = 0
    let x_inter: number
    let p1 = polygon[0]

    for (let i = 1; i <= length; i++) {
      const p2 = polygon[i % length]
      if (point[1] > Math.min(p1[1], p2[1])) {
        if (point[1] <= Math.max(p1[1], p2[1])) {
          if (point[0] <= Math.max(p1[0], p2[0])) {
            if (p1[1] != p2[1]) {
              x_inter =
                ((point[1] - p1[1]) * (p2[0] - p1[0])) / (p2[1] - p1[1]) + p1[0]
              if (p1[0] == p2[0] || point[0] <= x_inter) {
                counter++
              }
            }
          }
        }
      }

      p1 = p2
    }

    return counter % 2 == 1
  }
}

export default HitTest
