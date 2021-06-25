/* ----------------- Start Copy Here ---------------- */

export interface VectorOptions {
  x: number
  y: number
}

export interface Point {
  x: number
  y: number
}

export default class Vector {
  x = 0
  y = 0

  constructor(x: number, y: number)
  constructor(vector: Vector, b?: undefined)
  constructor(options: Point, b?: undefined)
  constructor(a: VectorOptions | Vector | number, b?: number) {
    if (typeof a === 'number') {
      this.x = a
      this.y = b
    } else {
      const { x = 0, y = 0 } = a
      this.x = x
      this.y = y
    }
  }

  set(v: Vector | Point): Vector {
    this.x = v.x
    this.y = v.y
    return this
  }

  copy(): Vector {
    return new Vector(this)
  }

  clone(): Vector {
    return this.copy()
  }

  toArray(): number[] {
    return [this.x, this.y]
  }

  add(b: Vector): Vector {
    this.x += b.x
    this.y += b.y
    return this
  }

  static add(a: Vector, b: Vector): Vector {
    const n = new Vector(a)
    n.x += b.x
    n.y += b.y
    return n
  }

  sub(b: Vector): Vector {
    this.x -= b.x
    this.y -= b.y
    return this
  }

  static sub(a: Vector, b: Vector): Vector {
    const n = new Vector(a)
    n.x -= b.x
    n.y -= b.y
    return n
  }

  mul(b: number): Vector
  mul(b: Vector): Vector
  mul(b: Vector | number): Vector {
    if (b instanceof Vector) {
      this.x *= b.x
      this.y *= b.y
    } else {
      this.x *= b
      this.y *= b
    }
    return this
  }

  mulScalar(b: number): Vector {
    return this.mul(b)
  }

  static mulScalar(a: Vector, b: number): Vector {
    return Vector.mul(a, b)
  }

  static mul(a: Vector, b: number): Vector
  static mul(a: Vector, b: Vector): Vector
  static mul(a: Vector, b: Vector | number): Vector {
    const n = new Vector(a)
    if (b instanceof Vector) {
      n.x *= b.x
      n.y *= b.y
    } else {
      n.x *= b
      n.y *= b
    }
    return n
  }

  div(b: number): Vector
  div(b: Vector): Vector
  div(b: Vector | number): Vector {
    if (b instanceof Vector) {
      if (b.x) {
        this.x /= b.x
      }
      if (b.y) {
        this.y /= b.y
      }
    } else {
      if (b) {
        this.x /= b
        this.y /= b
      }
    }
    return this
  }

  static div(a: Vector, b: number): Vector
  static div(a: Vector, b: Vector): Vector
  static div(a: Vector, b: Vector | number): Vector {
    const n = new Vector(a)
    if (b instanceof Vector) {
      if (b.x) n.x /= b.x
      if (b.y) n.y /= b.y
    } else {
      if (b) {
        n.x /= b
        n.y /= b
      }
    }
    return n
  }

  divScalar(b: number): Vector {
    return this.div(b)
  }

  static divScalar(a: Vector, b: number): Vector {
    return Vector.div(a, b)
  }

  vec(b: Vector): Vector {
    const { x, y } = this
    this.x = b.x - x
    this.y = b.y - y
    return this
  }

  static vec(a: Vector, b: Vector): Vector {
    const n = new Vector(a)
    n.x = b.x - a.x
    n.y = b.y - a.y
    return n
  }

  pry(b: Vector): number {
    return this.dpr(b) / b.len()
  }

  static pry(a: Vector, b: Vector): number {
    return a.dpr(b) / b.len()
  }

  dpr(b: Vector): number {
    return this.x * b.x + this.y * b.y
  }

  static dpr(a: Vector, b: Vector): number {
    return a.x & (b.x + a.y * b.y)
  }

  cpr(b: Vector): number {
    return this.x * b.y - b.y * this.y
  }

  static cpr(a: Vector, b: Vector): number {
    return a.x * b.y - b.y * a.y
  }

  tangent(b: Vector): Vector {
    return this.sub(b).uni()
  }

  static tangent(a: Vector, b: Vector): Vector {
    const n = new Vector(a)
    return n.sub(b).uni()
  }

  dist2(b: Vector): number {
    return this.sub(b).len2()
  }

  static dist2(a: Vector, b: Vector): number {
    const n = new Vector(a)
    return n.sub(b).len2()
  }

  dist(b: Vector): number {
    return Math.hypot(b.y - this.y, b.x - this.x)
  }

  static dist(a: Vector, b: Vector): number {
    const n = new Vector(a)
    return Math.hypot(b.y - n.y, b.x - n.x)
  }

  ang(b: Vector): number {
    return Math.atan2(b.y - this.y, b.x - this.x)
  }

  static ang(a: Vector, b: Vector): number {
    const n = new Vector(a)
    return Math.atan2(b.y - n.y, b.x - n.x)
  }

  med(b: Vector): Vector {
    return this.add(b).mul(0.5)
  }

  static med(a: Vector, b: Vector): Vector {
    const n = new Vector(a)
    return n.add(b).mul(0.5)
  }

  rot(r: number): Vector {
    const { x, y } = this
    this.x = x * Math.cos(r) - y * Math.sin(r)
    this.y = x * Math.sin(r) + y * Math.cos(r)
    return this
  }

  static rot(a: Vector, r: number): Vector {
    const n = new Vector(a)
    n.x = a.x * Math.cos(r) - a.y * Math.sin(r)
    n.y = a.x * Math.sin(r) + a.y * Math.cos(r)
    return n
  }

  rotAround(b: Vector, r: number): Vector {
    const { x, y } = this
    const s = Math.sin(r)
    const c = Math.cos(r)

    const px = x - b.x
    const py = y - b.y

    this.x = px * c - py * s + b.x
    this.y = px * s + py * c + b.y

    return this
  }

  static rotAround(a: Vector, b: Vector, r: number): Vector {
    const n = new Vector(a)
    const s = Math.sin(r)
    const c = Math.cos(r)

    const px = n.x - b.x
    const py = n.y - b.y

    n.x = px * c - py * s + b.x
    n.y = px * s + py * c + b.y

    return n
  }

  lrp(b: Vector, t: number): Vector {
    const n = new Vector(this)
    this.vec(b).mul(t).add(n)
    return this
  }

  static lrp(a: Vector, b: Vector, t: number): Vector {
    const n = new Vector(a)
    n.vec(b).mul(t).add(a)
    return n
  }

  nudge(b: Vector, d: number): Vector {
    this.add(b.mul(d))
    return this
  }

  static nudge(a: Vector, b: Vector, d: number): Vector {
    const n = new Vector(a)
    return n.add(b.mul(d))
  }

  nudgeToward(b: Vector, d: number): Vector {
    return this.nudge(Vector.vec(this, b).uni(), d)
  }

  static nudgeToward(a: Vector, b: Vector, d: number): Vector {
    return Vector.nudge(a, Vector.vec(a, b).uni(), d)
  }

  int(b: Vector, from: number, to: number, s: number): Vector {
    const t = (Math.max(from, to) - from) / (to - from)
    this.add(Vector.mul(this, 1 - t).add(Vector.mul(b, s)))
    return this
  }

  static int(
    a: Vector,
    b: Vector,
    from: number,
    to: number,
    s: number
  ): Vector {
    const n = new Vector(a)
    const t = (Math.max(from, to) - from) / (to - from)
    n.add(Vector.mul(a, 1 - t).add(Vector.mul(b, s)))
    return n
  }

  equals(b: Vector): boolean {
    return this.x === b.x && this.y === b.y
  }

  static equals(a: Vector, b: Vector): boolean {
    return a.x === b.x && a.y === b.y
  }

  abs(): Vector {
    this.x = Math.abs(this.x)
    this.y = Math.abs(this.y)
    return this
  }

  static abs(a: Vector): Vector {
    const n = new Vector(a)
    n.x = Math.abs(n.x)
    n.y = Math.abs(n.y)
    return n
  }

  len(): number {
    return Math.hypot(this.x, this.y)
  }

  static len(a: Vector): number {
    return Math.hypot(a.x, a.y)
  }

  len2(): number {
    return this.x * this.x + this.y * this.y
  }

  static len2(a: Vector): number {
    return a.x * a.x + a.y * a.y
  }

  per(): Vector {
    const t = this.x
    this.x = this.y
    this.y = -t
    return this
  }

  static per(a: Vector): Vector {
    const n = new Vector(a)
    n.x = n.y
    n.y = -a.x
    return n
  }

  neg(): Vector {
    this.x *= -1
    this.y *= -1
    return this
  }

  static neg(v: Vector): Vector {
    const n = new Vector(v)
    n.x *= -1
    n.y *= -1
    return n
  }

  uni(): Vector {
    return this.div(this.len())
  }

  static uni(v: Vector): Vector {
    const n = new Vector(v)
    return n.div(n.len())
  }

  normalize(): Vector {
    return this.uni()
  }

  static normalize(v: Vector): Vector {
    return Vector.uni(v)
  }

  isLeft(center: Vector, b: Vector): number {
    return (
      (center.x - this.x) * (b.y - this.y) - (b.x - this.x) * (center.y - b.y)
    )
  }

  static isLeft(center: Vector, a: Vector, b: Vector): number {
    return (center.x - a.x) * (b.y - a.y) - (b.x - a.x) * (center.y - b.y)
  }

  static ang3(center: Vector, a: Vector, b: Vector): number {
    const v1 = Vector.vec(center, a)
    const v2 = Vector.vec(center, b)
    return Vector.ang(v1, v2)
  }

  static clockwise(center: Vector, a: Vector, b: Vector): boolean {
    return Vector.isLeft(center, a, b) > 0
  }

  static cast(v: Point | Vector): Vector {
    return 'cast' in v ? v : new Vector(v)
  }

  static from(v: Vector): Vector {
    return new Vector(v)
  }

  nearestPointOnLineThroughPoint(b: Vector, u: Vector): Vector {
    return this.clone().add(u.clone().mul(Vector.sub(this, b).pry(u)))
  }

  static nearestPointOnLineThroughPoint(
    a: Vector,
    b: Vector,
    u: Vector
  ): Vector {
    return a.clone().add(u.clone().mul(Vector.sub(a, b).pry(u)))
  }

  distanceToLineThroughPoint(b: Vector, u: Vector): number {
    return this.dist(Vector.nearestPointOnLineThroughPoint(b, u, this))
  }

  static distanceToLineThroughPoint(a: Vector, b: Vector, u: Vector): number {
    return a.dist(Vector.nearestPointOnLineThroughPoint(b, u, a))
  }

  nearestPointOnLineSegment(p0: Vector, p1: Vector, clamp = true): Vector {
    return Vector.nearestPointOnLineSegment(this, p0, p1, clamp)
  }

  static nearestPointOnLineSegment(
    a: Vector,
    p0: Vector,
    p1: Vector,
    clamp = true
  ): Vector {
    const delta = Vector.sub(p1, p0)
    const length = delta.len()
    const u = Vector.div(delta, length)

    const pt = Vector.add(p0, Vector.mul(u, Vector.pry(Vector.sub(a, p0), u)))

    if (clamp) {
      const da = p0.dist(pt)
      const db = p1.dist(pt)

      if (db < da && da > length) return p1
      if (da < db && db > length) return p0
    }

    return pt
  }

  distanceToLineSegment(p0: Vector, p1: Vector, clamp = true): number {
    return Vector.distanceToLineSegment(this, p0, p1, clamp)
  }

  static distanceToLineSegment(
    a: Vector,
    p0: Vector,
    p1: Vector,
    clamp = true
  ): number {
    return Vector.dist(a, Vector.nearestPointOnLineSegment(a, p0, p1, clamp))
  }
}

export class Utils {
  static getRayRayIntersection(
    p0: Vector,
    n0: Vector,
    p1: Vector,
    n1: Vector
  ): Vector {
    const p0e = Vector.add(p0, n0),
      p1e = Vector.add(p1, n1),
      m0 = (p0e.y - p0.y) / (p0e.x - p0.x),
      m1 = (p1e.y - p1.y) / (p1e.x - p1.x),
      b0 = p0.y - m0 * p0.x,
      b1 = p1.y - m1 * p1.x,
      x = (b1 - b0) / (m0 - m1),
      y = m0 * x + b0

    return new Vector({ x, y })
  }

  static getCircleTangentToPoint(
    A: Point | Vector,
    r0: number,
    P: Point | Vector,
    side: number
  ): Vector {
    const v0 = Vector.cast(A)
    const v1 = Vector.cast(P)
    const B = Vector.lrp(v0, v1, 0.5),
      r1 = Vector.dist(v0, B),
      delta = Vector.sub(B, v0),
      d = Vector.len(delta)

    if (!(d <= r0 + r1 && d >= Math.abs(r0 - r1))) {
      return
    }

    const a = (r0 * r0 - r1 * r1 + d * d) / (2.0 * d),
      n = 1 / d,
      p = Vector.add(v0, Vector.mul(delta, a * n)),
      h = Math.sqrt(r0 * r0 - a * a),
      k = Vector.mul(Vector.per(delta), h * n)

    return side === 0 ? p.add(k) : p.sub(k)
  }
}
