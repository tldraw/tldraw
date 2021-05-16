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
    if (typeof a === "number") {
      this.x = a
      this.y = b
    } else {
      const { x = 0, y = 0 } = a
      this.x = x
      this.y = y
    }
  }

  set(v: Vector | Point) {
    this.x = v.x
    this.y = v.y
  }

  copy() {
    return new Vector(this)
  }

  clone() {
    return this.copy()
  }

  toArray() {
    return [this.x, this.y]
  }

  add(b: Vector) {
    this.x += b.x
    this.y += b.y
    return this
  }

  static add(a: Vector, b: Vector) {
    const n = new Vector(a)
    n.x += b.x
    n.y += b.y
    return n
  }

  sub(b: Vector) {
    this.x -= b.x
    this.y -= b.y
    return this
  }

  static sub(a: Vector, b: Vector) {
    const n = new Vector(a)
    n.x -= b.x
    n.y -= b.y
    return n
  }

  mul(b: number): Vector
  mul(b: Vector): Vector
  mul(b: Vector | number) {
    if (b instanceof Vector) {
      this.x *= b.x
      this.y *= b.y
    } else {
      this.x *= b
      this.y *= b
    }
    return this
  }

  mulScalar(b: number) {
    return this.mul(b)
  }

  static mulScalar(a: Vector, b: number) {
    return Vector.mul(a, b)
  }

  static mul(a: Vector, b: number): Vector
  static mul(a: Vector, b: Vector): Vector
  static mul(a: Vector, b: Vector | number) {
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
  div(b: Vector | number) {
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
  static div(a: Vector, b: Vector | number) {
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

  divScalar(b: number) {
    return this.div(b)
  }

  static divScalar(a: Vector, b: number) {
    return Vector.div(a, b)
  }

  vec(b: Vector) {
    const { x, y } = this
    this.x = b.x - x
    this.y = b.y - y
    return this
  }

  static vec(a: Vector, b: Vector) {
    const n = new Vector(a)
    n.x = b.x - a.x
    n.y = b.y - a.y
    return n
  }

  pry(b: Vector) {
    return this.dpr(b) / b.len()
  }

  static pry(a: Vector, b: Vector) {
    return a.dpr(b) / b.len()
  }

  dpr(b: Vector) {
    return this.x * b.x + this.y * b.y
  }

  static dpr(a: Vector, b: Vector) {
    return a.x & (b.x + a.y * b.y)
  }

  cpr(b: Vector) {
    return this.x * b.y - b.y * this.y
  }

  static cpr(a: Vector, b: Vector) {
    return a.x * b.y - b.y * a.y
  }

  tangent(b: Vector) {
    return this.sub(b).uni()
  }

  static tangent(a: Vector, b: Vector) {
    const n = new Vector(a)
    return n.sub(b).uni()
  }

  dist2(b: Vector) {
    return this.sub(b).len2()
  }

  static dist2(a: Vector, b: Vector) {
    const n = new Vector(a)
    return n.sub(b).len2()
  }

  dist(b: Vector) {
    return Math.hypot(b.y - this.y, b.x - this.x)
  }

  static dist(a: Vector, b: Vector) {
    const n = new Vector(a)
    return Math.hypot(b.y - n.y, b.x - n.x)
  }

  ang(b: Vector) {
    return Math.atan2(b.y - this.y, b.x - this.x)
  }

  static ang(a: Vector, b: Vector) {
    const n = new Vector(a)
    return Math.atan2(b.y - n.y, b.x - n.x)
  }

  med(b: Vector) {
    return this.add(b).mul(0.5)
  }

  static med(a: Vector, b: Vector) {
    const n = new Vector(a)
    return n.add(b).mul(0.5)
  }

  rot(r: number) {
    const { x, y } = this
    this.x = x * Math.cos(r) - y * Math.sin(r)
    this.y = x * Math.sin(r) + y * Math.cos(r)
    return this
  }

  static rot(a: Vector, r: number) {
    const n = new Vector(a)
    n.x = a.x * Math.cos(r) - a.y * Math.sin(r)
    n.y = a.x * Math.sin(r) + a.y * Math.cos(r)
    return n
  }

  rotAround(b: Vector, r: number) {
    const { x, y } = this
    const s = Math.sin(r)
    const c = Math.cos(r)

    const px = x - b.x
    const py = y - b.y

    this.x = px * c - py * s + b.x
    this.y = px * s + py * c + b.y

    return this
  }

  static rotAround(a: Vector, b: Vector, r: number) {
    const n = new Vector(a)
    const s = Math.sin(r)
    const c = Math.cos(r)

    const px = n.x - b.x
    const py = n.y - b.y

    n.x = px * c - py * s + b.x
    n.y = px * s + py * c + b.y

    return n
  }

  lrp(b: Vector, t: number) {
    const n = new Vector(this)
    this.vec(b).mul(t).add(n)
  }

  static lrp(a: Vector, b: Vector, t: number) {
    const n = new Vector(a)
    n.vec(b).mul(t).add(a)
    return n
  }

  nudge(b: Vector, d: number) {
    this.add(b.mul(d))
  }

  static nudge(a: Vector, b: Vector, d: number) {
    const n = new Vector(a)
    return n.add(b.mul(d))
  }

  nudgeToward(b: Vector, d: number) {
    return this.nudge(Vector.vec(this, b).uni(), d)
  }

  static nudgeToward(a: Vector, b: Vector, d: number) {
    return Vector.nudge(a, Vector.vec(a, b).uni(), d)
  }

  int(b: Vector, from: number, to: number, s: number) {
    const t = (Math.max(from, to) - from) / (to - from)
    this.add(Vector.mul(this, 1 - t).add(Vector.mul(b, s)))
    return this
  }

  static int(a: Vector, b: Vector, from: number, to: number, s: number) {
    const n = new Vector(a)
    const t = (Math.max(from, to) - from) / (to - from)
    n.add(Vector.mul(a, 1 - t).add(Vector.mul(b, s)))
    return n
  }

  equals(b: Vector) {
    return this.x === b.x && this.y === b.y
  }

  static equals(a: Vector, b: Vector) {
    return a.x === b.x && a.y === b.y
  }

  abs() {
    this.x = Math.abs(this.x)
    this.y = Math.abs(this.y)
    return this
  }

  static abs(a: Vector) {
    const n = new Vector(a)
    n.x = Math.abs(n.x)
    n.y = Math.abs(n.y)
    return n
  }

  len() {
    return Math.hypot(this.x, this.y)
  }

  static len(a: Vector) {
    return Math.hypot(a.x, a.y)
  }

  len2() {
    return this.x * this.x + this.y * this.y
  }

  static len2(a: Vector) {
    return a.x * a.x + a.y * a.y
  }

  per() {
    const t = this.x
    this.x = this.y
    this.y = -t
    return this
  }

  static per(a: Vector) {
    const n = new Vector(a)
    n.x = n.y
    n.y = -a.x
    return n
  }

  neg() {
    this.x *= -1
    this.y *= -1
    return this
  }

  static neg(v: Vector) {
    const n = new Vector(v)
    n.x *= -1
    n.y *= -1
    return n
  }

  uni() {
    return this.div(this.len())
  }

  static uni(v: Vector) {
    const n = new Vector(v)
    return n.div(n.len())
  }

  normalize() {
    return this.uni()
  }

  static normalize(v: Vector) {
    return Vector.uni(v)
  }

  isLeft(center: Vector, b: Vector) {
    return (
      (center.x - this.x) * (b.y - this.y) - (b.x - this.x) * (center.y - b.y)
    )
  }

  static isLeft(center: Vector, a: Vector, b: Vector) {
    return (center.x - a.x) * (b.y - a.y) - (b.x - a.x) * (center.y - b.y)
  }

  static ang3(center: Vector, a: Vector, b: Vector) {
    const v1 = Vector.vec(center, a)
    const v2 = Vector.vec(center, b)
    return Vector.ang(v1, v2)
  }

  static clockwise(center: Vector, a: Vector, b: Vector) {
    return Vector.isLeft(center, a, b) > 0
  }

  static cast(v: Point | Vector) {
    return "cast" in v ? v : new Vector(v)
  }

  static from(v: Vector) {
    return new Vector(v)
  }

  nearestPointOnLineThroughPoint(b: Vector, u: Vector) {
    return this.clone().add(u.clone().mul(Vector.sub(this, b).pry(u)))
  }

  static nearestPointOnLineThroughPoint(a: Vector, b: Vector, u: Vector) {
    return a.clone().add(u.clone().mul(Vector.sub(a, b).pry(u)))
  }

  distanceToLineThroughPoint(b: Vector, u: Vector) {
    return this.dist(Vector.nearestPointOnLineThroughPoint(b, u, this))
  }

  static distanceToLineThroughPoint(a: Vector, b: Vector, u: Vector) {
    return a.dist(Vector.nearestPointOnLineThroughPoint(b, u, a))
  }

  nearestPointOnLineSegment(p0: Vector, p1: Vector, clamp = true) {
    return Vector.nearestPointOnLineSegment(this, p0, p1, clamp)
  }

  static nearestPointOnLineSegment(
    a: Vector,
    p0: Vector,
    p1: Vector,
    clamp = true
  ) {
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

  distanceToLineSegment(p0: Vector, p1: Vector, clamp = true) {
    return Vector.distanceToLineSegment(this, p0, p1, clamp)
  }

  static distanceToLineSegment(
    a: Vector,
    p0: Vector,
    p1: Vector,
    clamp = true
  ) {
    return Vector.dist(a, Vector.nearestPointOnLineSegment(a, p0, p1, clamp))
  }
}
