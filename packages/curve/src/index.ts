export interface TLBezierCurveSegment {
  start: number[]
  tangentStart: number[]
  normalStart: number[]
  pressureStart: number
  end: number[]
  tangentEnd: number[]
  normalEnd: number[]
  pressureEnd: number
}

/**
 * Get bezier curve segments that pass through an array of points.
 * @param points
 * @param tension
 */
export function getTLBezierCurveSegments(
  points: number[][],
  tension = 0.4
): TLBezierCurveSegment[] {
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
 * Evaluate a 2d cubic bezier at a point t on the x axis.
 * @param tx
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 */
export function cubicBezier(tx: number, x1: number, y1: number, x2: number, y2: number): number {
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
export function getSpline(pts: number[][], k = 0.5): number[][] {
  let p0: number[]
  let [p1, p2, p3] = pts

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

/**
 * Find a point along a curve segment, via pomax.
 * @param t
 * @param points [cpx1, cpy1, cpx2, cpy2, px, py][]
 */
export function computePointOnSpline(t: number, points: number[][]): number[] {
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
  const _pts = [...pts]
  const len = pts.length
  const res: number[][] = [] // results

  let t1x: number, // tension Vectors
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
  // If open, duplicate first points to beginning, end points to end
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

export function simplify(points: number[][], tolerance = 1): number[][] {
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
      const l0 = simplify(points.slice(0, index + 1), tolerance)
      const l1 = simplify(points.slice(index + 1), tolerance)
      return l0.concat(l1.slice(1))
    }
  }

  return [a, b]
}
