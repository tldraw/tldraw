// A big collection of vector utilities. Collected into a class to improve logging / packaging.

/* ----------------- Start Copy Here ---------------- */

export class Vec {
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

  /**
   * Clamp a value into a range.
   * @param n
   * @param min
   */
  static clampV(A: number[], min: number): number[]
  static clampV(A: number[], min: number, max: number): number[]
  static clampV(A: number[], min: number, max?: number): number[] {
    return A.map((n) => (max ? Vec.clamp(n, min, max) : Vec.clamp(n, min)))
  }

  /**
   * Negate a vector.
   * @param A
   */
  static neg = (A: number[]): number[] => {
    return [-A[0], -A[1]]
  }

  /**
   * Add vectors.
   * @param A
   * @param B
   */
  static add = (A: number[], B: number[]): number[] => {
    return [A[0] + B[0], A[1] + B[1]]
  }

  /**
   * Add scalar to vector.
   * @param A
   * @param B
   */
  static addScalar = (A: number[], n: number): number[] => {
    return [A[0] + n, A[1] + n]
  }

  /**
   * Subtract vectors.
   * @param A
   * @param B
   */
  static sub = (A: number[], B: number[]): number[] => {
    return [A[0] - B[0], A[1] - B[1]]
  }

  /**
   * Subtract scalar from vector.
   * @param A
   * @param B
   */
  static subScalar = (A: number[], n: number): number[] => {
    return [A[0] - n, A[1] - n]
  }

  /**
   * Get the vector from vectors A to B.
   * @param A
   * @param B
   */
  static vec = (A: number[], B: number[]): number[] => {
    // A, B as vectors get the vector from A to B
    return [B[0] - A[0], B[1] - A[1]]
  }

  /**
   * Vector multiplication by scalar
   * @param A
   * @param n
   */
  static mul = (A: number[], n: number): number[] => {
    return [A[0] * n, A[1] * n]
  }

  /**
   * Multiple two vectors.
   * @param A
   * @param B
   */
  static mulV = (A: number[], B: number[]): number[] => {
    return [A[0] * B[0], A[1] * B[1]]
  }

  /**
   * Vector division by scalar.
   * @param A
   * @param n
   */
  static div = (A: number[], n: number): number[] => {
    return [A[0] / n, A[1] / n]
  }

  /**
   * Vector division by vector.
   * @param A
   * @param n
   */
  static divV = (A: number[], B: number[]): number[] => {
    return [A[0] / B[0], A[1] / B[1]]
  }

  /**
   * Perpendicular rotation of a vector A
   * @param A
   */
  static per = (A: number[]): number[] => {
    return [A[1], -A[0]]
  }

  /**
   * Dot product
   * @param A
   * @param B
   */
  static dpr = (A: number[], B: number[]): number => {
    return A[0] * B[0] + A[1] * B[1]
  }

  /**
   * Cross product (outer product) | A X B |
   * @param A
   * @param B
   */
  static cpr = (A: number[], B: number[]): number => {
    return A[0] * B[1] - B[0] * A[1]
  }

  /**
   * Cross (for point in polygon)
   *
   */
  static cross(x: number[], y: number[], z: number[]): number {
    return (y[0] - x[0]) * (z[1] - x[1]) - (z[0] - x[0]) * (y[1] - x[1])
  }

  /**
   * Length of the vector squared
   * @param A
   */
  static len2 = (A: number[]): number => {
    return A[0] * A[0] + A[1] * A[1]
  }

  /**
   * Length of the vector
   * @param A
   */
  static len = (A: number[]): number => {
    return Math.hypot(A[0], A[1])
  }

  /**
   * Project A over B
   * @param A
   * @param B
   */
  static pry = (A: number[], B: number[]): number => {
    return Vec.dpr(A, B) / Vec.len(B)
  }

  /**
   * Get normalized / unit vector.
   * @param A
   */
  static uni = (A: number[]): number[] => {
    return Vec.div(A, Vec.len(A))
  }

  /**
   * Get normalized / unit vector.
   * @param A
   */
  static normalize = (A: number[]): number[] => {
    return Vec.uni(A)
  }

  /**
   * Get the tangent between two vectors.
   * @param A
   * @param B
   * @returns
   */
  static tangent = (A: number[], B: number[]): number[] => {
    return Vec.normalize(Vec.sub(A, B))
  }

  /**
   * Dist length from A to B squared.
   * @param A
   * @param B
   */
  static dist2 = (A: number[], B: number[]): number => {
    return Vec.len2(Vec.sub(A, B))
  }

  /**
   * Dist length from A to B
   * @param A
   * @param B
   */
  static dist = (A: number[], B: number[]): number => {
    return Math.hypot(A[1] - B[1], A[0] - B[0])
  }

  /**
   * A faster, though less accurate method for testing distances. Maybe faster?
   * @param A
   * @param B
   * @returns
   */
  static fastDist = (A: number[], B: number[]): number[] => {
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
  static ang = (A: number[], B: number[]): number => {
    return Math.atan2(Vec.cpr(A, B), Vec.dpr(A, B))
  }

  /**
   * Angle between vector A and vector B in radians
   * @param A
   * @param B
   */
  static angle = (A: number[], B: number[]): number => {
    return Math.atan2(B[1] - A[1], B[0] - A[0])
  }

  /**
   * Mean between two vectors or mid vector between two vectors
   * @param A
   * @param B
   */
  static med = (A: number[], B: number[]): number[] => {
    return Vec.mul(Vec.add(A, B), 0.5)
  }

  /**
   * Vector rotation by r (radians)
   * @param A
   * @param r rotation in radians
   */
  static rot = (A: number[], r: number): number[] => {
    return [A[0] * Math.cos(r) - A[1] * Math.sin(r), A[0] * Math.sin(r) + A[1] * Math.cos(r)]
  }

  /**
   * Rotate a vector around another vector by r (radians)
   * @param A vector
   * @param C center
   * @param r rotation in radians
   */
  static rotWith = (A: number[], C: number[], r: number): number[] => {
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
  static isEqual = (A: number[], B: number[]): boolean => {
    return A[0] === B[0] && A[1] === B[1]
  }

  /**
   * Interpolate vector A to B with a scalar t
   * @param A
   * @param B
   * @param t scalar
   */
  static lrp = (A: number[], B: number[], t: number): number[] => {
    return Vec.add(A, Vec.mul(Vec.sub(B, A), t))
  }

  /**
   * Interpolate from A to B when curVAL goes fromVAL: number[] => to
   * @param A
   * @param B
   * @param from Starting value
   * @param to Ending value
   * @param s Strength
   */
  static int = (A: number[], B: number[], from: number, to: number, s = 1): number[] => {
    const t = (Vec.clamp(from, to) - from) / (to - from)
    return Vec.add(Vec.mul(A, 1 - t), Vec.mul(B, s))
  }

  /**
   * Get the angle between the three vectors A, B, and C.
   * @param p1
   * @param pc
   * @param p2
   */
  static ang3 = (p1: number[], pc: number[], p2: number[]): number => {
    // this,
    const v1 = Vec.vec(pc, p1)
    const v2 = Vec.vec(pc, p2)
    return Vec.ang(v1, v2)
  }

  /**
   * Absolute value of a vector.
   * @param A
   * @returns
   */
  static abs = (A: number[]): number[] => {
    return [Math.abs(A[0]), Math.abs(A[1])]
  }

  static rescale = (a: number[], n: number): number[] => {
    const l = Vec.len(a)
    return [(n * a[0]) / l, (n * a[1]) / l]
  }

  /**
   * Get whether p1 is left of p2, relative to pc.
   * @param p1
   * @param pc
   * @param p2
   */
  static isLeft = (p1: number[], pc: number[], p2: number[]): number => {
    //  isLeft: >0 for counterclockwise
    //          =0 for none (degenerate)
    //          <0 for clockwise
    return (pc[0] - p1[0]) * (p2[1] - p1[1]) - (p2[0] - p1[0]) * (pc[1] - p1[1])
  }

  static clockwise = (p1: number[], pc: number[], p2: number[]): boolean => {
    return Vec.isLeft(p1, pc, p2) > 0
  }

  static round = (a: number[], d = 2): number[] => {
    return a.map((v) => +v.toFixed(d))
  }

  /**
   * Get the minimum distance from a point P to a line with a segment AB.
   * @param A The start of the line.
   * @param B The end of the line.
   * @param P A point.
   * @returns
   */
  // static distanceToLine(A: number[], B: number[], P: number[]) {
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
  // static nearestPointOnLine(
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
  static nearestPointOnLineThroughPoint = (A: number[], u: number[], P: number[]): number[] => {
    return Vec.add(A, Vec.mul(u, Vec.pry(Vec.sub(P, A), u)))
  }

  /**
   * Distance between a point and a line with a known unit vector that passes through a point.
   * @param A Any point on the line
   * @param u The unit vector for the line.
   * @param P A point not on the line to test.
   * @returns
   */
  static distanceToLineThroughPoint = (A: number[], u: number[], P: number[]): number => {
    return Vec.dist(P, Vec.nearestPointOnLineThroughPoint(A, u, P))
  }

  /**
   * Get the nearest point on a line segment between A and B
   * @param A The start of the line segment
   * @param B The end of the line segment
   * @param P The off-line point
   * @param clamp Whether to clamp the point between A and B.
   * @returns
   */
  static nearestPointOnLineSegment = (
    A: number[],
    B: number[],
    P: number[],
    clamp = true
  ): number[] => {
    const delta = Vec.sub(B, A)
    const length = Vec.len(delta)
    const u = Vec.div(delta, length)

    const pt = Vec.add(A, Vec.mul(u, Vec.pry(Vec.sub(P, A), u)))

    if (clamp) {
      const da = Vec.dist(A, pt)
      const db = Vec.dist(B, pt)

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
  static distanceToLineSegment = (A: number[], B: number[], P: number[], clamp = true): number => {
    return Vec.dist(P, Vec.nearestPointOnLineSegment(A, B, P, clamp))
  }

  /**
   * Push a point A towards point B by a given distance.
   * @param A
   * @param B
   * @param d
   * @returns
   */
  static nudge = (A: number[], B: number[], d: number): number[] => {
    return Vec.add(A, Vec.mul(Vec.uni(Vec.vec(A, B)), d))
  }

  /**
   * Push a point in a given angle by a given distance.
   * @param A
   * @param B
   * @param d
   */
  static nudgeAtAngle = (A: number[], a: number, d: number): number[] => {
    return [Math.cos(a) * d + A[0], Math.sin(a) * d + A[1]]
  }

  /**
   * Round a vector to a precision length.
   * @param a
   * @param n
   */
  static toPrecision = (a: number[], n = 4): number[] => {
    return [+a[0].toPrecision(n), +a[1].toPrecision(n)]
  }

  /**
   * Get an array of points (with simulated pressure) between two points.
   * @param A The first point.
   * @param B The second point.
   * @param steps The number of points to return.
   * @param ease An easing function to apply to the simulated pressure.
   */
  static pointsBetween = (
    A: number[],
    B: number[],
    steps = 6,
    ease = (t: number) => t * t * t * t
  ): number[][] => {
    return Array.from(Array(steps)).map((_, i) =>
      Vec.round([...Vec.lrp(A, B, i / steps), (1 - ease(i / steps)) / 2])
    )
  }
}

export default Vec
