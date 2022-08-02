/* eslint-disable @typescript-eslint/no-extra-semi */
import { Vec } from '@tldraw/vec'
import type React from 'react'
import type { Patch, TLBoundsWithCenter } from '~index'
import { Snap, SnapPoints, TLBounds, TLBoundsCorner, TLBoundsEdge } from '~types'
import './polyfills'

const TAU = Math.PI * 2

export class Utils {
  /* -------------------------------------------------- */
  /*                    Math & Geometry                 */
  /* -------------------------------------------------- */

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

  static lerpColor(color1: string, color2: string, factor = 0.5): string {
    function h2r(hex: string) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!
      return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
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

  /**
   * Recursively clone an object or array.
   * @param obj
   */
  static deepClone<T>(obj: T): T {
    if (obj === null) return obj

    if (Array.isArray(obj)) {
      return [...obj] as unknown as T
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

      return clone as unknown as T
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

  static pointsToLineSegments(points: number[][], closed = false) {
    const segments = []
    for (let i = 1; i < points.length; i++) segments.push([points[i - 1], points[i]])
    if (closed) segments.push([points[points.length - 1], points[0]])
    return segments
  }

  static getRectangleSides(point: number[], size: number[], rotation = 0): [string, number[][]][] {
    const center = [point[0] + size[0] / 2, point[1] + size[1] / 2]
    const tl = Vec.rotWith(point, center, rotation)
    const tr = Vec.rotWith(Vec.add(point, [size[0], 0]), center, rotation)
    const br = Vec.rotWith(Vec.add(point, size), center, rotation)
    const bl = Vec.rotWith(Vec.add(point, [0, size[1]]), center, rotation)

    return [
      ['top', [tl, tr]],
      ['right', [tr, br]],
      ['bottom', [br, bl]],
      ['left', [bl, tl]],
    ]
  }

  /* --------------- Circles and Angles --------------- */

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
    return Utils.angleDelta(Vec.angle(C, A), Vec.angle(C, B))
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
  static snapAngleToSegments(r: number, segments: number): number {
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

    const AB = (b - a + TAU) % TAU
    const AC = (c - a + TAU) % TAU
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

  static getSweepFlag(A: number[], B: number[], C: number[]) {
    const angleAC = Vec.angle(A, C)
    const angleAB = Vec.angle(A, B)
    const angleCAB = ((angleAB - angleAC + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
    return angleCAB > 0 ? 0 : 1
  }

  static getLargeArcFlag(A: number[], C: number[], P: number[]) {
    const anglePA = Vec.angle(P, A)
    const anglePC = Vec.angle(P, C)
    const angleAPC = ((anglePC - anglePA + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
    return Math.abs(angleAPC) > Math.PI / 2 ? 0 : 1
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
    const del0 = Utils.getSweepFlag(C, A, B)
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

  /* -------------------- Hit Tests ------------------- */

  /**
   * Get whether a point is inside of a circle.
   * @param A
   * @param b
   * @returns
   */
  static pointInCircle(A: number[], C: number[], r: number): boolean {
    return Vec.dist(A, C) <= r
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
    const delta = Vec.sub(A, C)
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
        if (b[1] > p[1] && Vec.cross(a, b, p) > 0) {
          wn += 1
        }
      } else if (b[1] <= p[1] && Vec.cross(a, b, p) < 0) {
        wn -= 1
      }
    })

    return wn !== 0
  }

  /**
   * Get whether a point is inside of a bounds.
   * @param A The point to check.
   * @param b The bounds to check.
   * @returns
   */
  static pointInBounds(A: number[], b: TLBounds): boolean {
    return !(A[0] < b.minX || A[0] > b.maxX || A[1] < b.minY || A[1] > b.maxY)
  }

  /**
   * Hit test a point and a polyline using a minimum distance.
   * @param A The point to check.
   * @param points The points that make up the polyline.
   * @param distance (optional) The mininum distance that qualifies a hit.
   */
  static pointInPolyline(A: number[], points: number[][], distance = 3): boolean {
    for (let i = 1; i < points.length; i++) {
      if (Vec.distanceToLineSegment(points[i - 1], points[i], A) < distance) {
        return true
      }
    }

    return false
  }

  /* --------------------- Bounds --------------------- */

  static getBoundsSides(bounds: TLBounds): [string, number[][]][] {
    return this.getRectangleSides([bounds.minX, bounds.minY], [bounds.width, bounds.height])
  }

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
        points.map((pt) => Vec.rotWith(pt, [(minX + maxX) / 2, (minY + maxY) / 2], rotation))
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
   * Snap a bounding box to a grid size.
   * @param bounds
   * @param gridSize
   */
  static snapBoundsToGrid(bounds: TLBounds, gridSize: number): TLBounds {
    const minX = Math.round(bounds.minX / gridSize) * gridSize
    const minY = Math.round(bounds.minY / gridSize) * gridSize
    const maxX = Math.round(bounds.maxX / gridSize) * gridSize
    const maxY = Math.round(bounds.maxY / gridSize) * gridSize
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
    const [minX, minY] = Vec.rotWith([bounds.minX, bounds.minY], center, rotation)
    const [maxX, maxY] = Vec.rotWith([bounds.maxX, bounds.maxY], center, rotation)

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
    rotation = 0
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
    ].map((point) => Vec.rotWith(point, center, rotation))
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
    const [dx, dy] = Vec.rot(delta, -rotation)

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

If the bounds are rotated, get a Vector from the rotated anchor
corner in the inital bounds to the rotated anchor corner in the
result's bounds. Subtract this Vector from the result's corners,
so that the two anchor points (initial and result) will be equal.
*/

    if (rotation % (Math.PI * 2) !== 0) {
      let cv = [0, 0]

      const c0 = Vec.med([ax0, ay0], [ax1, ay1])
      const c1 = Vec.med([bx0, by0], [bx1, by1])

      switch (handle) {
        case TLBoundsCorner.TopLeft: {
          cv = Vec.sub(Vec.rotWith([bx1, by1], c1, rotation), Vec.rotWith([ax1, ay1], c0, rotation))
          break
        }
        case TLBoundsCorner.TopRight: {
          cv = Vec.sub(Vec.rotWith([bx0, by1], c1, rotation), Vec.rotWith([ax0, ay1], c0, rotation))
          break
        }
        case TLBoundsCorner.BottomRight: {
          cv = Vec.sub(Vec.rotWith([bx0, by0], c1, rotation), Vec.rotWith([ax0, ay0], c0, rotation))
          break
        }
        case TLBoundsCorner.BottomLeft: {
          cv = Vec.sub(Vec.rotWith([bx1, by0], c1, rotation), Vec.rotWith([ax1, ay0], c0, rotation))
          break
        }
        case TLBoundsEdge.Top: {
          cv = Vec.sub(
            Vec.rotWith(Vec.med([bx0, by1], [bx1, by1]), c1, rotation),
            Vec.rotWith(Vec.med([ax0, ay1], [ax1, ay1]), c0, rotation)
          )
          break
        }
        case TLBoundsEdge.Left: {
          cv = Vec.sub(
            Vec.rotWith(Vec.med([bx1, by0], [bx1, by1]), c1, rotation),
            Vec.rotWith(Vec.med([ax1, ay0], [ax1, ay1]), c0, rotation)
          )
          break
        }
        case TLBoundsEdge.Bottom: {
          cv = Vec.sub(
            Vec.rotWith(Vec.med([bx0, by0], [bx1, by0]), c1, rotation),
            Vec.rotWith(Vec.med([ax0, ay0], [ax1, ay0]), c0, rotation)
          )
          break
        }
        case TLBoundsEdge.Right: {
          cv = Vec.sub(
            Vec.rotWith(Vec.med([bx0, by0], [bx0, by1]), c1, rotation),
            Vec.rotWith(Vec.med([ax0, ay0], [ax0, ay1]), c0, rotation)
          )
          break
        }
      }

      ;[bx0, by0] = Vec.sub([bx0, by0], cv)
      ;[bx1, by1] = Vec.sub([bx1, by1], cv)
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
    const center = Vec.div(size, 2)

    const points = [[0, 0], [size[0], 0], size, [0, size[1]]].map((point) =>
      Vec.rotWith(point, center, rotation)
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

  /**
   * Get a bounding box with a midX and midY.
   * @param bounds
   */
  static getBoundsWithCenter(bounds: TLBounds): TLBoundsWithCenter {
    const center = Utils.getBoundsCenter(bounds)
    return {
      ...bounds,
      midX: center[0],
      midY: center[1],
    }
  }

  /**
   * Given a set of points, get their common [minX, minY].
   * @param points
   */
  static getCommonTopLeft(points: number[][]) {
    const min = [Infinity, Infinity]

    points.forEach((point) => {
      min[0] = Math.min(min[0], point[0])
      min[1] = Math.min(min[1], point[1])
    })

    return min
  }

  static getSnapPoints = (
    bounds: TLBoundsWithCenter,
    others: TLBoundsWithCenter[],
    snapDistance: number
  ) => {
    const A = { ...bounds }

    const offset = [0, 0]

    const snapLines: number[][][] = []

    // 1.
    // Find the snap points for the x and y axes

    const snaps: Record<SnapPoints, Snap> = {
      [SnapPoints.minX]: { id: SnapPoints.minX, isSnapped: false },
      [SnapPoints.midX]: { id: SnapPoints.midX, isSnapped: false },
      [SnapPoints.maxX]: { id: SnapPoints.maxX, isSnapped: false },
      [SnapPoints.minY]: { id: SnapPoints.minY, isSnapped: false },
      [SnapPoints.midY]: { id: SnapPoints.midY, isSnapped: false },
      [SnapPoints.maxY]: { id: SnapPoints.maxY, isSnapped: false },
    }

    const xs = [SnapPoints.midX, SnapPoints.minX, SnapPoints.maxX]
    const ys = [SnapPoints.midY, SnapPoints.minY, SnapPoints.maxY]

    const snapResults = others.map((B) => {
      const rx = xs.flatMap((f, i) =>
        xs.map((t, k) => {
          const gap = A[f] - B[t]
          const distance = Math.abs(gap)
          return {
            f,
            t,
            gap,
            distance,
            isCareful: i === 0 || i + k === 3,
          }
        })
      )

      const ry = ys.flatMap((f, i) =>
        ys.map((t, k) => {
          const gap = A[f] - B[t]
          const distance = Math.abs(gap)
          return {
            f,
            t,
            gap,
            distance,
            isCareful: i === 0 || i + k === 3,
          }
        })
      )

      return [B, rx, ry] as const
    })

    let gapX = Infinity
    let gapY = Infinity

    let minX = Infinity
    let minY = Infinity

    snapResults.forEach(([_, rx, ry]) => {
      rx.forEach((r) => {
        if (r.distance < snapDistance && r.distance < minX) {
          minX = r.distance
          gapX = r.gap
        }
      })

      ry.forEach((r) => {
        if (r.distance < snapDistance && r.distance < minY) {
          minY = r.distance
          gapY = r.gap
        }
      })
    })

    // Check for other shapes with the same gap

    snapResults.forEach(([B, rx, ry]) => {
      if (gapX !== Infinity) {
        rx.forEach((r) => {
          if (Math.abs(r.gap - gapX) < 2) {
            snaps[r.f] = {
              ...snaps[r.f],
              isSnapped: true,
              to: B[r.t],
              B,
              distance: r.distance,
            }
          }
        })
      }

      if (gapY !== Infinity) {
        ry.forEach((r) => {
          if (Math.abs(r.gap - gapY) < 2) {
            snaps[r.f] = {
              ...snaps[r.f],
              isSnapped: true,
              to: B[r.t],
              B,
              distance: r.distance,
            }
          }
        })
      }
    })

    offset[0] = gapX === Infinity ? 0 : gapX
    offset[1] = gapY === Infinity ? 0 : gapY

    A.minX -= offset[0]
    A.midX -= offset[0]
    A.maxX -= offset[0]
    A.minY -= offset[1]
    A.midY -= offset[1]
    A.maxY -= offset[1]

    // 2.
    // Calculate snap lines based on adjusted bounds A. This has
    // to happen after we've adjusted both dimensions x and y of
    // the bounds A!
    xs.forEach((from) => {
      const snap = snaps[from]

      if (!snap.isSnapped) return

      const { id, B } = snap
      const x = A[id]

      // If A is snapped at its center, show include only the midY;
      // otherwise, include both its minY and maxY.
      snapLines.push(
        id === SnapPoints.minX
          ? [
              [x, A.midY],
              [x, B.minY],
              [x, B.maxY],
            ]
          : [
              [x, A.minY],
              [x, A.maxY],
              [x, B.minY],
              [x, B.maxY],
            ]
      )
    })

    ys.forEach((from) => {
      const snap = snaps[from]

      if (!snap.isSnapped) return

      const { id, B } = snap
      const y = A[id]

      snapLines.push(
        id === SnapPoints.midY
          ? [
              [A.midX, y],
              [B.minX, y],
              [B.maxX, y],
            ]
          : [
              [A.minX, y],
              [A.maxX, y],
              [B.minX, y],
              [B.maxX, y],
            ]
      )
    })

    return { offset, snapLines }
  }

  /* -------------------------------------------------- */
  /*                Lists and Collections               */
  /* -------------------------------------------------- */

  static deepMerge = <T>(target: T, patch: Patch<T>): T => {
    const result: T = { ...target }

    const entries = Object.entries(patch) as [keyof T, T[keyof T]][]

    for (const [key, value] of entries)
      result[key] =
        value === Object(value) && !Array.isArray(value)
          ? Utils.deepMerge(result[key], value)
          : value

    return result
  }

  /**
   * Get a value from a cache (a WeakMap), filling the value if it is not present.
   *
   * ### Example
   *
   *```ts
   * getFromCache(boundsCache, shape, (cache) => cache.set(shape, "value"))
   *```
   */
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
  static rotateArray<T>(arr: T[], offset: number): T[] {
    return arr.map((_, i) => arr[(i + offset) % arr.length])
  }

  /**
   * Debounce a function.
   */
  static debounce<T extends (...args: any[]) => void>(fn: T, ms = 0) {
    let timeoutId: number | any
    return function (...args: Parameters<T>) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn.apply(args), ms)
    }
  }

  // Regex to trim numbers to 2 decimal places
  static TRIM_NUMBERS = /(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g

  /**
   * Turn an array of points into a path of quadradic curves.
   * @param stroke ;
   */
  static getSvgPathFromStroke(points: number[][], closed = true): string {
    if (!points.length) {
      return ''
    }

    const max = points.length - 1

    return points
      .reduce(
        (acc, point, i, arr) => {
          if (i === max) {
            if (closed) acc.push('Z')
          } else acc.push(point, Vec.med(point, arr[i + 1]))
          return acc
        },
        ['M', points[0], 'Q']
      )
      .join(' ')
      .replaceAll(this.TRIM_NUMBERS, '$1')
  }

  /* -------------------------------------------------- */
  /*                   Browser and DOM                  */
  /* -------------------------------------------------- */

  /**
   * Get balanced dash-strokearray and dash-strokeoffset properties for a path of a given length.
   * @param length The length of the path.
   * @param strokeWidth The shape's stroke-width property.
   * @param style The stroke's style: "dashed" or "dotted" (default "dashed").
   * @param snap An interval for dashes (e.g. 4 will produce arrays with 4, 8, 16, etc dashes).
   * @param outset Whether to outset the stroke (default false).
   * @param lengthRatio The ratio to apply to dashed lines (default 2).
   */
  static getPerfectDashProps(
    length: number,
    strokeWidth: number,
    style: 'dashed' | 'dotted' | string,
    snap = 1,
    outset = true,
    lengthRatio = 2
  ): {
    strokeDasharray: string
    strokeDashoffset: string
  } {
    let dashLength: number
    let strokeDashoffset: string
    let ratio: number

    if (style.toLowerCase() === 'dashed') {
      dashLength = strokeWidth * lengthRatio
      ratio = 1
      strokeDashoffset = outset ? (dashLength / 2).toString() : '0'
    } else if (style.toLowerCase() === 'dotted') {
      dashLength = strokeWidth / 100
      ratio = 100
      strokeDashoffset = '0'
    } else {
      return {
        strokeDasharray: 'none',
        strokeDashoffset: 'none',
      }
    }

    let dashes = Math.floor(length / dashLength / (2 * ratio))

    dashes -= dashes % snap

    dashes = Math.max(dashes, 4)

    const gapLength = Math.max(
      dashLength,
      (length - dashes * dashLength) / (outset ? dashes : dashes - 1)
    )

    return {
      strokeDasharray: [dashLength, gapLength].join(' '),
      strokeDashoffset,
    }
  }

  static isMobileSafari() {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent
    const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i)
    const webkit = !!ua.match(/WebKit/i)
    return iOS && webkit && !ua.match(/CriOS/i)
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

        // @ts-ignore
        lastResult = func(...args)
      }

      return lastResult
    }
  }

  /**
   * Find whether the current display is a touch display.
   */
  // static isTouchDisplay(): boolean {
  //   return (
  //     'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
  //   )
  // }

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

  /**
   * Reversable psuedo hash.
   * @param str string
   */
  static lns(str: string) {
    const result = str.split('')
    result.push(...result.splice(0, Math.round(result.length / 5)))
    result.push(...result.splice(0, Math.round(result.length / 4)))
    result.push(...result.splice(0, Math.round(result.length / 3)))
    result.push(...result.splice(0, Math.round(result.length / 2)))
    return result
      .reverse()
      .map((n) => (+n ? (+n < 5 ? 5 + +n : +n > 5 ? +n - 5 : n) : n))
      .join('')
  }
}

export default Utils
