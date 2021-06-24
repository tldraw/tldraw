import { Bounds } from 'types'
import vec from 'utils/vec'

/**
 * ## Utils
 */
export default class Utils {
  /**
   * Linear interpolation betwen two numbers.
   * @param y1
   * @param y2
   * @param mu
   */
  static lerp(y1: number, y2: number, mu: number): number {
    mu = Utils.clamp(mu, 0, 1)
    return y1 * (1 - mu) + y2 * mu
  }

  /**
   * Modulate a value between two ranges.
   * @param value
   * @param rangeA from [low, high]
   * @param rangeB to [low, high]
   * @param clamp
   */
  static modulate(
    value: number,
    rangeA: number[],
    rangeB: number[],
    clamp = false
  ): number {
    const [fromLow, fromHigh] = rangeA
    const [v0, v1] = rangeB
    const result = v0 + ((value - fromLow) / (fromHigh - fromLow)) * (v1 - v0)

    return clamp
      ? v0 < v1
        ? Math.max(Math.min(result, v1), v0)
        : Math.max(Math.min(result, v0), v1)
      : result
  }

  /**
   * Clamp a value into a range.
   * @param n
   * @param min
   */
  static clamp(n: number, min: number): number
  static clamp(n: number, min: number, max: number): number
  static clamp(n: number, min: number, max?: number): number {
    return Math.max(min, typeof max !== 'undefined' ? Math.min(n, max) : n)
  }

  // TODO: replace with a string compression algorithm
  static compress(s: string): string {
    return s
  }

  // TODO: replace with a string decompression algorithm
  static decompress(s: string): string {
    return s
  }

  /**
   * Recursively clone an object or array.
   * @param obj
   */
  static deepClone<T>(obj: T): T {
    if (obj === null) return null

    const clone: any = { ...obj }

    Object.keys(obj).forEach(
      (key) =>
        (clone[key] =
          typeof obj[key] === 'object' ? Utils.deepClone(obj[key]) : obj[key])
    )

    if (Array.isArray(obj)) {
      clone.length = obj.length
      return Array.from(clone) as any as T
    }

    return clone as T
  }

  /**
   * Seeded random number generator, using [xorshift](https://en.wikipedia.org/wiki/Xorshift).
   * The result will always be betweeen -1 and 1.
   *
   * Adapted from [seedrandom](https://github.com/davidbau/seedrandom).
   */
  static rng(seed = ''): () => number {
    let x = 0
    let y = 0
    let z = 0
    let w = 0

    function next() {
      const t = x ^ (x << 11)
      ;(x = y), (y = z), (z = w)
      w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0
      return w / 0x100000000
    }

    for (let k = 0; k < seed.length + 64; k++) {
      ;(x ^= seed.charCodeAt(k) | 0), next()
    }

    return next
  }

  /**
   * Shuffle the contents of an array.
   * @param arr
   * @param offset
   */
  static shuffleArr<T>(arr: T[], offset: number): T[] {
    return arr.map((_, i) => arr[(i + offset) % arr.length])
  }

  /**
   * Deep compare two arrays.
   * @param a
   * @param b
   */
  static deepCompareArrays<T>(a: T[], b: T[]): boolean {
    if (a?.length !== b?.length) return false
    return Utils.deepCompare(a, b)
  }

  /**
   * Deep compare any values.
   * @param a
   * @param b
   */
  static deepCompare<T>(a: T, b: T): boolean {
    return a === b || JSON.stringify(a) === JSON.stringify(b)
  }

  /**
   * Find whether two arrays intersect.
   * @param a
   * @param b
   * @param fn An optional function to apply to the items of a; will check if b includes the result.
   */
  static arrsIntersect<T, K>(a: T[], b: K[], fn?: (item: K) => T): boolean
  static arrsIntersect<T>(a: T[], b: T[]): boolean
  static arrsIntersect<T>(
    a: T[],
    b: unknown[],
    fn?: (item: unknown) => T
  ): boolean {
    return a.some((item) => b.includes(fn ? fn(item) : item))
  }

  /**
   * Get the unique values from an array of strings or numbers.
   * @param items
   */
  static uniqueArray<T extends string | number>(...items: T[]): T[] {
    return Array.from(new Set(items).values())
  }

  /**
   * Convert a set to an array.
   * @param set
   */
  static setToArray<T>(set: Set<T>): T[] {
    return Array.from(set.values())
  }

  /**
   * Get the outer of between a circle and a point.
   * @param C The circle's center.
   * @param r The circle's radius.
   * @param P The point.
   * @param side
   */
  static getCircleTangentToPoint(
    C: number[],
    r: number,
    P: number[],
    side: number
  ): number[] {
    const B = vec.lrp(C, P, 0.5),
      r1 = vec.dist(C, B),
      delta = vec.sub(B, C),
      d = vec.len(delta)

    if (!(d <= r + r1 && d >= Math.abs(r - r1))) {
      return
    }

    const a = (r * r - r1 * r1 + d * d) / (2.0 * d),
      n = 1 / d,
      p = vec.add(C, vec.mul(delta, a * n)),
      h = Math.sqrt(r * r - a * a),
      k = vec.mul(vec.per(delta), h * n)

    return side === 0 ? vec.add(p, k) : vec.sub(p, k)
  }

  /**
   * Get outer tangents of two circles.
   * @param x0
   * @param y0
   * @param r0
   * @param x1
   * @param y1
   * @param r1
   * @returns [lx0, ly0, lx1, ly1, rx0, ry0, rx1, ry1]
   */
  static getOuterTangentsOfCircles(
    C0: number[],
    r0: number,
    C1: number[],
    r1: number
  ): number[][] {
    const a0 = vec.angle(C0, C1)
    const d = vec.dist(C0, C1)

    // Circles are overlapping, no tangents
    if (d < Math.abs(r1 - r0)) return

    const a1 = Math.acos((r0 - r1) / d),
      t0 = a0 + a1,
      t1 = a0 - a1

    return [
      [C0[0] + r0 * Math.cos(t1), C0[1] + r0 * Math.sin(t1)],
      [C1[0] + r1 * Math.cos(t1), C1[1] + r1 * Math.sin(t1)],
      [C0[0] + r0 * Math.cos(t0), C0[1] + r0 * Math.sin(t0)],
      [C1[0] + r1 * Math.cos(t0), C1[1] + r1 * Math.sin(t0)],
    ]
  }

  /**
   * Get the closest point on the perimeter of a circle to a given point.
   * @param C The circle's center.
   * @param r The circle's radius.
   * @param P The point.
   */
  static getClosestPointOnCircle(
    C: number[],
    r: number,
    P: number[]
  ): number[] {
    const v = vec.sub(C, P)
    return vec.sub(C, vec.mul(vec.div(v, vec.len(v)), r))
  }

  static det(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
    g: number,
    h: number,
    i: number
  ): number {
    return a * e * i + b * f * g + c * d * h - a * f * h - b * d * i - c * e * g
  }

  /**
   * Get a circle from three points.
   * @param A
   * @param B
   * @param C
   * @returns [x, y, r]
   */
  static circleFromThreePoints(
    A: number[],
    B: number[],
    C: number[]
  ): number[] {
    const a = Utils.det(A[0], A[1], 1, B[0], B[1], 1, C[0], C[1], 1)

    const bx = -Utils.det(
      A[0] * A[0] + A[1] * A[1],
      A[1],
      1,
      B[0] * B[0] + B[1] * B[1],
      B[1],
      1,
      C[0] * C[0] + C[1] * C[1],
      C[1],
      1
    )
    const by = Utils.det(
      A[0] * A[0] + A[1] * A[1],
      A[0],
      1,
      B[0] * B[0] + B[1] * B[1],
      B[0],
      1,
      C[0] * C[0] + C[1] * C[1],
      C[0],
      1
    )
    const c = -Utils.det(
      A[0] * A[0] + A[1] * A[1],
      A[0],
      A[1],
      B[0] * B[0] + B[1] * B[1],
      B[0],
      B[1],
      C[0] * C[0] + C[1] * C[1],
      C[0],
      C[1]
    )

    const x = -bx / (2 * a)
    const y = -by / (2 * a)
    const r = Math.sqrt(bx * bx + by * by - 4 * a * c) / (2 * Math.abs(a))

    return [x, y, r]
  }

  /**
   * Find the approximate perimeter of an ellipse.
   * @param rx
   * @param ry
   */
  static perimeterOfEllipse(rx: number, ry: number): number {
    const h = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2)
    const p = Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
    return p
  }

  /**
   * Get the short angle distance between two angles.
   * @param a0
   * @param a1
   */
  static shortAngleDist(a0: number, a1: number): number {
    const max = Math.PI * 2
    const da = (a1 - a0) % max
    return ((2 * da) % max) - da
  }

  /**
   * Get the long angle distance between two angles.
   * @param a0
   * @param a1
   */
  static longAngleDist(a0: number, a1: number): number {
    return Math.PI * 2 - Utils.shortAngleDist(a0, a1)
  }

  /**
   * Interpolate an angle between two angles.
   * @param a0
   * @param a1
   * @param t
   */
  static lerpAngles(a0: number, a1: number, t: number): number {
    return a0 + Utils.shortAngleDist(a0, a1) * t
  }

  /**
   * Get the short distance between two angles.
   * @param a0
   * @param a1
   */
  static angleDelta(a0: number, a1: number): number {
    return Utils.shortAngleDist(a0, a1)
  }

  /**
   * Get the "sweep" or short distance between two points on a circle's perimeter.
   * @param C
   * @param A
   * @param B
   */
  static getSweep(C: number[], A: number[], B: number[]): number {
    return Utils.angleDelta(vec.angle(C, A), vec.angle(C, B))
  }

  /**
   * Rotate a point around a center.
   * @param x The x-axis coordinate of the point.
   * @param y The y-axis coordinate of the point.
   * @param cx The x-axis coordinate of the point to rotate round.
   * @param cy The y-axis coordinate of the point to rotate round.
   * @param angle The distance (in radians) to rotate.
   */
  static rotatePoint(A: number[], B: number[], angle: number): number[] {
    const s = Math.sin(angle)
    const c = Math.cos(angle)

    const px = A[0] - B[0]
    const py = A[1] - B[1]

    const nx = px * c - py * s
    const ny = px * s + py * c

    return [nx + B[0], ny + B[1]]
  }

  /**
   * Clamp radians within 0 and 2PI
   * @param r
   */
  static clampRadians(r: number): number {
    return (Math.PI * 2 + r) % (Math.PI * 2)
  }

  /**
   * Clamp rotation to even segments.
   * @param r
   * @param segments
   */
  static clampToRotationToSegments(r: number, segments: number): number {
    const seg = (Math.PI * 2) / segments
    return Math.floor((Utils.clampRadians(r) + seg / 2) / seg) * seg
  }

  /**
   * Is angle c between angles a and b?
   * @param a
   * @param b
   * @param c
   */
  static isAngleBetween(a: number, b: number, c: number): boolean {
    if (c === a || c === b) return true
    const PI2 = Math.PI * 2
    const AB = (b - a + PI2) % PI2
    const AC = (c - a + PI2) % PI2
    return AB <= Math.PI !== AC > AB
  }

  /**
   * Convert degrees to radians.
   * @param d
   */
  static degreesToRadians(d: number): number {
    return (d * Math.PI) / 180
  }

  /**
   * Convert radians to degrees.
   * @param r
   */
  static radiansToDegrees(r: number): number {
    return (r * 180) / Math.PI
  }

  /**
   * Get the length of an arc between two points on a circle's perimeter.
   * @param C
   * @param r
   * @param A
   * @param B
   */
  static getArcLength(
    C: number[],
    r: number,
    A: number[],
    B: number[]
  ): number {
    const sweep = Utils.getSweep(C, A, B)
    return r * (2 * Math.PI) * (sweep / (2 * Math.PI))
  }

  /**
   * Get a dash offset for an arc, based on its length.
   * @param C
   * @param r
   * @param A
   * @param B
   * @param step
   */
  static getArcDashOffset(
    C: number[],
    r: number,
    A: number[],
    B: number[],
    step: number
  ): number {
    const del0 = Utils.getSweep(C, A, B)
    const len0 = Utils.getArcLength(C, r, A, B)
    const off0 = del0 < 0 ? len0 : 2 * Math.PI * C[2] - len0
    return -off0 / 2 + step
  }

  /**
   * Get a dash offset for an ellipse, based on its length.
   * @param A
   * @param step
   */
  static getEllipseDashOffset(A: number[], step: number): number {
    const c = 2 * Math.PI * A[2]
    return -c / 2 + -step
  }

  static getPointsBetween(a: number[], b: number[], steps = 6): number[][] {
    return Array.from(Array(steps))
      .map((_, i) => {
        const t = i / steps
        return t * t * t
      })
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

  /**
   * Get a bezier curve data for a spline that fits an array of points.
   * @param pts
   * @param tension
   * @param isClosed
   * @param numOfSegments
   */
  static getCurvePoints(
    pts: number[][],
    tension = 0.5,
    isClosed = false,
    numOfSegments = 3
  ): number[][] {
    const _pts = [...pts],
      len = pts.length,
      res: number[][] = [] // results

    let t1x: number, // tension vectors
      t2x: number,
      t1y: number,
      t2y: number,
      c1: number, // cardinal points
      c2: number,
      c3: number,
      c4: number,
      st: number,
      st2: number,
      st3: number

    // The algorithm require a previous and next point to the actual point array.
    // Check if we will draw closed or open curve.
    // If closed, copy end points to beginning and first points to end
    // If open, duplicate first points to befinning, end points to end
    if (isClosed) {
      _pts.unshift(_pts[len - 1])
      _pts.push(_pts[0])
    } else {
      //copy 1. point and insert at beginning
      _pts.unshift(_pts[0])
      _pts.push(_pts[len - 1])
      // _pts.push(_pts[len - 1])
    }

    // For each point, calculate a segment
    for (let i = 1; i < _pts.length - 2; i++) {
      // Calculate points along segment and add to results
      for (let t = 0; t <= numOfSegments; t++) {
        // Step
        st = t / numOfSegments
        st2 = Math.pow(st, 2)
        st3 = Math.pow(st, 3)

        // Cardinals
        c1 = 2 * st3 - 3 * st2 + 1
        c2 = -(2 * st3) + 3 * st2
        c3 = st3 - 2 * st2 + st
        c4 = st3 - st2

        // Tension
        t1x = (_pts[i + 1][0] - _pts[i - 1][0]) * tension
        t2x = (_pts[i + 2][0] - _pts[i][0]) * tension
        t1y = (_pts[i + 1][1] - _pts[i - 1][1]) * tension
        t2y = (_pts[i + 2][1] - _pts[i][1]) * tension

        // Control points
        res.push([
          c1 * _pts[i][0] + c2 * _pts[i + 1][0] + c3 * t1x + c4 * t2x,
          c1 * _pts[i][1] + c2 * _pts[i + 1][1] + c3 * t1y + c4 * t2y,
        ])
      }
    }

    res.push(pts[pts.length - 1])

    return res
  }

  /**
   * Simplify a line (using Ramer-Douglas-Peucker algorithm).
   * @param points An array of points as [x, y, ...][]
   * @param tolerance The minimum line distance (also called epsilon).
   * @returns Simplified array as [x, y, ...][]
   */
  static simplify(points: number[][], tolerance = 1): number[][] {
    const len = points.length,
      a = points[0],
      b = points[len - 1],
      [x1, y1] = a,
      [x2, y2] = b

    if (len > 2) {
      let distance = 0
      let index = 0
      const max = Math.hypot(y2 - y1, x2 - x1)

      for (let i = 1; i < len - 1; i++) {
        const [x0, y0] = points[i],
          d =
            Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / max

        if (distance > d) continue

        distance = d
        index = i
      }

      if (distance > tolerance) {
        const l0 = Utils.simplify(points.slice(0, index + 1), tolerance)
        const l1 = Utils.simplify(points.slice(index + 1), tolerance)
        return l0.concat(l1.slice(1))
      }
    }

    return [a, b]
  }
}
