import { Bounds } from 'types'
import { ease } from 'utils'
import vec from 'utils/vec'

/**
 * ## Utils
 */
export default class Utils {
  static pointsBetween(a: number[], b: number[], steps = 6): number[][] {
    return Array.from(Array(steps))
      .map((_, i) => ease(i / steps))
      .map((t) => [...vec.lrp(a, b, t), (1 - t) / 2])
  }

  static getRayRayIntersection(
    p0: number[],
    n0: number[],
    p1: number[],
    n1: number[]
  ): number[] {
    const p0e = vec.add(p0, n0),
      p1e = vec.add(p1, n1),
      m0 = (p0e[1] - p0[1]) / (p0e[0] - p0[0]),
      m1 = (p1e[1] - p1[1]) / (p1e[0] - p1[0]),
      b0 = p0[1] - m0 * p0[0],
      b1 = p1[1] - m1 * p1[0],
      x = (b1 - b0) / (m0 - m1),
      y = m0 * x + b0

    return [x, y]
  }

  static getCircleTangentToPoint(
    A: number[],
    r0: number,
    P: number[],
    side: number
  ): number[] {
    const B = vec.lrp(A, P, 0.5),
      r1 = vec.dist(A, B),
      delta = vec.sub(B, A),
      d = vec.len(delta)

    if (!(d <= r0 + r1 && d >= Math.abs(r0 - r1))) {
      return
    }

    const a = (r0 * r0 - r1 * r1 + d * d) / (2.0 * d),
      n = 1 / d,
      p = vec.add(A, vec.mul(delta, a * n)),
      h = Math.sqrt(r0 * r0 - a * a),
      k = vec.mul(vec.per(delta), h * n)

    return side === 0 ? vec.add(p, k) : vec.sub(p, k)
  }

  static shortAngleDist(a0: number, a1: number): number {
    const max = Math.PI * 2
    const da = (a1 - a0) % max
    return ((2 * da) % max) - da
  }

  static angleDelta(a0: number, a1: number): number {
    return this.shortAngleDist(a0, a1)
  }

  static getSweep(C: number[], A: number[], B: number[]): number {
    return this.angleDelta(vec.angle(C, A), vec.angle(C, B))
  }

  static bez1d(a: number, b: number, c: number, d: number, t: number): number {
    return (
      a * (1 - t) * (1 - t) * (1 - t) +
      3 * b * t * (1 - t) * (1 - t) +
      3 * c * t * t * (1 - t) +
      d * t * t * t
    )
  }

  static getCubicBezierBounds(
    p0: number[],
    c0: number[],
    c1: number[],
    p1: number[]
  ): Bounds {
    // solve for x
    let a = 3 * p1[0] - 9 * c1[0] + 9 * c0[0] - 3 * p0[0]
    let b = 6 * p0[0] - 12 * c0[0] + 6 * c1[0]
    let c = 3 * c0[0] - 3 * p0[0]
    let disc = b * b - 4 * a * c
    let xl = p0[0]
    let xh = p0[0]

    if (p1[0] < xl) xl = p1[0]
    if (p1[0] > xh) xh = p1[0]

    if (disc >= 0) {
      const t1 = (-b + Math.sqrt(disc)) / (2 * a)
      if (t1 > 0 && t1 < 1) {
        const x1 = Utils.bez1d(p0[0], c0[0], c1[0], p1[0], t1)
        if (x1 < xl) xl = x1
        if (x1 > xh) xh = x1
      }
      const t2 = (-b - Math.sqrt(disc)) / (2 * a)
      if (t2 > 0 && t2 < 1) {
        const x2 = Utils.bez1d(p0[0], c0[0], c1[0], p1[0], t2)
        if (x2 < xl) xl = x2
        if (x2 > xh) xh = x2
      }
    }

    // Solve for y
    a = 3 * p1[1] - 9 * c1[1] + 9 * c0[1] - 3 * p0[1]
    b = 6 * p0[1] - 12 * c0[1] + 6 * c1[1]
    c = 3 * c0[1] - 3 * p0[1]
    disc = b * b - 4 * a * c
    let yl = p0[1]
    let yh = p0[1]
    if (p1[1] < yl) yl = p1[1]
    if (p1[1] > yh) yh = p1[1]
    if (disc >= 0) {
      const t1 = (-b + Math.sqrt(disc)) / (2 * a)
      if (t1 > 0 && t1 < 1) {
        const y1 = Utils.bez1d(p0[1], c0[1], c1[1], p1[1], t1)
        if (y1 < yl) yl = y1
        if (y1 > yh) yh = y1
      }
      const t2 = (-b - Math.sqrt(disc)) / (2 * a)
      if (t2 > 0 && t2 < 1) {
        const y2 = Utils.bez1d(p0[1], c0[1], c1[1], p1[1], t2)
        if (y2 < yl) yl = y2
        if (y2 > yh) yh = y2
      }
    }

    return {
      minX: xl,
      minY: yl,
      maxX: xh,
      maxY: yh,
      width: Math.abs(xl - xh),
      height: Math.abs(yl - yh),
    }
  }

  static getExpandedBounds(a: Bounds, b: Bounds): Bounds {
    const minX = Math.min(a.minX, b.minX),
      minY = Math.min(a.minY, b.minY),
      maxX = Math.max(a.maxX, b.maxX),
      maxY = Math.max(a.maxY, b.maxY),
      width = Math.abs(maxX - minX),
      height = Math.abs(maxY - minY)

    return { minX, minY, maxX, maxY, width, height }
  }

  static getCommonBounds(...b: Bounds[]): Bounds {
    if (b.length < 2) return b[0]

    let bounds = b[0]

    for (let i = 1; i < b.length; i++) {
      bounds = Utils.getExpandedBounds(bounds, b[i])
    }

    return bounds
  }
}
