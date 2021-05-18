import Vector from "lib/code/vector"
import React from "react"
import { Data, Bounds, TransformEdge, TransformCorner } from "types"
import * as svg from "./svg"
import * as vec from "./vec"

export function screenToWorld(point: number[], data: Data) {
  return vec.sub(vec.div(point, data.camera.zoom), data.camera.point)
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

// export function getBoundsFromPoints(a: number[], b: number[]) {
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
    throw Error("Curve must have at least two points.")
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
      textarea = document.createElement("textarea")
      textarea.setAttribute("position", "fixed")
      textarea.setAttribute("top", "0")
      textarea.setAttribute("readonly", "true")
      textarea.setAttribute("contenteditable", "true")
      textarea.style.position = "fixed" // prevent scroll from jumping to the bottom when focus is set.
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
      result = document.execCommand("copy")
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
    "ontouchstart" in window ||
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
  return Math.max(min, typeof max !== "undefined" ? Math.min(n, max) : n)
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
 * @returns
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
  return [
    -bx / (2 * a),
    -by / (2 * a),
    Math.sqrt(bx * bx + by * by - 4 * a * c) / (2 * Math.abs(a)),
  ]
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  type: TransformEdge | TransformCorner,
  isFlippedX: boolean,
  isFlippedY: boolean
) {
  let anchor: TransformCorner | TransformEdge = type

  // Change corner anchors if flipped
  switch (type) {
    case TransformCorner.TopLeft: {
      if (isFlippedX && isFlippedY) {
        anchor = TransformCorner.BottomRight
      } else if (isFlippedX) {
        anchor = TransformCorner.TopRight
      } else if (isFlippedY) {
        anchor = TransformCorner.BottomLeft
      }
      break
    }
    case TransformCorner.TopRight: {
      if (isFlippedX && isFlippedY) {
        anchor = TransformCorner.BottomLeft
      } else if (isFlippedX) {
        anchor = TransformCorner.TopLeft
      } else if (isFlippedY) {
        anchor = TransformCorner.BottomRight
      }
      break
    }
    case TransformCorner.BottomRight: {
      if (isFlippedX && isFlippedY) {
        anchor = TransformCorner.TopLeft
      } else if (isFlippedX) {
        anchor = TransformCorner.BottomLeft
      } else if (isFlippedY) {
        anchor = TransformCorner.TopRight
      }
      break
    }
    case TransformCorner.BottomLeft: {
      if (isFlippedX && isFlippedY) {
        anchor = TransformCorner.TopRight
      } else if (isFlippedX) {
        anchor = TransformCorner.BottomRight
      } else if (isFlippedY) {
        anchor = TransformCorner.TopLeft
      }
      break
    }
  }

  return anchor
}

export function vectorToPoint(point: number[] | Vector | undefined) {
  if (typeof point === "undefined") {
    return [0, 0]
  }

  if (point instanceof Vector) {
    return [point.x, point.y]
  }
  return point
}

export function getBoundsFromPoints(points: number[][]): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (let [x, y] of points) {
    minX = Math.min(x, minX)
    minY = Math.min(y, minY)
    maxX = Math.max(x, maxX)
    maxY = Math.max(y, maxY)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
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
