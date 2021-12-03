import Vec from '@tldraw/vec'
import { PI, PI2, TAU } from '~constants'

export class GeomUtils {
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
    const p = PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
    return p
  }

  /**
   * Get the short angle distance between two angles.
   * @param a0
   * @param a1
   */
  static shortAngleDist(a0: number, a1: number): number {
    const da = (a1 - a0) % PI2
    return ((2 * da) % PI2) - da
  }

  /**
   * Get the long angle distance between two angles.
   * @param a0
   * @param a1
   */
  static longAngleDist(a0: number, a1: number): number {
    return PI2 - GeomUtils.shortAngleDist(a0, a1)
  }

  /**
   * Interpolate an angle between two angles.
   * @param a0
   * @param a1
   * @param t
   */
  static lerpAngles(a0: number, a1: number, t: number): number {
    return a0 + GeomUtils.shortAngleDist(a0, a1) * t
  }

  /**
   * Get the short distance between two angles.
   * @param a0
   * @param a1
   */
  static angleDelta(a0: number, a1: number): number {
    return GeomUtils.shortAngleDist(a0, a1)
  }

  /**
   * Get the "sweep" or short distance between two points on a circle's perimeter.
   * @param C
   * @param A
   * @param B
   */
  static getSweep(C: number[], A: number[], B: number[]): number {
    return GeomUtils.angleDelta(Vec.angle(C, A), Vec.angle(C, B))
  }

  /**
   * Clamp radians within 0 and 2PI
   * @param r
   */
  static clampRadians(r: number): number {
    return (PI2 + r) % PI2
  }

  /**
   * Clamp rotation to even segments.
   * @param r
   * @param segments
   */
  static snapAngleToSegments(r: number, segments: number): number {
    const seg = PI2 / segments
    let ang = (Math.floor((GeomUtils.clampRadians(r) + seg / 2) / seg) * seg) % PI2
    if (ang < PI) ang += PI2
    if (ang > PI) ang -= PI2
    return ang
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
    return AB <= PI !== AC > AB
  }

  /**
   * Convert degrees to radians.
   * @param d
   */
  static degreesToRadians(d: number): number {
    return (d * PI) / 180
  }

  /**
   * Convert radians to degrees.
   * @param r
   */
  static radiansToDegrees(r: number): number {
    return (r * 180) / PI
  }

  /**
   * Get the length of an arc between two points on a circle's perimeter.
   * @param C
   * @param r
   * @param A
   * @param B
   */
  static getArcLength(C: number[], r: number, A: number[], B: number[]): number {
    const sweep = GeomUtils.getSweep(C, A, B)
    return r * PI2 * (sweep / PI2)
  }

  static getSweepFlag(A: number[], B: number[], C: number[]) {
    const angleAC = Vec.angle(A, C)
    const angleAB = Vec.angle(A, B)
    const angleCAB = ((angleAB - angleAC + 3 * PI) % PI2) - PI
    return angleCAB > 0 ? 0 : 1
  }

  static getLargeArcFlag(A: number[], C: number[], P: number[]) {
    const anglePA = Vec.angle(P, A)
    const anglePC = Vec.angle(P, C)
    const angleAPC = ((anglePC - anglePA + 3 * PI) % PI2) - PI
    return Math.abs(angleAPC) > TAU ? 0 : 1
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
    const del0 = GeomUtils.getSweepFlag(C, A, B)
    const len0 = GeomUtils.getArcLength(C, r, A, B)
    const off0 = del0 < 0 ? len0 : PI2 * C[2] - len0
    return -off0 / 2 + step
  }

  /**
   * Get a dash offset for an ellipse, based on its length.
   * @param A
   * @param step
   */
  static getEllipseDashOffset(A: number[], step: number): number {
    const c = PI2 * A[2]
    return -c / 2 + -step
  }
}
