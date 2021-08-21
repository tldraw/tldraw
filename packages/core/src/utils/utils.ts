/* eslint-disable @typescript-eslint/no-extra-semi */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-redeclare */
import type React from 'react'
import deepmerge from 'deepmerge'
import isMobilePkg from 'ismobilejs'
import { TLBezierCurveSegment, TLBounds, TLBoundsCorner, TLBoundsEdge } from '../types'
import vec from './vec'
import './polyfills'

export class Utils {
  /* -------------------------------------------------- */
  /*                    Math & Geometry                 */
  /* -------------------------------------------------- */

  static filterObject<T extends object>(
    obj: T,
    fn: (entry: Entry<T>, i?: number, arr?: Entry<T>[]) => boolean
  ) {
    return Object.fromEntries((Object.entries(obj) as Entry<T>[]).filter(fn)) as Partial<T>
  }

  static deepMerge<T>(target: T, source: any): T {
    return deepmerge(target, source, { arrayMerge: (a, b) => b, clone: false })

    // const result = {} as T

    // for (const key of Object.keys(result)) {
    //   const tprop = target[key as keyof T]
    //   const sprop = source[key]
    //   if (tprop === sprop) {
    //     continue
    //   } else if (!(key in target) || target[key as keyof T] === undefined) {
    //     result[key as keyof T] = sprop
    //   } else if (!(key in source)) {
    //     continue
    //   } else if (source[key as keyof T] === undefined) {
    //     delete result[key as keyof T]
    //   } else {
    //     if (typeof tprop === 'object' && typeof sprop === 'object') {
    //       result[key as keyof T] = this.deepMerge(tprop, sprop)
    //     } else {
    //       result[key as keyof T] = sprop
    //     }
    //   }
    // }

    // return result
  }

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
   * Linear interpolation between two colors.
   *
   * ### Example
   *
   *```ts
   * lerpColor("#000000", "#0099FF", .25)
   *```
   */

  static lerpColor(color1: string, color2: string, factor = 0.5): string | undefined {
    function h2r(hex: string) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : null
    }

    function r2h(rgb: number[]) {
      return '#' + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1)
    }

    const c1 = h2r(color1) || [0, 0, 0]
    const c2 = h2r(color2) || [0, 0, 0]

    const result = c1.slice()

    for (let i = 0; i < 3; i++) {
      result[i] = Math.round(result[i] + factor * (c2[i] - c1[i]))
    }

    return r2h(result)
  }

  /**
   * Modulate a value between two ranges.
   * @param value
   * @param rangeA from [low, high]
   * @param rangeB to [low, high]
   * @param clamp
   */
  static modulate(value: number, rangeA: number[], rangeB: number[], clamp = false): number {
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
  static deepClone<T extends unknown>(obj: T): T {
    if (obj === null) return obj

    if (Array.isArray(obj)) {
      return [...obj] as T
    }

    if (typeof obj === 'object') {
      const clone = { ...(obj as Record<string, unknown>) }

      Object.keys(clone).forEach(
        (key) =>
          (clone[key] =
            typeof obj[key as keyof T] === 'object'
              ? Utils.deepClone(obj[key as keyof T])
              : obj[key as keyof T])
      )

      return clone as T
    }

    return obj
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
      x = y
      y = z
      z = w
      w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0
      return w / 0x100000000
    }

    for (let k = 0; k < seed.length + 64; k++) {
      x ^= seed.charCodeAt(k) | 0
      next()
    }

    return next
  }

  /* ---------------------- Boxes --------------------- */

  static getRectangleSides(point: number[], size: number[], rotation = 0): [string, number[][]][] {
    const center = [point[0] + size[0] / 2, point[1] + size[1] / 2]
    const tl = vec.rotWith(point, center, rotation)
    const tr = vec.rotWith(vec.add(point, [size[0], 0]), center, rotation)
    const br = vec.rotWith(vec.add(point, size), center, rotation)
    const bl = vec.rotWith(vec.add(point, [0, size[1]]), center, rotation)

    return [
      ['top', [tl, tr]],
      ['right', [tr, br]],
      ['bottom', [br, bl]],
      ['left', [bl, tl]],
    ]
  }

  static getBoundsSides(bounds: TLBounds): [string, number[][]][] {
    return this.getRectangleSides([bounds.minX, bounds.minY], [bounds.width, bounds.height])
  }

  static shallowEqual<T extends Record<string, unknown>>(objA: T, objB: T): boolean {
    if (objA === objB) return true

    if (!objA || !objB) return false

    const aKeys = Object.keys(objA)
    const bKeys = Object.keys(objB)
    const len = aKeys.length

    if (bKeys.length !== len) return false

    for (let i = 0; i < len; i++) {
      const key = aKeys[i]

      if (objA[key] !== objB[key] || !Object.prototype.hasOwnProperty.call(objB, key)) {
        return false
      }
    }

    return true
  }

  /* --------------- Circles and Angles --------------- */

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
  ): number[] | null {
    const B = vec.lrp(C, P, 0.5)
    const r1 = vec.dist(C, B)
    const delta = vec.sub(B, C)
    const d = vec.len(delta)

    if (!(d <= r + r1 && d >= Math.abs(r - r1))) {
      return null
    }

    const a = (r * r - r1 * r1 + d * d) / (2.0 * d)
    const n = 1 / d
    const p = vec.add(C, vec.mul(delta, a * n))
    const h = Math.sqrt(r * r - a * a)
    const k = vec.mul(vec.per(delta), h * n)

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
  ): number[][] | null {
    const a0 = vec.angle(C0, C1)
    const d = vec.dist(C0, C1)

    // Circles are overlapping, no tangents
    if (d < Math.abs(r1 - r0)) {
      return null
    }

    const a1 = Math.acos((r0 - r1) / d)
    const t0 = a0 + a1
    const t1 = a0 - a1

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
  static getClosestPointOnCircle(C: number[], r: number, P: number[]): number[] {
    const v = vec.sub(C, P)
    return vec.sub(C, vec.mul(vec.div(v, vec.len(v)), r))
  }

  /**
   * Get a circle from three points.
   * @param A
   * @param B
   * @param C
   * @returns [x, y, r]
   */
  static circleFromThreePoints(A: number[], B: number[], C: number[]): number[] {
    const [x1, y1] = A
    const [x2, y2] = B
    const [x3, y3] = C

    const a = x1 * (y2 - y3) - y1 * (x2 - x3) + x2 * y3 - x3 * y2

    const b =
      (x1 * x1 + y1 * y1) * (y3 - y2) +
      (x2 * x2 + y2 * y2) * (y1 - y3) +
      (x3 * x3 + y3 * y3) * (y2 - y1)

    const c =
      (x1 * x1 + y1 * y1) * (x2 - x3) +
      (x2 * x2 + y2 * y2) * (x3 - x1) +
      (x3 * x3 + y3 * y3) * (x1 - x2)

    const x = -b / (2 * a)

    const y = -c / (2 * a)

    return [x, y, Math.hypot(x - x1, y - y1)]
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
  static getArcLength(C: number[], r: number, A: number[], B: number[]): number {
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
  static getArcDashOffset(C: number[], r: number, A: number[], B: number[], step: number): number {
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

  /* --------------- Curves and Splines --------------- */

  /**
   * Get bezier curve segments that pass through an array of points.
   * @param points
   * @param tension
   */
  static getTLBezierCurveSegments(points: number[][], tension = 0.4): TLBezierCurveSegment[] {
    const len = points.length
    const cpoints: number[][] = [...points]

    if (len < 2) {
      throw Error('Curve must have at least two points.')
    }

    for (let i = 1; i < len - 1; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]

      const pdx = p2[0] - p0[0]
      const pdy = p2[1] - p0[1]
      const pd = Math.hypot(pdx, pdy)
      const nx = pdx / pd // normalized x
      const ny = pdy / pd // normalized y
      const dp = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) // Distance to previous
      const dn = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) // Distance to next

      cpoints[i] = [
        // tangent start
        p1[0] - nx * dp * tension,
        p1[1] - ny * dp * tension,
        // tangent end
        p1[0] + nx * dn * tension,
        p1[1] + ny * dn * tension,
        // normal
        nx,
        ny,
      ]
    }

    // TODO: Reflect the nearest control points, not average them
    const d0 = Math.hypot(points[0][0] + cpoints[1][0])
    cpoints[0][2] = (points[0][0] + cpoints[1][0]) / 2
    cpoints[0][3] = (points[0][1] + cpoints[1][1]) / 2
    cpoints[0][4] = (cpoints[1][0] - points[0][0]) / d0
    cpoints[0][5] = (cpoints[1][1] - points[0][1]) / d0

    const d1 = Math.hypot(points[len - 1][1] + cpoints[len - 1][1])
    cpoints[len - 1][0] = (points[len - 1][0] + cpoints[len - 2][2]) / 2
    cpoints[len - 1][1] = (points[len - 1][1] + cpoints[len - 2][3]) / 2
    cpoints[len - 1][4] = (cpoints[len - 2][2] - points[len - 1][0]) / -d1
    cpoints[len - 1][5] = (cpoints[len - 2][3] - points[len - 1][1]) / -d1

    const results: TLBezierCurveSegment[] = []

    for (let i = 1; i < cpoints.length; i++) {
      results.push({
        start: points[i - 1].slice(0, 2),
        tangentStart: cpoints[i - 1].slice(2, 4),
        normalStart: cpoints[i - 1].slice(4, 6),
        pressureStart: 2 + ((i - 1) % 2 === 0 ? 1.5 : 0),
        end: points[i].slice(0, 2),
        tangentEnd: cpoints[i].slice(0, 2),
        normalEnd: cpoints[i].slice(4, 6),
        pressureEnd: 2 + (i % 2 === 0 ? 1.5 : 0),
      })
    }

    return results
  }

  /**
   * Find a point along a curve segment, via pomax.
   * @param t
   * @param points [cpx1, cpy1, cpx2, cpy2, px, py][]
   */
  static computePointOnCurve(t: number, points: number[][]): number[] {
    // shortcuts
    if (t === 0) {
      return points[0]
    }

    const order = points.length - 1

    if (t === 1) {
      return points[order]
    }

    const mt = 1 - t
    let p = points // constant?

    if (order === 0) {
      return points[0]
    } // linear?

    if (order === 1) {
      return [mt * p[0][0] + t * p[1][0], mt * p[0][1] + t * p[1][1]]
    } // quadratic/cubic curve?

    // if (order < 4) {
    const mt2 = mt * mt
    const t2 = t * t

    let a: number
    let b: number
    let c: number
    let d = 0

    if (order === 2) {
      p = [p[0], p[1], p[2], [0, 0]]
      a = mt2
      b = mt * t * 2
      c = t2
      // } else if (order === 3) {
    } else {
      a = mt2 * mt
      b = mt2 * t * 3
      c = mt * t2 * 3
      d = t * t2
    }

    return [
      a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0],
      a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1],
    ]
    // } // higher order curves: use de Casteljau's computation
  }

  /**
   * Evaluate a 2d cubic bezier at a point t on the x axis.
   * @param tx
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   */
  static cubicBezier(tx: number, x1: number, y1: number, x2: number, y2: number): number {
    // Inspired by Don Lancaster's two articles
    // http://www.tinaja.com/glib/cubemath.pdf
    // http://www.tinaja.com/text/bezmath.html

    // Set start and end point
    const x0 = 0
    const y0 = 0
    const x3 = 1
    const y3 = 1
    // Convert the coordinates to equation space
    const A = x3 - 3 * x2 + 3 * x1 - x0
    const B = 3 * x2 - 6 * x1 + 3 * x0
    const C = 3 * x1 - 3 * x0
    const D = x0
    const E = y3 - 3 * y2 + 3 * y1 - y0
    const F = 3 * y2 - 6 * y1 + 3 * y0
    const G = 3 * y1 - 3 * y0
    const H = y0
    // Variables for the loop below
    const iterations = 5

    let i: number
    let slope: number
    let x: number
    let t = tx

    // Loop through a few times to get a more accurate time value, according to the Newton-Raphson method
    // http://en.wikipedia.org/wiki/Newton's_method
    for (i = 0; i < iterations; i++) {
      // The curve's x equation for the current time value
      x = A * t * t * t + B * t * t + C * t + D

      // The slope we want is the inverse of the derivate of x
      slope = 1 / (3 * A * t * t + 2 * B * t + C)

      // Get the next estimated time value, which will be more accurate than the one before
      t -= (x - tx) * slope
      t = t > 1 ? 1 : t < 0 ? 0 : t
    }

    // Find the y value through the curve's y equation, with the now more accurate time value
    return Math.abs(E * t * t * t + F * t * t + G * t * H)
  }

  /**
   * Get a bezier curve data for a spline that fits an array of points.
   * @param points An array of points formatted as [x, y]
   * @param k Tension
   */
  static getSpline(
    pts: number[][],
    k = 0.5
  ): {
    cp1x: number
    cp1y: number
    cp2x: number
    cp2y: number
    px: number
    py: number
  }[] {
    let p0: number[]
    let [p1, p2, p3] = pts

    const results: {
      cp1x: number
      cp1y: number
      cp2x: number
      cp2y: number
      px: number
      py: number
    }[] = []

    for (let i = 1, len = pts.length; i < len; i++) {
      p0 = p1
      p1 = p2
      p2 = p3
      p3 = pts[i + 2] ? pts[i + 2] : p2

      results.push({
        cp1x: p1[0] + ((p2[0] - p0[0]) / 6) * k,
        cp1y: p1[1] + ((p2[1] - p0[1]) / 6) * k,
        cp2x: p2[0] - ((p3[0] - p1[0]) / 6) * k,
        cp2y: p2[1] - ((p3[1] - p1[1]) / 6) * k,
        px: pts[i][0],
        py: pts[i][1],
      })
    }

    return results
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
    const _pts = [...pts]
    const len = pts.length
    const res: number[][] = [] // results

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
      // copy 1. point and insert at beginning
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
        const l0 = Utils.simplify(points.slice(0, index + 1), tolerance)
        const l1 = Utils.simplify(points.slice(index + 1), tolerance)
        return l0.concat(l1.slice(1))
      }
    }

    return [a, b]
  }

  /**
   * Get whether a point is inside of a circle.
   * @param A
   * @param b
   * @returns
   */
  static pointInCircle(A: number[], C: number[], r: number): boolean {
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
  static pointInEllipse(A: number[], C: number[], rx: number, ry: number, rotation = 0): boolean {
    rotation = rotation || 0
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const delta = vec.sub(A, C)
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
        if (b[1] > p[1] && vec.cross(a, b, p) > 0) {
          wn += 1
        }
      } else if (b[1] <= p[1] && vec.cross(a, b, p) < 0) {
        wn -= 1
      }
    })

    return wn !== 0
  }

  /* --------------------- Bounds --------------------- */

  /**
   * Expand a bounding box by a delta.
   *
   * ### Example
   *
   *```ts
   * expandBounds(myBounds, [100, 100])
   *```
   */
  static expandBounds(bounds: TLBounds, delta: number): TLBounds {
    return {
      minX: bounds.minX - delta,
      minY: bounds.minY - delta,
      maxX: bounds.maxX + delta,
      maxY: bounds.maxY + delta,
      width: bounds.width + delta * 2,
      height: bounds.height + delta * 2,
    }
  }

  /**
   * Get whether a point is inside of a bounds.
   * @param A
   * @param b
   * @returns
   */
  static pointInBounds(A: number[], b: TLBounds): boolean {
    return !(A[0] < b.minX || A[0] > b.maxX || A[1] < b.minY || A[1] > b.maxY)
  }

  /**
   * Get whether two bounds collide.
   * @param a Bounds
   * @param b Bounds
   * @returns
   */
  static boundsCollide(a: TLBounds, b: TLBounds): boolean {
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY)
  }

  /**
   * Get whether the bounds of A contain the bounds of B. A perfect match will return true.
   * @param a Bounds
   * @param b Bounds
   * @returns
   */
  static boundsContain(a: TLBounds, b: TLBounds): boolean {
    return a.minX < b.minX && a.minY < b.minY && a.maxY > b.maxY && a.maxX > b.maxX
  }

  /**
   * Get whether the bounds of A are contained by the bounds of B.
   * @param a Bounds
   * @param b Bounds
   * @returns
   */
  static boundsContained(a: TLBounds, b: TLBounds): boolean {
    return Utils.boundsContain(b, a)
  }

  /**
   * Get whether two bounds are identical.
   * @param a Bounds
   * @param b Bounds
   * @returns
   */
  static boundsAreEqual(a: TLBounds, b: TLBounds): boolean {
    return !(b.maxX !== a.maxX || b.minX !== a.minX || b.maxY !== a.maxY || b.minY !== a.minY)
  }

  /**
   * Find a bounding box from an array of points.
   * @param points
   * @param rotation (optional) The bounding box's rotation.
   */
  static getBoundsFromPoints(points: number[][], rotation = 0): TLBounds {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    if (points.length < 2) {
      minX = 0
      minY = 0
      maxX = 1
      maxY = 1
    } else {
      for (const [x, y] of points) {
        minX = Math.min(x, minX)
        minY = Math.min(y, minY)
        maxX = Math.max(x, maxX)
        maxY = Math.max(y, maxY)
      }
    }

    if (rotation !== 0) {
      return Utils.getBoundsFromPoints(
        points.map((pt) => vec.rotWith(pt, [(minX + maxX) / 2, (minY + maxY) / 2], rotation))
      )
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    }
  }

  /**
   * Center a bounding box around a given point.
   * @param bounds
   * @param center
   */
  static centerBounds(bounds: TLBounds, point: number[]): TLBounds {
    const boundsCenter = this.getBoundsCenter(bounds)
    const dx = point[0] - boundsCenter[0]
    const dy = point[1] - boundsCenter[1]
    return this.translateBounds(bounds, [dx, dy])
  }

  /**
   * Move a bounding box without recalculating it.
   * @param bounds
   * @param delta
   * @returns
   */
  static translateBounds(bounds: TLBounds, delta: number[]): TLBounds {
    return {
      minX: bounds.minX + delta[0],
      minY: bounds.minY + delta[1],
      maxX: bounds.maxX + delta[0],
      maxY: bounds.maxY + delta[1],
      width: bounds.width,
      height: bounds.height,
    }
  }

  /**
   * Rotate a bounding box.
   * @param bounds
   * @param center
   * @param rotation
   */
  static rotateBounds(bounds: TLBounds, center: number[], rotation: number): TLBounds {
    const [minX, minY] = vec.rotWith([bounds.minX, bounds.minY], center, rotation)
    const [maxX, maxY] = vec.rotWith([bounds.maxX, bounds.maxY], center, rotation)

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: bounds.width,
      height: bounds.height,
    }
  }

  /**
   * Get the rotated bounds of an ellipse.
   * @param x
   * @param y
   * @param rx
   * @param ry
   * @param rotation
   */
  static getRotatedEllipseBounds(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number
  ): TLBounds {
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

  /**
   * Get a bounding box that includes two bounding boxes.
   * @param a Bounding box
   * @param b Bounding box
   * @returns
   */
  static getExpandedBounds(a: TLBounds, b: TLBounds): TLBounds {
    const minX = Math.min(a.minX, b.minX)
    const minY = Math.min(a.minY, b.minY)
    const maxX = Math.max(a.maxX, b.maxX)
    const maxY = Math.max(a.maxY, b.maxY)
    const width = Math.abs(maxX - minX)
    const height = Math.abs(maxY - minY)

    return { minX, minY, maxX, maxY, width, height }
  }

  /**
   * Get the common bounds of a group of bounds.
   * @returns
   */
  static getCommonBounds(bounds: TLBounds[]): TLBounds {
    if (bounds.length < 2) return bounds[0]

    let result = bounds[0]

    for (let i = 1; i < bounds.length; i++) {
      result = Utils.getExpandedBounds(result, bounds[i])
    }

    return result
  }

  static getRotatedCorners(b: TLBounds, rotation = 0): number[][] {
    const center = [b.minX + b.width / 2, b.minY + b.height / 2]

    return [
      [b.minX, b.minY],
      [b.maxX, b.minY],
      [b.maxX, b.maxY],
      [b.minX, b.maxY],
    ].map((point) => vec.rotWith(point, center, rotation))
  }

  static getTransformedBoundingBox(
    bounds: TLBounds,
    handle: TLBoundsCorner | TLBoundsEdge | 'center',
    delta: number[],
    rotation = 0,
    isAspectRatioLocked = false
  ): TLBounds & { scaleX: number; scaleY: number } {
    // Create top left and bottom right corners.
    const [ax0, ay0] = [bounds.minX, bounds.minY]
    const [ax1, ay1] = [bounds.maxX, bounds.maxY]

    // Create a second set of corners for the new box.
    let [bx0, by0] = [bounds.minX, bounds.minY]
    let [bx1, by1] = [bounds.maxX, bounds.maxY]

    // If the drag is on the center, just translate the bounds.
    if (handle === 'center') {
      return {
        minX: bx0 + delta[0],
        minY: by0 + delta[1],
        maxX: bx1 + delta[0],
        maxY: by1 + delta[1],
        width: bx1 - bx0,
        height: by1 - by0,
        scaleX: 1,
        scaleY: 1,
      }
    }

    // Counter rotate the delta. This lets us make changes as if
    // the (possibly rotated) boxes were axis aligned.
    const [dx, dy] = vec.rot(delta, -rotation)

    /*
1. Delta

Use the delta to adjust the new box by changing its corners.
The dragging handle (corner or edge) will determine which 
corners should change.
*/
    switch (handle) {
      case TLBoundsEdge.Top:
      case TLBoundsCorner.TopLeft:
      case TLBoundsCorner.TopRight: {
        by0 += dy
        break
      }
      case TLBoundsEdge.Bottom:
      case TLBoundsCorner.BottomLeft:
      case TLBoundsCorner.BottomRight: {
        by1 += dy
        break
      }
    }

    switch (handle) {
      case TLBoundsEdge.Left:
      case TLBoundsCorner.TopLeft:
      case TLBoundsCorner.BottomLeft: {
        bx0 += dx
        break
      }
      case TLBoundsEdge.Right:
      case TLBoundsCorner.TopRight:
      case TLBoundsCorner.BottomRight: {
        bx1 += dx
        break
      }
    }

    const aw = ax1 - ax0
    const ah = ay1 - ay0

    const scaleX = (bx1 - bx0) / aw
    const scaleY = (by1 - by0) / ah

    const flipX = scaleX < 0
    const flipY = scaleY < 0

    const bw = Math.abs(bx1 - bx0)
    const bh = Math.abs(by1 - by0)

    /*
2. Aspect ratio

If the aspect ratio is locked, adjust the corners so that the
new box's aspect ratio matches the original aspect ratio.
*/

    if (isAspectRatioLocked) {
      const ar = aw / ah
      const isTall = ar < bw / bh
      const tw = bw * (scaleY < 0 ? 1 : -1) * (1 / ar)
      const th = bh * (scaleX < 0 ? 1 : -1) * ar

      switch (handle) {
        case TLBoundsCorner.TopLeft: {
          if (isTall) by0 = by1 + tw
          else bx0 = bx1 + th
          break
        }
        case TLBoundsCorner.TopRight: {
          if (isTall) by0 = by1 + tw
          else bx1 = bx0 - th
          break
        }
        case TLBoundsCorner.BottomRight: {
          if (isTall) by1 = by0 - tw
          else bx1 = bx0 - th
          break
        }
        case TLBoundsCorner.BottomLeft: {
          if (isTall) by1 = by0 - tw
          else bx0 = bx1 + th
          break
        }
        case TLBoundsEdge.Bottom:
        case TLBoundsEdge.Top: {
          const m = (bx0 + bx1) / 2
          const w = bh * ar
          bx0 = m - w / 2
          bx1 = m + w / 2
          break
        }
        case TLBoundsEdge.Left:
        case TLBoundsEdge.Right: {
          const m = (by0 + by1) / 2
          const h = bw / ar
          by0 = m - h / 2
          by1 = m + h / 2
          break
        }
      }
    }

    /*
3. Rotation

If the bounds are rotated, get a vector from the rotated anchor
corner in the inital bounds to the rotated anchor corner in the
result's bounds. Subtract this vector from the result's corners,
so that the two anchor points (initial and result) will be equal.
*/

    if (rotation % (Math.PI * 2) !== 0) {
      let cv = [0, 0]

      const c0 = vec.med([ax0, ay0], [ax1, ay1])
      const c1 = vec.med([bx0, by0], [bx1, by1])

      switch (handle) {
        case TLBoundsCorner.TopLeft: {
          cv = vec.sub(vec.rotWith([bx1, by1], c1, rotation), vec.rotWith([ax1, ay1], c0, rotation))
          break
        }
        case TLBoundsCorner.TopRight: {
          cv = vec.sub(vec.rotWith([bx0, by1], c1, rotation), vec.rotWith([ax0, ay1], c0, rotation))
          break
        }
        case TLBoundsCorner.BottomRight: {
          cv = vec.sub(vec.rotWith([bx0, by0], c1, rotation), vec.rotWith([ax0, ay0], c0, rotation))
          break
        }
        case TLBoundsCorner.BottomLeft: {
          cv = vec.sub(vec.rotWith([bx1, by0], c1, rotation), vec.rotWith([ax1, ay0], c0, rotation))
          break
        }
        case TLBoundsEdge.Top: {
          cv = vec.sub(
            vec.rotWith(vec.med([bx0, by1], [bx1, by1]), c1, rotation),
            vec.rotWith(vec.med([ax0, ay1], [ax1, ay1]), c0, rotation)
          )
          break
        }
        case TLBoundsEdge.Left: {
          cv = vec.sub(
            vec.rotWith(vec.med([bx1, by0], [bx1, by1]), c1, rotation),
            vec.rotWith(vec.med([ax1, ay0], [ax1, ay1]), c0, rotation)
          )
          break
        }
        case TLBoundsEdge.Bottom: {
          cv = vec.sub(
            vec.rotWith(vec.med([bx0, by0], [bx1, by0]), c1, rotation),
            vec.rotWith(vec.med([ax0, ay0], [ax1, ay0]), c0, rotation)
          )
          break
        }
        case TLBoundsEdge.Right: {
          cv = vec.sub(
            vec.rotWith(vec.med([bx0, by0], [bx0, by1]), c1, rotation),
            vec.rotWith(vec.med([ax0, ay0], [ax0, ay1]), c0, rotation)
          )
          break
        }
      }

      ;[bx0, by0] = vec.sub([bx0, by0], cv)
      ;[bx1, by1] = vec.sub([bx1, by1], cv)
    }

    /*
4. Flips

If the axes are flipped (e.g. if the right edge has been dragged
left past the initial left edge) then swap points on that axis.
*/

    if (bx1 < bx0) {
      ;[bx1, bx0] = [bx0, bx1]
    }

    if (by1 < by0) {
      ;[by1, by0] = [by0, by1]
    }

    return {
      minX: bx0,
      minY: by0,
      maxX: bx1,
      maxY: by1,
      width: bx1 - bx0,
      height: by1 - by0,
      scaleX: ((bx1 - bx0) / (ax1 - ax0 || 1)) * (flipX ? -1 : 1),
      scaleY: ((by1 - by0) / (ay1 - ay0 || 1)) * (flipY ? -1 : 1),
    }
  }

  static getTransformAnchor(
    type: TLBoundsEdge | TLBoundsCorner,
    isFlippedX: boolean,
    isFlippedY: boolean
  ): TLBoundsCorner | TLBoundsEdge {
    let anchor: TLBoundsCorner | TLBoundsEdge = type

    // Change corner anchors if flipped
    switch (type) {
      case TLBoundsCorner.TopLeft: {
        if (isFlippedX && isFlippedY) {
          anchor = TLBoundsCorner.BottomRight
        } else if (isFlippedX) {
          anchor = TLBoundsCorner.TopRight
        } else if (isFlippedY) {
          anchor = TLBoundsCorner.BottomLeft
        } else {
          anchor = TLBoundsCorner.BottomRight
        }
        break
      }
      case TLBoundsCorner.TopRight: {
        if (isFlippedX && isFlippedY) {
          anchor = TLBoundsCorner.BottomLeft
        } else if (isFlippedX) {
          anchor = TLBoundsCorner.TopLeft
        } else if (isFlippedY) {
          anchor = TLBoundsCorner.BottomRight
        } else {
          anchor = TLBoundsCorner.BottomLeft
        }
        break
      }
      case TLBoundsCorner.BottomRight: {
        if (isFlippedX && isFlippedY) {
          anchor = TLBoundsCorner.TopLeft
        } else if (isFlippedX) {
          anchor = TLBoundsCorner.BottomLeft
        } else if (isFlippedY) {
          anchor = TLBoundsCorner.TopRight
        } else {
          anchor = TLBoundsCorner.TopLeft
        }
        break
      }
      case TLBoundsCorner.BottomLeft: {
        if (isFlippedX && isFlippedY) {
          anchor = TLBoundsCorner.TopRight
        } else if (isFlippedX) {
          anchor = TLBoundsCorner.BottomRight
        } else if (isFlippedY) {
          anchor = TLBoundsCorner.TopLeft
        } else {
          anchor = TLBoundsCorner.TopRight
        }
        break
      }
    }

    return anchor
  }

  /**
   * Get the relative bounds (usually a child) within a transformed bounding box.
   * @param bounds
   * @param initialBounds
   * @param initialShapeBounds
   * @param isFlippedX
   * @param isFlippedY
   */
  static getRelativeTransformedBoundingBox(
    bounds: TLBounds,
    initialBounds: TLBounds,
    initialShapeBounds: TLBounds,
    isFlippedX: boolean,
    isFlippedY: boolean
  ): TLBounds {
    const nx =
      (isFlippedX
        ? initialBounds.maxX - initialShapeBounds.maxX
        : initialShapeBounds.minX - initialBounds.minX) / initialBounds.width

    const ny =
      (isFlippedY
        ? initialBounds.maxY - initialShapeBounds.maxY
        : initialShapeBounds.minY - initialBounds.minY) / initialBounds.height

    const nw = initialShapeBounds.width / initialBounds.width
    const nh = initialShapeBounds.height / initialBounds.height

    const minX = bounds.minX + bounds.width * nx
    const minY = bounds.minY + bounds.height * ny
    const width = bounds.width * nw
    const height = bounds.height * nh

    return {
      minX,
      minY,
      maxX: minX + width,
      maxY: minY + height,
      width,
      height,
    }
  }

  /**
   * Get the size of a rotated box.
   * @param size : ;
   * @param rotation
   */
  static getRotatedSize(size: number[], rotation: number): number[] {
    const center = vec.div(size, 2)

    const points = [[0, 0], [size[0], 0], size, [0, size[1]]].map((point) =>
      vec.rotWith(point, center, rotation)
    )

    const bounds = Utils.getBoundsFromPoints(points)

    return [bounds.width, bounds.height]
  }

  /**
   * Get the center of a bounding box.
   * @param bounds
   */
  static getBoundsCenter(bounds: TLBounds): number[] {
    return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
  }

  /* -------------------------------------------------- */
  /*                Lists and Collections               */
  /* -------------------------------------------------- */

  /**
   *
   *
   * ### Example
   *
   *```ts
   * example
   *```
   */
  static removeDuplicatePoints(points: number[][]) {
    return points.reduce<number[][]>((acc, pt, i) => {
      if (i === 0 || !vec.isEqual(pt, acc[i - 1])) {
        acc.push(pt)
      }
      return acc
    }, [])
  }

  /**
  // points =


/**
 * Get a value from a cache (a WeakMap), filling the value if it is not present.
 *
 * ### Example
 *
 *```ts
 * getFromCache(boundsCache, shape, (cache) => cache.set(shape, "value"))
 *```
 */
  // eslint-disable-next-line @typescript-eslint/ban-types
  static getFromCache<V, I extends object>(cache: WeakMap<I, V>, item: I, getNext: () => V): V {
    let value = cache.get(item)

    if (value === undefined) {
      cache.set(item, getNext())
      value = cache.get(item)

      if (value === undefined) {
        throw Error('Cache did not include item!')
      }
    }

    return value
  }

  /**
   * Get a unique string id.
   */
  static uniqueId(a = ''): string {
    return a
      ? /* eslint-disable no-bitwise */
        ((Number(a) ^ (Math.random() * 16)) >> (Number(a) / 4)).toString(16)
      : `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, Utils.uniqueId)
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
  static arrsIntersect<T>(a: T[], b: unknown[], fn?: (item: unknown) => T): boolean {
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
   * Debounce a function.
   */
  static debounce<T extends (...args: unknown[]) => void>(fn: T, ms = 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let timeoutId: number | any
    return function (...args: Parameters<T>) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn.apply(args), ms)
    }
  }

  /**
   * Turn an array of points into a path of quadradic curves.
   * @param stroke ;
   */
  static getSvgPathFromStroke(stroke: number[][]): string {
    if (!stroke.length) return ''

    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length]
        acc.push(` ${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`)
        return acc
      },
      ['M ', `${stroke[0][0]},${stroke[0][1]}`, ' Q']
    )

    d.push(' Z')

    return d.join('').replaceAll(/(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g, '$1')
  }

  /* -------------------------------------------------- */
  /*                   Browser and DOM                  */
  /* -------------------------------------------------- */

  static isMobile() {
    return isMobilePkg().any
  }

  // via https://github.com/bameyrick/throttle-typescript
  static throttle<T extends (...args: any) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => ReturnType<T> {
    let inThrottle: boolean
    let lastResult: ReturnType<T>

    return function (this: any, ...args: any[]): ReturnType<T> {
      if (!inThrottle) {
        inThrottle = true

        setTimeout(() => (inThrottle = false), limit)

        lastResult = func.apply(this, ...args)
      }

      return lastResult
    }
  }

  /**
   * Find whether the current display is a touch display.
   */
  static isTouchDisplay(): boolean {
    return (
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
    )
  }

  /**
   * Find whether the current device is a Mac / iOS / iPadOS.
   */
  static isDarwin(): boolean {
    return /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)
  }

  /**
   * Get whether an event is command (mac) or control (pc).
   * @param e
   */
  static metaKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
    return Utils.isDarwin() ? e.metaKey : e.ctrlKey
  }
}

export default Utils

// Helper types

export type DeepPartial<T> = T extends Function
  ? T
  : T extends object
  ? T extends unknown[]
    ? DeepPartial<T[number]>[]
    : { [P in keyof T]?: DeepPartial<T[P]> }
  : T

type Entry<T> = {
  [K in keyof T]: [K, T[K]]
}[keyof T]
