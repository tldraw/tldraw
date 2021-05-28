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

/**
 * Negate a vector.
 * @param A
 */
export function neg(A: number[]) {
  return [-A[0], -A[1]]
}

/**
 * Add vectors.
 * @param A
 * @param B
 */
export function add(A: number[], B: number[]) {
  return [A[0] + B[0], A[1] + B[1]]
}

/**
 * Add scalar to vector.
 * @param A
 * @param B
 */
export function addScalar(A: number[], n: number) {
  return [A[0] + n, A[1] + n]
}

/**
 * Subtract vectors.
 * @param A
 * @param B
 */
export function sub(A: number[], B: number[]) {
  return [A[0] - B[0], A[1] - B[1]]
}

/**
 * Subtract scalar from vector.
 * @param A
 * @param B
 */
export function subScalar(A: number[], n: number) {
  return [A[0] - n, A[1] - n]
}

/**
 * Get the vector from vectors A to B.
 * @param A
 * @param B
 */
export function vec(A: number[], B: number[]) {
  // A, B as vectors get the vector from A to B
  return [B[0] - A[0], B[1] - A[1]]
}

/**
 * Vector multiplication by scalar
 * @param A
 * @param n
 */
export function mul(A: number[], n: number) {
  return [A[0] * n, A[1] * n]
}

export function mulV(A: number[], B: number[]) {
  return [A[0] * B[0], A[1] * B[1]]
}

/**
 * Vector division by scalar.
 * @param A
 * @param n
 */
export function div(A: number[], n: number) {
  return [A[0] / n, A[1] / n]
}

/**
 * Vector division by vector.
 * @param A
 * @param n
 */
export function divV(A: number[], B: number[]) {
  return [A[0] / B[0], A[1] / B[1]]
}

/**
 * Perpendicular rotation of a vector A
 * @param A
 */
export function per(A: number[]) {
  return [A[1], -A[0]]
}

/**
 * Dot product
 * @param A
 * @param B
 */
export function dpr(A: number[], B: number[]) {
  return A[0] * B[0] + A[1] * B[1]
}

/**
 * Cross product (outer product) | A X B |
 * @param A
 * @param B
 */
export function cpr(A: number[], B: number[]) {
  return A[0] * B[1] - B[0] * A[1]
}

/**
 * Length of the vector squared
 * @param A
 */
export function len2(A: number[]) {
  return A[0] * A[0] + A[1] * A[1]
}

/**
 * Length of the vector
 * @param A
 */
export function len(A: number[]) {
  return Math.hypot(A[0], A[1])
}

/**
 * Project A over B
 * @param A
 * @param B
 */
export function pry(A: number[], B: number[]) {
  return dpr(A, B) / len(B)
}

/**
 * Get normalized / unit vector.
 * @param A
 */
export function uni(A: number[]) {
  return div(A, len(A))
}

/**
 * Get normalized / unit vector.
 * @param A
 */
export function normalize(A: number[]) {
  return uni(A)
}

/**
 * Get the tangent between two vectors.
 * @param A
 * @param B
 * @returns
 */
export function tangent(A: number[], B: number[]) {
  return normalize(sub(A, B))
}

/**
 * Dist length from A to B squared.
 * @param A
 * @param B
 */
export function dist2(A: number[], B: number[]) {
  return len2(sub(A, B))
}

/**
 * Dist length from A to B
 * @param A
 * @param B
 */
export function dist(A: number[], B: number[]) {
  return Math.hypot(A[1] - B[1], A[0] - B[0])
}

/**
 * A faster, though less accurate method for testing distances. Maybe faster?
 * @param A
 * @param B
 * @returns
 */
export function fastDist(A: number[], B: number[]) {
  const V = [B[0] - A[0], B[1] - A[1]]
  const aV = [Math.abs(V[0]), Math.abs(V[1])]
  let r = 1 / Math.max(aV[0], aV[1])
  r = r * (1.29289 - (aV[0] + aV[1]) * r * 0.29289)
  return [V[0] * r, V[1] * r]
}

/**
 * Angle between vector A and vector B in radians
 * @param A
 * @param B
 */
export function ang(A: number[], B: number[]) {
  return Math.atan2(cpr(A, B), dpr(A, B))
}

/**
 * Angle between vector A and vector B in radians
 * @param A
 * @param B
 */
export function angle(A: number[], B: number[]) {
  return Math.atan2(B[1] - A[1], B[0] - A[0])
}

/**
 * Mean between two vectors or mid vector between two vectors
 * @param A
 * @param B
 */
export function med(A: number[], B: number[]) {
  return mul(add(A, B), 0.5)
}

/**
 * Vector rotation by r (radians)
 * @param A
 * @param r rotation in radians
 */
export function rot(A: number[], r: number) {
  return [
    A[0] * Math.cos(r) - A[1] * Math.sin(r),
    A[0] * Math.sin(r) + A[1] * Math.cos(r),
  ]
}

/**
 * Rotate a vector around another vector by r (radians)
 * @param A vector
 * @param C center
 * @param r rotation in radians
 */
export function rotWith(A: number[], C: number[], r: number) {
  if (r === 0) return A

  const s = Math.sin(r)
  const c = Math.cos(r)

  const px = A[0] - C[0]
  const py = A[1] - C[1]

  const nx = px * c - py * s
  const ny = px * s + py * c

  return [nx + C[0], ny + C[1]]
}

/**
 * Check of two vectors are identical.
 * @param A
 * @param B
 */
export function isEqual(A: number[], B: number[]) {
  return A[0] === B[0] && A[1] === B[1]
}

/**
 * Interpolate vector A to B with a scalar t
 * @param A
 * @param B
 * @param t scalar
 */
export function lrp(A: number[], B: number[], t: number) {
  return add(A, mul(vec(A, B), t))
}

/**
 * Interpolate from A to B when curVAL goes fromVAL => to
 * @param A
 * @param B
 * @param from Starting value
 * @param to Ending value
 * @param s Strength
 */
export function int(A: number[], B: number[], from: number, to: number, s = 1) {
  const t = (clamp(from, to) - from) / (to - from)
  return add(mul(A, 1 - t), mul(B, s))
}

/**
 * Get the angle between the three vectors A, B, and C.
 * @param p1
 * @param pc
 * @param p2
 */
export function ang3(p1: number[], pc: number[], p2: number[]) {
  // this,
  const v1 = vec(pc, p1)
  const v2 = vec(pc, p2)
  return ang(v1, v2)
}

/**
 * Absolute value of a vector.
 * @param A
 * @returns
 */
export function abs(A: number[]) {
  return [Math.abs(A[0]), Math.abs(A[1])]
}

export function rescale(a: number[], n: number) {
  const l = len(a)
  return [(n * a[0]) / l, (n * a[1]) / l]
}

/**
 * Get whether p1 is left of p2, relative to pc.
 * @param p1
 * @param pc
 * @param p2
 */
export function isLeft(p1: number[], pc: number[], p2: number[]) {
  //  isLeft: >0 for counterclockwise
  //          =0 for none (degenerate)
  //          <0 for clockwise
  return (pc[0] - p1[0]) * (p2[1] - p1[1]) - (p2[0] - p1[0]) * (pc[1] - p1[1])
}

export function clockwise(p1: number[], pc: number[], p2: number[]) {
  return isLeft(p1, pc, p2) > 0
}

const rounds = [1, 10, 100, 1000]

export function round(a: number[], d = 2) {
  return [
    Math.round(a[0] * rounds[d]) / rounds[d],
    Math.round(a[1] * rounds[d]) / rounds[d],
  ]
}

/**
 * Get the minimum distance from a point P to a line with a segment AB.
 * @param A The start of the line.
 * @param B The end of the line.
 * @param P A point.
 * @returns
 */
// export function distanceToLine(A: number[], B: number[], P: number[]) {
//   const delta = sub(B, A)
//   const angle = Math.atan2(delta[1], delta[0])
//   const dir = rot(sub(P, A), -angle)
//   return dir[1]
// }

/**
 * Get the nearest point on a line segment AB.
 * @param A The start of the line.
 * @param B The end of the line.
 * @param P A point.
 * @param clamp Whether to clamp the resulting point to the segment.
 * @returns
 */
// export function nearestPointOnLine(
//   A: number[],
//   B: number[],
//   P: number[],
//   clamp = true
// ) {
//   const delta = sub(B, A)
//   const length = len(delta)
//   const angle = Math.atan2(delta[1], delta[0])
//   const dir = rot(sub(P, A), -angle)

//   if (clamp) {
//     if (dir[0] < 0) return A
//     if (dir[0] > length) return B
//   }

//   return add(A, div(mul(delta, dir[0]), length))
// }

/**
 * Get the nearest point on a line with a known unit vector that passes through point A
 * @param A Any point on the line
 * @param u The unit vector for the line.
 * @param P A point not on the line to test.
 * @returns
 */
export function nearestPointOnLineThroughPoint(
  A: number[],
  u: number[],
  P: number[]
) {
  return add(A, mul(u, pry(sub(P, A), u)))
}

/**
 * Distance between a point and a line with a known unit vector that passes through a point.
 * @param A Any point on the line
 * @param u The unit vector for the line.
 * @param P A point not on the line to test.
 * @returns
 */
export function distanceToLineThroughPoint(
  A: number[],
  u: number[],
  P: number[]
) {
  return dist(P, nearestPointOnLineThroughPoint(A, u, P))
}

/**
 * Get the nearest point on a line segment between A and B
 * @param A The start of the line segment
 * @param B The end of the line segment
 * @param P The off-line point
 * @param clamp Whether to clamp the point between A and B.
 * @returns
 */
export function nearestPointOnLineSegment(
  A: number[],
  B: number[],
  P: number[],
  clamp = true
) {
  const delta = sub(B, A)
  const length = len(delta)
  const u = div(delta, length)

  const pt = add(A, mul(u, pry(sub(P, A), u)))

  if (clamp) {
    const da = dist(A, pt)
    const db = dist(B, pt)

    if (db < da && da > length) return B
    if (da < db && db > length) return A
  }

  return pt
}

/**
 * Distance between a point and the nearest point on a line segment between A and B
 * @param A The start of the line segment
 * @param B The end of the line segment
 * @param P The off-line point
 * @param clamp Whether to clamp the point between A and B.
 * @returns
 */
export function distanceToLineSegment(
  A: number[],
  B: number[],
  P: number[],
  clamp = true
) {
  return dist(P, nearestPointOnLineSegment(A, B, P, clamp))
}

/**
 * Get a vector d distance from A towards B.
 * @param A
 * @param B
 * @param d
 * @returns
 */
export function nudge(A: number[], B: number[], d: number) {
  return add(A, mul(uni(vec(A, B)), d))
}

/**
 * Round a vector to a precision length.
 * @param a
 * @param n
 */
export function toPrecision(a: number[], n = 4) {
  return [+a[0].toPrecision(n), +a[1].toPrecision(n)]
}
