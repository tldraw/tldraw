import React from 'react'
import { Bounds, Edge, Corner, BezierCurveSegment, DashStyle } from 'types'
import { v4 as uuid } from 'uuid'
import vec from './vec'
import _isMobile from 'ismobilejs'
import { intersectPolygonBounds } from './intersections'

/* -------------------------------------------------- */
/*                    Math & Geometry                 */
/* -------------------------------------------------- */

/**
 * Linear interpolation betwen two numbers.
 * @param y1
 * @param y2
 * @param mu
 */
export function lerp(y1: number, y2: number, mu: number): number {
  mu = clamp(mu, 0, 1)
  return y1 * (1 - mu) + y2 * mu
}

/**
 * Modulate a value between two ranges.
 * @param value
 * @param rangeA from [low, high]
 * @param rangeB to [low, high]
 * @param clamp
 */
export function modulate(
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
export function clamp(n: number, min: number): number
export function clamp(n: number, min: number, max: number): number
export function clamp(n: number, min: number, max?: number): number {
  return Math.max(min, typeof max !== 'undefined' ? Math.min(n, max) : n)
}

// TODO: replace with a string compression algorithm
export function compress(s: string): string {
  return s
}

// TODO: replace with a string decompression algorithm
export function decompress(s: string): string {
  return s
}

/**
 * Recursively clone an object or array.
 * @param obj
 */
export function deepClone<T>(obj: T): T {
  if (obj === null) return null

  const clone: any = { ...obj }

  Object.keys(obj).forEach(
    (key) =>
      (clone[key] =
        typeof obj[key] === 'object' ? deepClone(obj[key]) : obj[key])
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
export function rng(seed = ''): () => number {
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

/* --------------- Circles and Angles --------------- */

/**
 * Get the outer of between a circle and a point.
 * @param C The circle's center.
 * @param r The circle's radius.
 * @param P The point.
 * @param side
 */
export function getCircleTangentToPoint(
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
export function getOuterTangentsOfCircles(
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
export function getClosestPointOnCircle(
  C: number[],
  r: number,
  P: number[]
): number[] {
  const v = vec.sub(C, P)
  return vec.sub(C, vec.mul(vec.div(v, vec.len(v)), r))
}

function det(
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
export function circleFromThreePoints(
  A: number[],
  B: number[],
  C: number[]
): number[] {
  const a = det(A[0], A[1], 1, B[0], B[1], 1, C[0], C[1], 1)

  const bx = -det(
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
  const by = det(
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
  const c = -det(
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
export function perimeterOfEllipse(rx: number, ry: number): number {
  const h = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2)
  const p = Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
  return p
}

/**
 * Get the short angle distance between two angles.
 * @param a0
 * @param a1
 */
export function shortAngleDist(a0: number, a1: number): number {
  const max = Math.PI * 2
  const da = (a1 - a0) % max
  return ((2 * da) % max) - da
}

/**
 * Get the long angle distance between two angles.
 * @param a0
 * @param a1
 */
export function longAngleDist(a0: number, a1: number): number {
  return Math.PI * 2 - shortAngleDist(a0, a1)
}

/**
 * Interpolate an angle between two angles.
 * @param a0
 * @param a1
 * @param t
 */
export function lerpAngles(a0: number, a1: number, t: number): number {
  return a0 + shortAngleDist(a0, a1) * t
}

/**
 * Get the short distance between two angles.
 * @param a0
 * @param a1
 */
export function angleDelta(a0: number, a1: number): number {
  return shortAngleDist(a0, a1)
}

/**
 * Get the "sweep" or short distance between two points on a circle's perimeter.
 * @param C
 * @param A
 * @param B
 */
export function getSweep(C: number[], A: number[], B: number[]): number {
  return angleDelta(vec.angle(C, A), vec.angle(C, B))
}

/**
 * Rotate a point around a center.
 * @param x The x-axis coordinate of the point.
 * @param y The y-axis coordinate of the point.
 * @param cx The x-axis coordinate of the point to rotate round.
 * @param cy The y-axis coordinate of the point to rotate round.
 * @param angle The distance (in radians) to rotate.
 */
export function rotatePoint(A: number[], B: number[], angle: number): number[] {
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
export function clampRadians(r: number): number {
  return (Math.PI * 2 + r) % (Math.PI * 2)
}

/**
 * Clamp rotation to even segments.
 * @param r
 * @param segments
 */
export function clampToRotationToSegments(r: number, segments: number): number {
  const seg = (Math.PI * 2) / segments
  return Math.floor((clampRadians(r) + seg / 2) / seg) * seg
}

/**
 * Is angle c between angles a and b?
 * @param a
 * @param b
 * @param c
 */
export function isAngleBetween(a: number, b: number, c: number): boolean {
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
export function degreesToRadians(d: number): number {
  return (d * Math.PI) / 180
}

/**
 * Convert radians to degrees.
 * @param r
 */
export function radiansToDegrees(r: number): number {
  return (r * 180) / Math.PI
}

/**
 * Get the length of an arc between two points on a circle's perimeter.
 * @param C
 * @param r
 * @param A
 * @param B
 */
export function getArcLength(
  C: number[],
  r: number,
  A: number[],
  B: number[]
): number {
  const sweep = getSweep(C, A, B)
  return r * (2 * Math.PI) * (sweep / (2 * Math.PI))
}

/**
 * Get balanced dash-strokearray and dash-strokeoffset properties for a path of a given length.
 * @param length The length of the path.
 * @param strokeWidth The shape's stroke-width property.
 * @param style The stroke's style: "dashed" or "dotted" (default "dashed").
 * @param snap An interval for dashes (e.g. 4 will produce arrays with 4, 8, 16, etc dashes).
 */
export function getPerfectDashProps(
  length: number,
  strokeWidth: number,
  style: DashStyle,
  snap = 1
): {
  strokeDasharray: string
  strokeDashoffset: string
} {
  let dashLength: number
  let strokeDashoffset: string
  let ratio: number

  if (style === DashStyle.Solid || style === DashStyle.Draw) {
    return {
      strokeDasharray: 'none',
      strokeDashoffset: 'none',
    }
  } else if (style === DashStyle.Dashed) {
    dashLength = strokeWidth * 2
    ratio = 1
    strokeDashoffset = (dashLength / 2).toString()
  } else {
    dashLength = strokeWidth / 100
    ratio = 100
    strokeDashoffset = '0'
  }

  let dashes = Math.floor(length / dashLength / (2 * ratio))
  dashes -= dashes % snap
  if (dashes === 0) dashes = 1

  const gapLength = (length - dashes * dashLength) / dashes

  return {
    strokeDasharray: [dashLength, gapLength].join(' '),
    strokeDashoffset,
  }
}

/**
 * Get a dash offset for an arc, based on its length.
 * @param C
 * @param r
 * @param A
 * @param B
 * @param step
 */
export function getArcDashOffset(
  C: number[],
  r: number,
  A: number[],
  B: number[],
  step: number
): number {
  const del0 = getSweep(C, A, B)
  const len0 = getArcLength(C, r, A, B)
  const off0 = del0 < 0 ? len0 : 2 * Math.PI * C[2] - len0
  return -off0 / 2 + step
}

/**
 * Get a dash offset for an ellipse, based on its length.
 * @param A
 * @param step
 */
export function getEllipseDashOffset(A: number[], step: number): number {
  const c = 2 * Math.PI * A[2]
  return -c / 2 + -step
}

/* --------------- Curves and Splines --------------- */

/**
 * Get bezier curve segments that pass through an array of points.
 * @param points
 * @param tension
 */
export function getBezierCurveSegments(
  points: number[][],
  tension = 0.4
): BezierCurveSegment[] {
  const len = points.length,
    cpoints: number[][] = [...points]

  if (len < 2) {
    throw Error('Curve must have at least two points.')
  }

  for (let i = 1; i < len - 1; i++) {
    const p0 = points[i - 1],
      p1 = points[i],
      p2 = points[i + 1]

    const pdx = p2[0] - p0[0],
      pdy = p2[1] - p0[1],
      pd = Math.hypot(pdx, pdy),
      nx = pdx / pd, // normalized x
      ny = pdy / pd, // normalized y
      dp = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), // Distance to previous
      dn = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) // Distance to next

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

  const results: BezierCurveSegment[] = []

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
export function computePointOnCurve(t: number, points: number[][]): number[] {
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

  if (order < 4) {
    const mt2 = mt * mt,
      t2 = t * t

    let a: number,
      b: number,
      c: number,
      d = 0

    if (order === 2) {
      p = [p[0], p[1], p[2], [0, 0]]
      a = mt2
      b = mt * t * 2
      c = t2
    } else if (order === 3) {
      a = mt2 * mt
      b = mt2 * t * 3
      c = mt * t2 * 3
      d = t * t2
    }

    return [
      a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0],
      a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1],
    ]
  } // higher order curves: use de Casteljau's computation
}

/**
 * Evaluate a 2d cubic bezier at a point t on the x axis.
 * @param tx
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 */
export function cubicBezier(
  tx: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  // Inspired by Don Lancaster's two articles
  // http://www.tinaja.com/glib/cubemath.pdf
  // http://www.tinaja.com/text/bezmath.html

  // Set start and end point
  const x0 = 0,
    y0 = 0,
    x3 = 1,
    y3 = 1,
    // Convert the coordinates to equation space
    A = x3 - 3 * x2 + 3 * x1 - x0,
    B = 3 * x2 - 6 * x1 + 3 * x0,
    C = 3 * x1 - 3 * x0,
    D = x0,
    E = y3 - 3 * y2 + 3 * y1 - y0,
    F = 3 * y2 - 6 * y1 + 3 * y0,
    G = 3 * y1 - 3 * y0,
    H = y0,
    // Variables for the loop below
    iterations = 5

  let i: number,
    slope: number,
    x: number,
    t = tx

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
export function getSpline(
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
export function getCurvePoints(
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
export function simplify(points: number[][], tolerance = 1): number[][] {
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
        d = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / max

      if (distance > d) continue

      distance = d
      index = i
    }

    if (distance > tolerance) {
      const l0 = simplify(points.slice(0, index + 1), tolerance)
      const l1 = simplify(points.slice(index + 1), tolerance)
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
export function pointInCircle(A: number[], C: number[], r: number): boolean {
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
): boolean {
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
 * @param A
 * @param point
 * @param size
 */
export function pointInRect(
  A: number[],
  point: number[],
  size: number[]
): boolean {
  return !(
    point[0] < point[0] ||
    point[0] > point[0] + size[0] ||
    point[1] < point[1] ||
    point[1] > point[1] + size[1]
  )
}

/* --------------------- Bounds --------------------- */

/**
 * Get whether a point is inside of a bounds.
 * @param A
 * @param b
 * @returns
 */
export function pointInBounds(A: number[], b: Bounds): boolean {
  return !(A[0] < b.minX || A[0] > b.maxX || A[1] < b.minY || A[1] > b.maxY)
}

/**
 * Get whether two bounds collide.
 * @param a Bounds
 * @param b Bounds
 * @returns
 */
export function boundsCollide(a: Bounds, b: Bounds): boolean {
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
export function boundsContain(a: Bounds, b: Bounds): boolean {
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
export function boundsContained(a: Bounds, b: Bounds): boolean {
  return boundsContain(b, a)
}

/**
 * Get whether a set of points are all contained by a bounding box.
 * @returns
 */
export function boundsContainPolygon(a: Bounds, points: number[][]): boolean {
  return points.every((point) => pointInBounds(point, a))
}

/**
 * Get whether a polygon collides a bounding box.
 * @param points
 * @param b
 */
export function boundsCollidePolygon(a: Bounds, points: number[][]): boolean {
  return intersectPolygonBounds(points, a).length > 0
}

/**
 * Get whether two bounds are identical.
 * @param a Bounds
 * @param b Bounds
 * @returns
 */
export function boundsAreEqual(a: Bounds, b: Bounds): boolean {
  return !(
    b.maxX !== a.maxX ||
    b.minX !== a.minX ||
    b.maxY !== a.maxY ||
    b.minY !== a.minY
  )
}

/**
 * Find a bounding box from an array of points.
 * @param points
 * @param rotation (optional) The bounding box's rotation.
 */
export function getBoundsFromPoints(points: number[][], rotation = 0): Bounds {
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
    return getBoundsFromPoints(
      points.map((pt) =>
        vec.rotWith(pt, [(minX + maxX) / 2, (minY + maxY) / 2], rotation)
      )
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
 * Move a bounding box without recalculating it.
 * @param bounds
 * @param delta
 * @returns
 */
export function translateBounds(bounds: Bounds, delta: number[]): Bounds {
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
export function rotateBounds(
  bounds: Bounds,
  center: number[],
  rotation: number
): Bounds {
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
export function getRotatedEllipseBounds(
  x: number,
  y: number,
  rx: number,
  ry: number,
  rotation: number
): Bounds {
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
export function getExpandedBounds(a: Bounds, b: Bounds): Bounds {
  const minX = Math.min(a.minX, b.minX),
    minY = Math.min(a.minY, b.minY),
    maxX = Math.max(a.maxX, b.maxX),
    maxY = Math.max(a.maxY, b.maxY),
    width = Math.abs(maxX - minX),
    height = Math.abs(maxY - minY)

  return { minX, minY, maxX, maxY, width, height }
}

/**
 * Get the common bounds of a group of bounds.
 * @returns
 */
export function getCommonBounds(...b: Bounds[]): Bounds {
  if (b.length < 2) return b[0]

  let bounds = b[0]

  for (let i = 1; i < b.length; i++) {
    bounds = getExpandedBounds(bounds, b[i])
  }

  return bounds
}

export function getRotatedCorners(b: Bounds, rotation: number): number[][] {
  const center = [b.minX + b.width / 2, b.minY + b.height / 2]

  return [
    [b.minX, b.minY],
    [b.maxX, b.minY],
    [b.maxX, b.maxY],
    [b.minX, b.maxY],
  ].map((point) => vec.rotWith(point, center, rotation))
}

export function getTransformedBoundingBox(
  bounds: Bounds,
  handle: Corner | Edge | 'center',
  delta: number[],
  rotation = 0,
  isAspectRatioLocked = false
): Bounds & { scaleX: number; scaleY: number } {
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
    case Edge.Top:
    case Corner.TopLeft:
    case Corner.TopRight: {
      by0 += dy
      break
    }
    case Edge.Bottom:
    case Corner.BottomLeft:
    case Corner.BottomRight: {
      by1 += dy
      break
    }
  }

  switch (handle) {
    case Edge.Left:
    case Corner.TopLeft:
    case Corner.BottomLeft: {
      bx0 += dx
      break
    }
    case Edge.Right:
    case Corner.TopRight:
    case Corner.BottomRight: {
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
      case Corner.TopLeft: {
        if (isTall) by0 = by1 + tw
        else bx0 = bx1 + th
        break
      }
      case Corner.TopRight: {
        if (isTall) by0 = by1 + tw
        else bx1 = bx0 - th
        break
      }
      case Corner.BottomRight: {
        if (isTall) by1 = by0 - tw
        else bx1 = bx0 - th
        break
      }
      case Corner.BottomLeft: {
        if (isTall) by1 = by0 - tw
        else bx0 = bx1 + th
        break
      }
      case Edge.Bottom:
      case Edge.Top: {
        const m = (bx0 + bx1) / 2
        const w = bh * ar
        bx0 = m - w / 2
        bx1 = m + w / 2
        break
      }
      case Edge.Left:
      case Edge.Right: {
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
      case Corner.TopLeft: {
        cv = vec.sub(
          vec.rotWith([bx1, by1], c1, rotation),
          vec.rotWith([ax1, ay1], c0, rotation)
        )
        break
      }
      case Corner.TopRight: {
        cv = vec.sub(
          vec.rotWith([bx0, by1], c1, rotation),
          vec.rotWith([ax0, ay1], c0, rotation)
        )
        break
      }
      case Corner.BottomRight: {
        cv = vec.sub(
          vec.rotWith([bx0, by0], c1, rotation),
          vec.rotWith([ax0, ay0], c0, rotation)
        )
        break
      }
      case Corner.BottomLeft: {
        cv = vec.sub(
          vec.rotWith([bx1, by0], c1, rotation),
          vec.rotWith([ax1, ay0], c0, rotation)
        )
        break
      }
      case Edge.Top: {
        cv = vec.sub(
          vec.rotWith(vec.med([bx0, by1], [bx1, by1]), c1, rotation),
          vec.rotWith(vec.med([ax0, ay1], [ax1, ay1]), c0, rotation)
        )
        break
      }
      case Edge.Left: {
        cv = vec.sub(
          vec.rotWith(vec.med([bx1, by0], [bx1, by1]), c1, rotation),
          vec.rotWith(vec.med([ax1, ay0], [ax1, ay1]), c0, rotation)
        )
        break
      }
      case Edge.Bottom: {
        cv = vec.sub(
          vec.rotWith(vec.med([bx0, by0], [bx1, by0]), c1, rotation),
          vec.rotWith(vec.med([ax0, ay0], [ax1, ay0]), c0, rotation)
        )
        break
      }
      case Edge.Right: {
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

export function getTransformAnchor(
  type: Edge | Corner,
  isFlippedX: boolean,
  isFlippedY: boolean
): Corner | Edge {
  let anchor: Corner | Edge = type

  // Change corner anchors if flipped
  switch (type) {
    case Corner.TopLeft: {
      if (isFlippedX && isFlippedY) {
        anchor = Corner.BottomRight
      } else if (isFlippedX) {
        anchor = Corner.TopRight
      } else if (isFlippedY) {
        anchor = Corner.BottomLeft
      } else {
        anchor = Corner.BottomRight
      }
      break
    }
    case Corner.TopRight: {
      if (isFlippedX && isFlippedY) {
        anchor = Corner.BottomLeft
      } else if (isFlippedX) {
        anchor = Corner.TopLeft
      } else if (isFlippedY) {
        anchor = Corner.BottomRight
      } else {
        anchor = Corner.BottomLeft
      }
      break
    }
    case Corner.BottomRight: {
      if (isFlippedX && isFlippedY) {
        anchor = Corner.TopLeft
      } else if (isFlippedX) {
        anchor = Corner.BottomLeft
      } else if (isFlippedY) {
        anchor = Corner.TopRight
      } else {
        anchor = Corner.TopLeft
      }
      break
    }
    case Corner.BottomLeft: {
      if (isFlippedX && isFlippedY) {
        anchor = Corner.TopRight
      } else if (isFlippedX) {
        anchor = Corner.BottomRight
      } else if (isFlippedY) {
        anchor = Corner.TopLeft
      } else {
        anchor = Corner.TopRight
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
export function getRelativeTransformedBoundingBox(
  bounds: Bounds,
  initialBounds: Bounds,
  initialShapeBounds: Bounds,
  isFlippedX: boolean,
  isFlippedY: boolean
): Bounds {
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
export function getRotatedSize(size: number[], rotation: number): number[] {
  const center = vec.div(size, 2)

  const points = [[0, 0], [size[0], 0], size, [0, size[1]]].map((point) =>
    vec.rotWith(point, center, rotation)
  )

  const bounds = getBoundsFromPoints(points)

  return [bounds.width, bounds.height]
}

/**
 * Get the center of a bounding box.
 * @param bounds
 */
export function getBoundsCenter(bounds: Bounds): number[] {
  return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
}

/* -------------------------------------------------- */
/*                Lists and Collections               */
/* -------------------------------------------------- */

/**
 * Get a unique string id.
 */
export function uniqueId(): string {
  return uuid()
}

/**
 * Shuffle the contents of an array.
 * @param arr
 * @param offset
 */
export function shuffleArr<T>(arr: T[], offset: number): T[] {
  return arr.map((_, i) => arr[(i + offset) % arr.length])
}

/**
 * Deep compare two arrays.
 * @param a
 * @param b
 */
export function deepCompareArrays<T>(a: T[], b: T[]): boolean {
  if (a?.length !== b?.length) return false
  return deepCompare(a, b)
}

/**
 * Deep compare any values.
 * @param a
 * @param b
 */
export function deepCompare<T>(a: T, b: T): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Find whether two arrays intersect.
 * @param a
 * @param b
 * @param fn An optional function to apply to the items of a; will check if b includes the result.
 */
export function arrsIntersect<T, K>(
  a: T[],
  b: K[],
  fn?: (item: K) => T
): boolean
export function arrsIntersect<T>(a: T[], b: T[]): boolean
export function arrsIntersect<T>(
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
export function uniqueArray<T extends string | number>(...items: T[]): T[] {
  return Array.from(new Set(items).values())
}

/**
 * Convert a set to an array.
 * @param set
 */
export function setToArray<T>(set: Set<T>): T[] {
  return Array.from(set.values())
}

/* -------------------------------------------------- */
/*                   Browser and DOM                  */
/* -------------------------------------------------- */

/**
 * Find whether the current display is a touch display.
 */
export function isTouchDisplay(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  )
}

/**
 * Find whether the current device is a Mac / iOS / iPadOS.
 */
export function isDarwin(): boolean {
  return /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)
}

/**
 * Get whether the current device is a mobile device.
 */
export function isMobile(): boolean {
  return _isMobile().any
}

/**
 * Get whether an event is command (mac) or control (pc).
 * @param e
 */
export function metaKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return isDarwin() ? e.metaKey : e.ctrlKey
}

/**
 * Find the closest point on a SVG path to an off-path point.
 * @param pathNode
 * @param point
 * @returns
 */
export function getClosestPointOnSVGPath(
  pathNode: SVGPathElement,
  point: number[]
): {
  point: number[]
  distance: number
  length: number
  t: number
} {
  function distance2(p: DOMPoint, point: number[]) {
    const dx = p.x - point[0],
      dy = p.y - point[1]
    return dx * dx + dy * dy
  }

  const pathLen = pathNode.getTotalLength()

  let p = 8,
    best: DOMPoint,
    bestLen: number,
    bestDist = Infinity,
    bl: number,
    al: number

  // linear scan for coarse approximation
  for (
    let scan: DOMPoint, scanLen = 0, scanDist: number;
    scanLen <= pathLen;
    scanLen += p
  ) {
    if (
      (scanDist = distance2(
        (scan = pathNode.getPointAtLength(scanLen)),
        point
      )) < bestDist
    ) {
      ;(best = scan), (bestLen = scanLen), (bestDist = scanDist)
    }
  }

  // binary search for precise estimate
  p /= 2

  while (p > 0.5) {
    let before: DOMPoint, after: DOMPoint, bd: number, ad: number
    if (
      (bl = bestLen - p) >= 0 &&
      (bd = distance2((before = pathNode.getPointAtLength(bl)), point)) <
        bestDist
    ) {
      ;(best = before), (bestLen = bl), (bestDist = bd)
    } else if (
      (al = bestLen + p) <= pathLen &&
      (ad = distance2((after = pathNode.getPointAtLength(al)), point)) <
        bestDist
    ) {
      ;(best = after), (bestLen = al), (bestDist = ad)
    } else {
      p /= 2
    }
  }

  return {
    point: [best.x, best.y],
    distance: bestDist,
    length: (bl + al) / 2,
    t: (bl + al) / 2 / pathLen,
  }
}

/**
 * Send data to one of the current project's API endpoints.
 * @param endpoint
 * @param data
 */
export async function postJsonToEndpoint(
  endpoint: string,
  data: { [key: string]: unknown }
): Promise<{ [key: string]: any }> {
  const d = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_API_URL}/api/${endpoint}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  )

  return await d.json()
}

/**
 * Turn an array of points into a path of quadradic curves.
 * @param stroke ;
 */
export function getSvgPathFromStroke(stroke: number[][]): string {
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

  return d
    .join('')
    .replaceAll(/(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g, '$1')
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  waitFor: number
): (...args: Parameters<T>) => ReturnType<T> {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>): ReturnType<T> => {
    let result: any
    timeout && clearTimeout(timeout)
    timeout = setTimeout(() => {
      result = callback(...args)
    }, waitFor)
    return result
  }
}

/**
 * Get a precise point from an event.
 * @param e
 */
export function getPoint(
  e: PointerEvent | React.PointerEvent | Touch | React.Touch | WheelEvent
): number[] {
  return [
    Number(e.clientX.toPrecision(5)),
    Number(e.clientY.toPrecision(5)),
    'pressure' in e ? Number(e.pressure.toPrecision(5)) || 0.5 : 0.5,
  ]
}

export function commandKey(): string {
  return isDarwin() ? '⌘' : 'Ctrl'
}

// function getResizeOffset(a: Bounds, b: Bounds): number[] {
//   const { minX: x0, minY: y0, width: w0, height: h0 } = a
//   const { minX: x1, minY: y1, width: w1, height: h1 } = b

//   let delta: number[]

//   if (h0 === h1 && w0 !== w1) {
//     if (x0 !== x1) {
//       // moving left edge, pin right edge
//       delta = vec.sub([x1, y1 + h1 / 2], [x0, y0 + h0 / 2])
//     } else {
//       // moving right edge, pin left edge
//       delta = vec.sub([x1 + w1, y1 + h1 / 2], [x0 + w0, y0 + h0 / 2])
//     }
//   } else if (h0 !== h1 && w0 === w1) {
//     if (y0 !== y1) {
//       // moving top edge, pin bottom edge
//       delta = vec.sub([x1 + w1 / 2, y1], [x0 + w0 / 2, y0])
//     } else {
//       // moving bottom edge, pin top edge
//       delta = vec.sub([x1 + w1 / 2, y1 + h1], [x0 + w0 / 2, y0 + h0])
//     }
//   } else if (x0 !== x1) {
//     if (y0 !== y1) {
//       // moving top left, pin bottom right
//       delta = vec.sub([x1, y1], [x0, y0])
//     } else {
//       // moving bottom left, pin top right
//       delta = vec.sub([x1, y1 + h1], [x0, y0 + h0])
//     }
//   } else if (y0 !== y1) {
//     // moving top right, pin bottom left
//     delta = vec.sub([x1 + w1, y1], [x0 + w0, y0])
//   } else {
//     // moving bottom right, pin top left
//     delta = vec.sub([x1 + w1, y1 + h1], [x0 + w0, y0 + h0])
//   }

//   return delta
// }
