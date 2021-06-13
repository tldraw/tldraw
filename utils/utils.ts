import Vector from 'lib/code/vector'
import React from 'react'
import {
  Data,
  Bounds,
  Edge,
  Corner,
  Shape,
  ShapeStyles,
  GroupShape,
  ShapeType,
} from 'types'
import * as vec from './vec'
import _isMobile from 'ismobilejs'
import { getShapeUtils } from 'lib/shape-utils'

export function screenToWorld(point: number[], data: Data) {
  const camera = getCurrentCamera(data)
  return vec.sub(vec.div(point, camera.zoom), camera.point)
}

/**
 * Get a bounding box that includes two bounding boxes.
 * @param a Bounding box
 * @param b Bounding box
 * @returns
 */
export function getExpandedBounds(a: Bounds, b: Bounds) {
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
export function getCommonBounds(...b: Bounds[]) {
  if (b.length < 2) return b[0]

  let bounds = b[0]

  for (let i = 1; i < b.length; i++) {
    bounds = getExpandedBounds(bounds, b[i])
  }

  return bounds
}

// export function getBoundsFromTwoPoints(a: number[], b: number[]) {
//   const minX = Math.min(a[0], b[0])
//   const maxX = Math.max(a[0], b[0])
//   const minY = Math.min(a[1], b[1])
//   const maxY = Math.max(a[1], b[1])

//   return {
//     minX,
//     maxX,
//     minY,
//     maxY,
//     width: maxX - minX,
//     height: maxY - minY,
//   }
// }

// A helper for getting tangents.
export function getCircleTangentToPoint(
  A: number[],
  r0: number,
  P: number[],
  side: number
) {
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

export function circleCircleIntersections(a: number[], b: number[]) {
  const R = a[2],
    r = b[2]

  let dx = b[0] - a[0],
    dy = b[1] - a[1]

  const d = Math.sqrt(dx * dx + dy * dy),
    x = (d * d - r * r + R * R) / (2 * d),
    y = Math.sqrt(R * R - x * x)

  dx /= d
  dy /= d

  return [
    [a[0] + dx * x - dy * y, a[1] + dy * x + dx * y],
    [a[0] + dx * x + dy * y, a[1] + dy * x - dx * y],
  ]
}

export function getClosestPointOnCircle(
  C: number[],
  r: number,
  P: number[],
  padding = 0
) {
  const v = vec.sub(C, P)
  return vec.sub(C, vec.mul(vec.div(v, vec.len(v)), r + padding))
}

export function projectPoint(p0: number[], a: number, d: number) {
  return [Math.cos(a) * d + p0[0], Math.sin(a) * d + p0[1]]
}

function shortAngleDist(a0: number, a1: number) {
  const max = Math.PI * 2
  const da = (a1 - a0) % max
  return ((2 * da) % max) - da
}

export function lerpAngles(a0: number, a1: number, t: number) {
  return a0 + shortAngleDist(a0, a1) * t
}

export function getBezierCurveSegments(points: number[][], tension = 0.4) {
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

  const results: {
    start: number[]
    tangentStart: number[]
    normalStart: number[]
    pressureStart: number
    end: number[]
    tangentEnd: number[]
    normalEnd: number[]
    pressureEnd: number
  }[] = []

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

export function cubicBezier(
  tx: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
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

export function copyToClipboard(string: string) {
  let textarea: HTMLTextAreaElement
  let result: boolean

  try {
    navigator.clipboard.writeText(string)
  } catch (e) {
    try {
      textarea = document.createElement('textarea')
      textarea.setAttribute('position', 'fixed')
      textarea.setAttribute('top', '0')
      textarea.setAttribute('readonly', 'true')
      textarea.setAttribute('contenteditable', 'true')
      textarea.style.position = 'fixed' // prevent scroll from jumping to the bottom when focus is set.
      textarea.value = string

      document.body.appendChild(textarea)

      textarea.focus()
      textarea.select()

      const range = document.createRange()
      range.selectNodeContents(textarea)

      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)

      textarea.setSelectionRange(0, textarea.value.length)
      result = document.execCommand('copy')
    } catch (err) {
      result = null
    } finally {
      document.body.removeChild(textarea)
    }
  }

  return !!result
}

/**
 * Get a bezier curve data to for a spline that fits an array of points.
 * @param points An array of points formatted as [x, y]
 * @param k Tension
 * @returns An array of points as [cp1x, cp1y, cp2x, cp2y, px, py].
 */
export function getSpline(pts: number[][], k = 0.5) {
  let p0: number[],
    [p1, p2, p3] = pts

  const results: number[][] = []

  for (let i = 1, len = pts.length; i < len; i++) {
    p0 = p1
    p1 = p2
    p2 = p3
    p3 = pts[i + 2] ? pts[i + 2] : p2
    results.push([
      p1[0] + ((p2[0] - p0[0]) / 6) * k,
      p1[1] + ((p2[1] - p0[1]) / 6) * k,
      p2[0] - ((p3[0] - p1[0]) / 6) * k,
      p2[1] - ((p3[1] - p1[1]) / 6) * k,
      pts[i][0],
      pts[i][1],
    ])
  }

  return results
}

export function getCurvePoints(
  pts: number[][],
  tension = 0.5,
  isClosed = false,
  numOfSegments = 3
) {
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

export function angleDelta(a0: number, a1: number) {
  return shortAngleDist(a0, a1)
}

/**
 * Rotate a point around a center.
 * @param x The x-axis coordinate of the point.
 * @param y The y-axis coordinate of the point.
 * @param cx The x-axis coordinate of the point to rotate round.
 * @param cy The y-axis coordinate of the point to rotate round.
 * @param angle The distance (in radians) to rotate.
 */
export function rotatePoint(A: number[], B: number[], angle: number) {
  const s = Math.sin(angle)
  const c = Math.cos(angle)

  const px = A[0] - B[0]
  const py = A[1] - B[1]

  const nx = px * c - py * s
  const ny = px * s + py * c

  return [nx + B[0], ny + B[1]]
}

export function degreesToRadians(d: number) {
  return (d * Math.PI) / 180
}

export function radiansToDegrees(r: number) {
  return (r * 180) / Math.PI
}

export function getArcLength(C: number[], r: number, A: number[], B: number[]) {
  const sweep = getSweep(C, A, B)
  return r * (2 * Math.PI) * (sweep / (2 * Math.PI))
}

export function getArcDashOffset(
  C: number[],
  r: number,
  A: number[],
  B: number[],
  step: number
) {
  const del0 = getSweep(C, A, B)
  const len0 = getArcLength(C, r, A, B)
  const off0 = del0 < 0 ? len0 : 2 * Math.PI * C[2] - len0
  return -off0 / 2 + step
}

export function getEllipseDashOffset(A: number[], step: number) {
  const c = 2 * Math.PI * A[2]
  return -c / 2 + -step
}

export function getSweep(C: number[], A: number[], B: number[]) {
  return angleDelta(vec.angle(C, A), vec.angle(C, B))
}

export function deepCompareArrays<T>(a: T[], b: T[]) {
  if (a?.length !== b?.length) return false
  return deepCompare(a, b)
}

export function deepCompare<T>(a: T, b: T) {
  return a === b || JSON.stringify(a) === JSON.stringify(b)
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
export function getOuterTangents(
  C0: number[],
  r0: number,
  C1: number[],
  r1: number
) {
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
) {
  return a.some((item) => b.includes(fn ? fn(item) : item))
}

// /**
//  * Will mutate an array to remove items.
//  * @param arr
//  * @param item
//  */
// export function pull<T>(arr: T[], ...items: T[]) {
//   for (let item of items) {
//     arr.splice(arr.indexOf(item), 1)
//   }
//   return arr
// }

// /**
//  * Will mutate an array to remove items, based on a function
//  * @param arr
//  * @param fn
//  * @returns
//  */
// export function pullWith<T>(arr: T[], fn: (item: T) => boolean) {
//   pull(arr, ...arr.filter((item) => fn(item)))
//   return arr
// }

// export function rectContainsRect(
//   x0: number,
//   y0: number,
//   x1: number,
//   y1: number,
//   box: { x: number; y: number; width: number; height: number }
// ) {
//   return !(
//     x0 > box.x ||
//     x1 < box.x + box.width ||
//     y0 > box.y ||
//     y1 < box.y + box.height
//   )
// }

export function getTouchDisplay() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  )
}

const rounds = [1, 10, 100, 1000]

export function round(n: number, p = 2) {
  return Math.floor(n * rounds[p]) / rounds[p]
}

/**
 * Linear interpolation betwen two numbers.
 * @param y1
 * @param y2
 * @param mu
 */
export function lerp(y1: number, y2: number, mu: number) {
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
) {
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

// CURVES
// Mostly adapted from https://github.com/Pomax/bezierjs

export function computePointOnCurve(t: number, points: number[][]) {
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

function distance2(p: DOMPoint, point: number[]) {
  const dx = p.x - point[0],
    dy = p.y - point[1]
  return dx * dx + dy * dy
}

/**
 * Find the closest point on a path to an off-path point.
 * @param pathNode
 * @param point
 * @returns
 */
export function getClosestPointOnPath(
  pathNode: SVGPathElement,
  point: number[]
) {
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

export function det(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number
) {
  return a * e * i + b * f * g + c * d * h - a * f * h - b * d * i - c * e * g
}

/**
 * Get a circle from three points.
 * @param p0
 * @param p1
 * @param center
 * @returns [x, y, r]
 */
export function circleFromThreePoints(A: number[], B: number[], C: number[]) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<P extends any[], T extends (...args: P) => any>(
  fn: T,
  wait: number,
  preventDefault?: boolean
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inThrottle: boolean, lastFn: any, lastTime: number
  return function (...args: P) {
    if (preventDefault) args[0].preventDefault()
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context = this
    if (!inThrottle) {
      fn.apply(context, args)
      lastTime = Date.now()
      inThrottle = true
    } else {
      clearTimeout(lastFn)
      lastFn = setTimeout(function () {
        if (Date.now() - lastTime >= wait) {
          fn.apply(context, args)
          lastTime = Date.now()
        }
      }, Math.max(wait - (Date.now() - lastTime), 0))
    }
  }
}

export function getCameraZoom(zoom: number) {
  return clamp(zoom, 0.1, 5)
}

export function pointInRect(
  point: number[],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
) {
  return !(
    point[0] < minX ||
    point[0] > maxX ||
    point[1] < minY ||
    point[1] > maxY
  )
}

/**
 * Get the intersection of two rays, with origin points p0 and p1, and direction vectors n0 and n1.
 * @param p0 The origin point of the first ray
 * @param n0 The direction vector of the first ray
 * @param p1 The origin point of the second ray
 * @param n1 The direction vector of the second ray
 * @returns
 */
export function getRayRayIntersection(
  p0: number[],
  n0: number[],
  p1: number[],
  n1: number[]
) {
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

export async function postJsonToEndpoint(
  endpoint: string,
  data: { [key: string]: unknown }
) {
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

export function getKeyboardEventInfo(e: KeyboardEvent | React.KeyboardEvent) {
  const { shiftKey, ctrlKey, metaKey, altKey } = e
  return {
    key: e.key,
    shiftKey,
    ctrlKey,
    metaKey: isDarwin() ? metaKey : ctrlKey,
    altKey,
  }
}

export function isDarwin() {
  return /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)
}

export function metaKey(e: KeyboardEvent | React.KeyboardEvent) {
  return isDarwin() ? e.metaKey : e.ctrlKey
}

export function getTransformAnchor(
  type: Edge | Corner,
  isFlippedX: boolean,
  isFlippedY: boolean
) {
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

export function vectorToPoint(point: number[] | Vector | undefined) {
  if (typeof point === 'undefined') {
    return [0, 0]
  }

  if (point instanceof Vector) {
    return [point.x, point.y]
  }
  return point
}

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
    for (let [x, y] of points) {
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
export function translateBounds(bounds: Bounds, delta: number[]) {
  return {
    minX: bounds.minX + delta[0],
    minY: bounds.minY + delta[1],
    maxX: bounds.maxX + delta[0],
    maxY: bounds.maxY + delta[1],
    width: bounds.width,
    height: bounds.height,
  }
}

export function rotateBounds(
  bounds: Bounds,
  center: number[],
  rotation: number
) {
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

export function getRotatedSize(size: number[], rotation: number) {
  const center = vec.div(size, 2)

  const points = [[0, 0], [size[0], 0], size, [0, size[1]]].map((point) =>
    vec.rotWith(point, center, rotation)
  )

  const bounds = getBoundsFromPoints(points)

  return [bounds.width, bounds.height]
}

export function getRotatedCorners(b: Bounds, rotation: number) {
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
) {
  // Create top left and bottom right corners.
  let [ax0, ay0] = [bounds.minX, bounds.minY]
  let [ax1, ay1] = [bounds.maxX, bounds.maxY]

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
  let [dx, dy] = vec.rot(delta, -rotation)

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

export function getRelativeTransformedBoundingBox(
  bounds: Bounds,
  initialBounds: Bounds,
  initialShapeBounds: Bounds,
  isFlippedX: boolean,
  isFlippedY: boolean
) {
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

export function getShape(
  data: Data,
  shapeId: string,
  pageId = data.currentPageId
) {
  return data.document.pages[pageId].shapes[shapeId]
}

export function getPage(data: Data, pageId = data.currentPageId) {
  return data.document.pages[pageId]
}

export function getPageState(data: Data, pageId = data.currentPageId) {
  return data.pageStates[pageId]
}

export function getCurrentCode(data: Data, fileId = data.currentCodeFileId) {
  return data.document.code[fileId]
}

export function getShapes(data: Data, pageId = data.currentPageId) {
  const page = getPage(data, pageId)
  return Object.values(page.shapes)
}

export function getSelectedShapes(data: Data, pageId = data.currentPageId) {
  const page = getPage(data, pageId)
  const ids = setToArray(getSelectedIds(data))
  return ids.map((id) => page.shapes[id])
}

export function getSelectedBounds(data: Data) {
  return getCommonBounds(
    ...getSelectedShapes(data).map((shape) =>
      getShapeUtils(shape).getBounds(shape)
    )
  )
}

export function isMobile() {
  return _isMobile().any
}

export function getRotatedBounds(shape: Shape) {
  return getShapeUtils(shape).getRotatedBounds(shape)
}

export function getShapeBounds(shape: Shape) {
  return getShapeUtils(shape).getBounds(shape)
}

export function getBoundsCenter(bounds: Bounds) {
  return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
}

export function clampRadians(r: number) {
  return (Math.PI * 2 + r) % (Math.PI * 2)
}

export function clampToRotationToSegments(r: number, segments: number) {
  const seg = (Math.PI * 2) / segments
  return Math.floor((clampRadians(r) + seg / 2) / seg) * seg
}

export function getParent(data: Data, id: string, pageId = data.currentPageId) {
  const page = getPage(data, pageId)
  const shape = page.shapes[id]

  return page.shapes[shape.parentId] || data.document.pages[shape.parentId]
}

export function getChildren(
  data: Data,
  id: string,
  pageId = data.currentPageId
) {
  const page = getPage(data, pageId)
  return Object.values(page.shapes)
    .filter(({ parentId }) => parentId === id)
    .sort((a, b) => a.childIndex - b.childIndex)
}

export function getSiblings(
  data: Data,
  id: string,
  pageId = data.currentPageId
) {
  const page = getPage(data, pageId)
  const shape = page.shapes[id]

  return Object.values(page.shapes)
    .filter(({ parentId }) => parentId === shape.parentId)
    .sort((a, b) => a.childIndex - b.childIndex)
}

export function getChildIndexAbove(
  data: Data,
  id: string,
  pageId = data.currentPageId
) {
  const page = getPage(data, pageId)

  const shape = page.shapes[id]

  const siblings = Object.values(page.shapes)
    .filter(({ parentId }) => parentId === shape.parentId)
    .sort((a, b) => a.childIndex - b.childIndex)

  const index = siblings.indexOf(shape)

  const nextSibling = siblings[index + 1]

  if (!nextSibling) {
    return shape.childIndex + 1
  }

  let nextIndex = (shape.childIndex + nextSibling.childIndex) / 2

  if (nextIndex === nextSibling.childIndex) {
    forceIntegerChildIndices(siblings)
    nextIndex = (shape.childIndex + nextSibling.childIndex) / 2
  }

  return nextIndex
}

export function getChildIndexBelow(
  data: Data,
  id: string,
  pageId = data.currentPageId
) {
  const page = getPage(data, pageId)

  const shape = page.shapes[id]

  const siblings = Object.values(page.shapes)
    .filter(({ parentId }) => parentId === shape.parentId)
    .sort((a, b) => a.childIndex - b.childIndex)

  const index = siblings.indexOf(shape)

  const prevSibling = siblings[index - 1]

  if (!prevSibling) {
    return shape.childIndex / 2
  }

  let nextIndex = (shape.childIndex + prevSibling.childIndex) / 2

  if (nextIndex === prevSibling.childIndex) {
    forceIntegerChildIndices(siblings)
    nextIndex = (shape.childIndex + prevSibling.childIndex) / 2
  }

  return (shape.childIndex + prevSibling.childIndex) / 2
}

export function forceIntegerChildIndices(shapes: Shape[]) {
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i]
    getShapeUtils(shape).setProperty(shape, 'childIndex', i + 1)
  }
}
export function setZoomCSS(zoom: number) {
  document.documentElement.style.setProperty('--camera-zoom', zoom.toString())
}

export function getCurrent<T extends object>(source: T): T {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value])
  ) as T
}

/**
 * Simplify a line (using Ramer-Douglas-Peucker algorithm).
 * @param points An array of points as [x, y, ...][]
 * @param tolerance The minimum line distance (also called epsilon).
 * @returns Simplified array as [x, y, ...][]
 */
export function simplify(points: number[][], tolerance = 1) {
  const len = points.length,
    a = points[0],
    b = points[len - 1],
    [x1, y1] = a,
    [x2, y2] = b

  if (len > 2) {
    let distance = 0,
      index = 0,
      max = Math.hypot(y2 - y1, x2 - x1)

    for (let i = 1; i < len - 1; i++) {
      const [x0, y0] = points[i],
        d = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / max

      if (distance > d) continue

      distance = d
      index = i
    }

    if (distance > tolerance) {
      let l0 = simplify(points.slice(0, index + 1), tolerance)
      let l1 = simplify(points.slice(index + 1), tolerance)
      return l0.concat(l1.slice(1))
    }
  }

  return [a, b]
}

export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return ''

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )

  d.push('Z')
  return d.join(' ')
}

const PI2 = Math.PI * 2

/**
 * Is angle c between angles a and b?
 * @param a
 * @param b
 * @param c
 */
export function isAngleBetween(a: number, b: number, c: number) {
  if (c === a || c === b) return true
  const AB = (b - a + PI2) % PI2
  const AC = (c - a + PI2) % PI2
  return AB <= Math.PI !== AC > AB
}

export function getCurrentCamera(data: Data) {
  return data.pageStates[data.currentPageId].camera
}

// export function updateChildren(data: Data, changedShapes: Shape[]) {
//   if (changedShapes.length === 0) return
//   const { shapes } = getPage(data)

//   changedShapes.forEach((shape) => {
//     if (shape.type === ShapeType.Group) {
//       for (let childId of shape.children) {
//         const childShape = shapes[childId]
//         getShapeUtils(childShape).translateBy(childShape, deltaForShape)
//       }
//     }
//   })
// }

/* --------------------- Groups --------------------- */

export function updateParents(data: Data, changedShapeIds: string[]) {
  if (changedShapeIds.length === 0) return

  const { shapes } = getPage(data)

  const parentToUpdateIds = Array.from(
    new Set(changedShapeIds.map((id) => shapes[id].parentId).values())
  ).filter((id) => id !== data.currentPageId)

  for (const parentId of parentToUpdateIds) {
    const parent = shapes[parentId] as GroupShape

    getShapeUtils(parent).onChildrenChange(
      parent,
      parent.children.map((id) => shapes[id])
    )
  }

  updateParents(data, parentToUpdateIds)
}

export function getParentOffset(data: Data, shapeId: string, offset = [0, 0]) {
  const shape = getShape(data, shapeId)
  return shape.parentId === data.currentPageId
    ? offset
    : getParentOffset(data, shape.parentId, vec.add(offset, shape.point))
}

export function getParentRotation(
  data: Data,
  shapeId: string,
  rotation = 0
): number {
  const shape = getShape(data, shapeId)
  return shape.parentId === data.currentPageId
    ? rotation + shape.rotation
    : getParentRotation(data, shape.parentId, rotation + shape.rotation)
}

export function getDocumentBranch(data: Data, id: string): string[] {
  const shape = getPage(data).shapes[id]

  if (shape.type !== ShapeType.Group) return [id]

  return [
    id,
    ...shape.children.flatMap((childId) => getDocumentBranch(data, childId)),
  ]
}

export function getSelectedIds(data: Data) {
  return data.pageStates[data.currentPageId].selectedIds
}

export function setSelectedIds(data: Data, ids: string[]) {
  data.pageStates[data.currentPageId].selectedIds = new Set(ids)
  return data.pageStates[data.currentPageId].selectedIds
}

export function setToArray<T>(set: Set<T>): T[] {
  return Array.from(set.values())
}

const G2 = (3.0 - Math.sqrt(3.0)) / 6.0

const Grad = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0, 1],
  [0, -1],
]

/**
 * Seeded random number generator, using [xorshift](https://en.wikipedia.org/wiki/Xorshift).
 * The result will always be betweeen -1 and 1.
 *
 * Adapted from [seedrandom](https://github.com/davidbau/seedrandom).
 */
export function rng(seed = '') {
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

  for (var k = 0; k < seed.length + 64; k++) {
    x ^= seed.charCodeAt(k) | 0
    next()
  }

  return next
}

export function ease(t: number) {
  return t * t * t
}

export function pointsBetween(a: number[], b: number[], steps = 6) {
  return Array.from(Array(steps))
    .map((_, i) => ease(i / steps))
    .map((t) => [...vec.lrp(a, b, t), (1 - t) / 2])
}

export function shuffleArr<T>(arr: T[], offset: number): T[] {
  return arr.map((_, i) => arr[(i + offset) % arr.length])
}

export function commandKey() {
  return isDarwin() ? '⌘' : 'Ctrl'
}

export function getTopParentId(data: Data, id: string): string {
  const shape = getPage(data).shapes[id]
  return shape.parentId === data.currentPageId ||
    shape.parentId === data.currentParentId
    ? id
    : getTopParentId(data, shape.parentId)
}

export function uniqueArray<T extends string | number | Symbol>(...items: T[]) {
  return Array.from(new Set(items).values())
}

export function getPoint(
  e: PointerEvent | React.PointerEvent | Touch | React.Touch | WheelEvent
) {
  return [
    Number(e.clientX.toPrecision(5)),
    Number(e.clientY.toPrecision(5)),
    'pressure' in e ? Number(e.pressure.toPrecision(5)) || 0.5 : 0.5,
  ]
}

export function lzw_encode(s: string) {
  const dict = {}
  const data = (s + '').split('')

  let currChar: string
  let phrase = data[0]
  let code = 256

  const out = []

  for (var i = 1; i < data.length; i++) {
    currChar = data[i]

    if (dict[phrase + currChar] != null) {
      phrase += currChar
    } else {
      out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0))
      dict[phrase + currChar] = code
      code++
      phrase = currChar
    }
  }

  out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0))

  for (var i = 0; i < out.length; i++) {
    out[i] = String.fromCharCode(out[i])
  }

  return out.join('')
}

// Decompress an LZW-encoded string
export function lzw_decode(s: string) {
  const dict = {}
  const data = (s + '').split('')

  let currChar = data[0]
  let oldPhrase = currChar
  let code = 256
  let phrase: string

  const out = [currChar]

  for (var i = 1; i < data.length; i++) {
    let currCode = data[i].charCodeAt(0)

    if (currCode < 256) {
      phrase = data[i]
    } else {
      phrase = dict[currCode] ? dict[currCode] : oldPhrase + currChar
    }

    out.push(phrase)
    currChar = phrase.charAt(0)
    dict[code] = oldPhrase + currChar
    code++
    oldPhrase = phrase
  }

  return out.join('')
}
