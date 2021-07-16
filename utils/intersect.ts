import { Bounds } from 'types'
import vec from 'utils/vec'
import { isAngleBetween } from './utils'

/* ----------------- Start Copy Here ---------------- */

class Intersection {
  didIntersect: boolean
  message: string
  points: number[][]

  constructor(message: string, ...points: number[][]) {
    this.didIntersect = points.length > 0
    this.message = message
    this.points = points
  }
}

export default class Intersect {
  static ray = {
    // Intersect a ray with a ray.
    ray(p0: number[], n0: number[], p1: number[], n1: number[]): Intersection {
      const dx = p1[0] - p0[0]
      const dy = p1[1] - p0[1]
      const det = n1[0] * n0[1] - n1[1] * n0[0]
      const u = (dy * n1[0] - dx * n1[1]) / det
      const v = (dy * n0[0] - dx * n0[1]) / det
      if (u < 0 || v < 0) return new Intersection('miss')

      const m0 = n0[1] / n0[0]
      const m1 = n1[1] / n1[0]
      const b0 = p0[1] - m0 * p0[0]
      const b1 = p1[1] - m1 * p1[0]
      const x = (b1 - b0) / (m0 - m1)
      const y = m0 * x + b0

      return Number.isFinite(x)
        ? new Intersection('intersection', [x, y])
        : new Intersection('parallel')
    },

    // Interseg a ray with a line segment.
    lineSegment(
      origin: number[],
      direction: number[],
      a1: number[],
      a2: number[]
    ): Intersection {
      const [x, y] = origin
      const [dx, dy] = direction
      const [x1, y1] = a1
      const [x2, y2] = a2

      if (dy / dx != (y2 - y1) / (x2 - x1)) {
        const d = dx * (y2 - y1) - dy * (x2 - x1)
        if (d != 0) {
          const r = ((y - y1) * (x2 - x1) - (x - x1) * (y2 - y1)) / d
          const s = ((y - y1) * dx - (x - x1) * dy) / d
          if (r >= 0 && s >= 0 && s <= 1) {
            return new Intersection('intersection', [x + r * dx, y + r * dy])
          }
        }
      }
      return new Intersection('no intersection')
    },

    // Intersect a ray with a rectangle.
    rectangle(
      origin: number[],
      direction: number[],
      point: number[],
      size: number[]
    ): Intersection[] {
      return Intersect.rectangle.ray(point, size, origin, direction)
    },

    // Intersect a ray with a bounding box.
    bounds(
      origin: number[],
      direction: number[],
      bounds: Bounds
    ): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.ray.rectangle(
        origin,
        direction,
        [minX, minY],
        [width, height]
      )
    },
  }

  static lineSegment = {
    // Intersect a line segment with a ray.
    ray(
      a1: number[],
      a2: number[],
      origin: number[],
      direction: number[]
    ): Intersection {
      return Intersect.ray.lineSegment(origin, direction, a1, a2)
    },

    // Intersect a line segment with a line segment.
    lineSegment(
      a1: number[],
      a2: number[],
      b1: number[],
      b2: number[]
    ): Intersection {
      const AB = vec.sub(a1, b1)
      const BV = vec.sub(b2, b1)
      const AV = vec.sub(a2, a1)

      const ua_t = BV[0] * AB[1] - BV[1] * AB[0]
      const ub_t = AV[0] * AB[1] - AV[1] * AB[0]
      const u_b = BV[1] * AV[0] - BV[0] * AV[1]

      if (ua_t === 0 || ub_t === 0) {
        return new Intersection('coincident')
      }

      if (u_b === 0) {
        return new Intersection('parallel')
      }

      if (u_b != 0) {
        const ua = ua_t / u_b
        const ub = ub_t / u_b
        if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
          return new Intersection('intersection', vec.add(a1, vec.mul(AV, ua)))
        }
      }

      return new Intersection('no intersection')
    },

    // Intersect a line segment with a rectangle
    rectangle(
      a1: number[],
      a2: number[],
      point: number[],
      size: number[]
    ): Intersection[] {
      return Intersect.rectangle.lineSegment(point, size, a1, a2)
    },

    // Intersect a line segment with an arc.
    arc(
      a1: number[],
      a2: number[],
      center: number[],
      radius: number,
      start: number[],
      end: number[]
    ): Intersection {
      const sa = vec.angle(center, start)
      const ea = vec.angle(center, end)
      const ellipseTest = Intersect.ellipse.lineSegment(
        center,
        radius,
        radius,
        0,
        a1,
        a2
      )

      if (!ellipseTest.didIntersect) return new Intersection('No intersection')

      const points = ellipseTest.points.filter((point) =>
        isAngleBetween(sa, ea, vec.angle(center, point))
      )

      if (points.length === 0) {
        return new Intersection('No intersection')
      }

      return new Intersection('intersection', ...points)
    },

    // Intersect a line segment with a circle.
    circle(a1: number[], a2: number[], c: number[], r: number): Intersection {
      const a =
        (a2[0] - a1[0]) * (a2[0] - a1[0]) + (a2[1] - a1[1]) * (a2[1] - a1[1])
      const b =
        2 *
        ((a2[0] - a1[0]) * (a1[0] - c[0]) + (a2[1] - a1[1]) * (a1[1] - c[1]))
      const cc =
        c[0] * c[0] +
        c[1] * c[1] +
        a1[0] * a1[0] +
        a1[1] * a1[1] -
        2 * (c[0] * a1[0] + c[1] * a1[1]) -
        r * r

      const deter = b * b - 4 * a * cc

      if (deter < 0) {
        return new Intersection('outside')
      }

      if (deter === 0) {
        return new Intersection('tangent')
      }

      const e = Math.sqrt(deter)
      const u1 = (-b + e) / (2 * a)
      const u2 = (-b - e) / (2 * a)
      if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
        if ((u1 < 0 && u2 < 0) || (u1 > 1 && u2 > 1)) {
          return new Intersection('outside')
        } else {
          return new Intersection('inside')
        }
      }

      const results: number[][] = []
      if (0 <= u1 && u1 <= 1) results.push(vec.lrp(a1, a2, u1))
      if (0 <= u2 && u2 <= 1) results.push(vec.lrp(a1, a2, u2))

      return new Intersection('intersection', ...results)
    },

    // Intersect a line segment with an ellipse.
    ellipse(
      a1: number[],
      a2: number[],
      center: number[],
      rx: number,
      ry: number,
      rotation = 0
    ): Intersection {
      // If the ellipse or line segment are empty, return no tValues.
      if (rx === 0 || ry === 0 || vec.isEqual(a1, a2)) {
        return new Intersection('No intersection')
      }

      // Get the semimajor and semiminor axes.
      rx = rx < 0 ? rx : -rx
      ry = ry < 0 ? ry : -ry

      // Rotate points and translate so the ellipse is centered at the origin.
      a1 = vec.sub(vec.rotWith(a1, center, -rotation), center)
      a2 = vec.sub(vec.rotWith(a2, center, -rotation), center)

      // Calculate the quadratic parameters.
      const diff = vec.sub(a2, a1)

      const A = (diff[0] * diff[0]) / rx / rx + (diff[1] * diff[1]) / ry / ry
      const B =
        (2 * a1[0] * diff[0]) / rx / rx + (2 * a1[1] * diff[1]) / ry / ry
      const C = (a1[0] * a1[0]) / rx / rx + (a1[1] * a1[1]) / ry / ry - 1

      // Make a list of t values (normalized points on the line where intersections occur).
      const tValues: number[] = []

      // Calculate the discriminant.
      const discriminant = B * B - 4 * A * C

      if (discriminant === 0) {
        // One real solution.
        tValues.push(-B / 2 / A)
      } else if (discriminant > 0) {
        const root = Math.sqrt(discriminant)
        // Two real solutions.
        tValues.push((-B + root) / 2 / A)
        tValues.push((-B - root) / 2 / A)
      }

      // Filter to only points that are on the segment.
      // Solve for points, then counter-rotate points.
      const points = tValues
        .filter((t) => t >= 0 && t <= 1)
        .map((t) => vec.add(center, vec.add(a1, vec.mul(vec.sub(a2, a1), t))))
        .map((p) => vec.rotWith(p, center, rotation))

      return new Intersection('intersection', ...points)
    },

    // Intersect a line segment with a bounding box.
    bounds(a1: number[], a2: number[], bounds: Bounds): Intersection[] {
      return Intersect.bounds.lineSegment(bounds, a1, a2)
    },

    // Intersect a line segment with a polyline
    polyline(a1: number[], a2: number[], points: number[][]): Intersection[] {
      const intersections: Intersection[] = []

      for (let i = 1; i < points.length; i++) {
        const int = Intersect.lineSegment.lineSegment(
          a1,
          a2,
          points[i - 1],
          points[i]
        )

        if (int) {
          intersections.push(int)
        }
      }

      return intersections
    },
  }

  static rectangle = {
    // Intersect a rectangle with a ray.
    ray(
      point: number[],
      size: number[],
      origin: number[],
      direction: number[]
    ): Intersection[] {
      const sideIntersections = getRectangleSides(point, size).reduce<
        Intersection[]
      >((acc, [message, [a1, a2]]) => {
        const intersection = Intersect.ray.lineSegment(
          origin,
          direction,
          a1,
          a2
        )

        if (intersection) {
          acc.push(new Intersection(message, ...intersection.points))
        }

        return acc
      }, [])

      return sideIntersections.filter((int) => int.didIntersect)
    },

    // Intersect a rectangle with a line segment.
    lineSegment(
      point: number[],
      size: number[],
      a1: number[],
      a2: number[]
    ): Intersection[] {
      const sideIntersections = getRectangleSides(point, size).reduce<
        Intersection[]
      >((acc, [message, [b1, b2]]) => {
        const intersection = Intersect.lineSegment.lineSegment(a1, a2, b1, b2)

        if (intersection) {
          acc.push(new Intersection(message, ...intersection.points))
        }

        return acc
      }, [])

      return sideIntersections.filter((int) => int.didIntersect)
    },

    // Intersect a rectangle with a rectangle.
    rectangle(
      point1: number[],
      size1: number[],
      point2: number[],
      size2: number[]
    ): Intersection[] {
      const sideIntersections = getRectangleSides(point1, size1).reduce<
        Intersection[]
      >((acc, [message, [a1, a2]]) => {
        const intersections = Intersect.rectangle.lineSegment(
          point2,
          size2,
          a1,
          a2
        )

        acc.push(
          ...intersections.map(
            (int) =>
              new Intersection(`${message} ${int.message}`, ...int.points)
          )
        )

        return acc
      }, [])

      return sideIntersections.filter((int) => int.didIntersect)
    },

    // Intersect a rectangle with an arc.
    arc(
      point: number[],
      size: number[],
      center: number[],
      radius: number,
      start: number[],
      end: number[]
    ): Intersection[] {
      const sideIntersections = getRectangleSides(point, size).reduce<
        Intersection[]
      >((acc, [message, [a1, a2]]) => {
        const intersection = Intersect.arc.lineSegment(
          center,
          radius,
          start,
          end,
          a1,
          a2
        )

        if (intersection) {
          acc.push({ ...intersection, message })
        }

        return acc
      }, [])

      return sideIntersections.filter((int) => int.didIntersect)
    },

    // Intersect a rectangle with a circle.
    circle(
      point: number[],
      size: number[],
      c: number[],
      r: number
    ): Intersection[] {
      const sideIntersections = getRectangleSides(point, size).reduce<
        Intersection[]
      >((acc, [message, [a1, a2]]) => {
        const intersection = Intersect.lineSegment.circle(a1, a2, c, r)

        if (intersection) {
          acc.push({ ...intersection, message })
        }

        return acc
      }, [])

      return sideIntersections.filter((int) => int.didIntersect)
    },

    // Intersect a rectangle with an ellipse.
    ellipse(
      point: number[],
      size: number[],
      c: number[],
      rx: number,
      ry: number,
      rotation = 0
    ): Intersection[] {
      const sideIntersections = getRectangleSides(point, size).reduce<
        Intersection[]
      >((acc, [message, [a1, a2]]) => {
        const intersection = Intersect.lineSegment.ellipse(
          a1,
          a2,
          c,
          rx,
          ry,
          rotation
        )

        if (intersection) {
          acc.push({ ...intersection, message })
        }

        return acc
      }, [])

      return sideIntersections.filter((int) => int.didIntersect)
    },

    // Intersect a rectangle with a bounding box.
    bounds(point: number[], size: number[], bounds: Bounds): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.rectangle.rectangle(
        point,
        size,
        [minX, minY],
        [width, height]
      )
    },

    // Intersect a rectangle with a polyline
    polyline(
      point: number[],
      size: number[],
      points: number[][]
    ): Intersection[] {
      const sideIntersections = getRectangleSides(point, size).reduce<
        Intersection[]
      >((acc, [message, [a1, a2]]) => {
        const intersections = Intersect.lineSegment.polyline(a1, a2, points)

        if (intersections.length > 0) {
          acc.push(
            new Intersection(message, ...intersections.flatMap((i) => i.points))
          )
        }

        return acc
      }, [])

      return sideIntersections.filter((int) => int.didIntersect)
    },
  }

  static arc = {
    // Intersect an arc with a line segment.
    lineSegment(
      center: number[],
      radius: number,
      start: number[],
      end: number[],
      a1: number[],
      a2: number[]
    ): Intersection {
      return Intersect.lineSegment.arc(a1, a2, center, radius, start, end)
    },

    // Intersect an arc with a rectangle.
    rectangle(
      center: number[],
      radius: number,
      start: number[],
      end: number[],
      point: number[],
      size: number[]
    ): Intersection[] {
      return Intersect.rectangle.arc(point, size, center, radius, start, end)
    },

    // Intersect an arc with a bounding box.
    bounds(
      center: number[],
      radius: number,
      start: number[],
      end: number[],
      bounds: Bounds
    ): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.arc.rectangle(
        center,
        radius,
        start,
        end,
        [minX, minY],
        [width, height]
      )
    },
  }

  static circle = {
    // Intersect a circle with a line segment.
    lineSegment(
      c: number[],
      r: number,
      a1: number[],
      a2: number[]
    ): Intersection {
      return Intersect.lineSegment.circle(a1, a2, c, r)
    },

    // Intersect a circle with a circle.
    circle(c1: number[], r1: number, c2: number[], r2: number): Intersection {
      let dx = c2[0] - c1[0],
        dy = c2[1] - c1[1]

      const d = Math.sqrt(dx * dx + dy * dy),
        x = (d * d - r2 * r2 + r1 * r1) / (2 * d),
        y = Math.sqrt(r1 * r1 - x * x)

      dx /= d
      dy /= d

      return new Intersection(
        'intersection',
        [c1[0] + dx * x - dy * y, c1[1] + dy * x + dx * y],
        [c1[0] + dx * x + dy * y, c1[1] + dy * x - dx * y]
      )
    },

    // Intersect a circle with a rectangle.
    rectangle(
      c: number[],
      r: number,
      point: number[],
      size: number[]
    ): Intersection[] {
      return Intersect.rectangle.circle(point, size, c, r)
    },

    // Intersect a circle with a bounding box.
    bounds(c: number[], r: number, bounds: Bounds): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.circle.rectangle(c, r, [minX, minY], [width, height])
    },
  }

  static ellipse = {
    // Intersect an ellipse with a line segment
    lineSegment(
      center: number[],
      rx: number,
      ry: number,
      rotation = 0,
      a1: number[],
      a2: number[]
    ): Intersection {
      if (rx === ry) {
        return Intersect.lineSegment.circle(a1, a2, center, rx)
      }

      return Intersect.lineSegment.ellipse(a1, a2, center, rx, ry, rotation)
    },

    // Intersect an ellipse with a rectangle.
    rectangle(
      center: number[],
      rx: number,
      ry: number,
      rotation = 0,
      point: number[],
      size: number[]
    ): Intersection[] {
      if (rx === ry) {
        return Intersect.rectangle.circle(point, size, center, rx)
      }

      return Intersect.rectangle.ellipse(point, size, center, rx, ry, rotation)
    },

    // Get an intersection between an ellipse and a second ellipse.
    // Adapted from https://gist.github.com/drawable/92792f59b6ff8869d8b1
    ellipse(
      c1: number[],
      rx1: number,
      ry1: number,
      rotation1: number,
      c2: number[],
      rx2: number,
      ry2: number,
      rotation2: number
    ): Intersection {
      // If both ellipses are circles, intersect as circles
      if (rx1 === ry1 && rx2 === ry2) {
        return Intersect.circle.circle(c1, rx1, c2, rx2)
      }

      if (
        // Congruent ellipses including rotation
        ((rotation1 === rotation2 ||
          Math.abs(rotation1 - rotation2) === Math.PI) &&
          rx1 === rx2 &&
          ry1 === ry2) ||
        // Congruent ellipses including rotation but one is 90 degrees rotated and the radius sizes are swapped
        ((Math.abs(rotation1 - rotation2) === Math.PI / 2 ||
          Math.abs(rotation1 - rotation2) === (Math.PI * 3) / 2) &&
          rx1 === ry2 &&
          ry1 === rx2)
      ) {
        // Special case: There are at max two intersection points: We can construct a line that runs through these points
        const line = getEELine(c1, rx1, ry1, rotation1, c2)
        return Intersect.lineSegment.ellipse(
          line[0],
          line[1],
          c1,
          rx1,
          ry1,
          rotation1
        )
      } else {
        // General solution.
        const mPI1 = rotation1 % Math.PI
        const mPI2 = rotation2 % Math.PI
        let corr = 0

        if (mPI1 === 0 || mPI2 === 0) {
          corr = 0.05
        }

        let e1: number[]
        let e2: number[]

        if (corr !== 0) {
          e1 = getEEQuadradic(c1, rx1, ry1, rotation1 + corr)
          e2 = getEEQuadradic(
            vec.rotWith(c2, c2, corr),
            rx1,
            ry1,
            rotation2 + corr
          )
        } else {
          e1 = getEEQuadradic(c1, rx1, ry1, rotation1)
          e2 = getEEQuadradic(c2, rx2, ry2, rotation2)
        }

        const q = getEEQuartics(e1, e2)
        const y = getYFromQuartics(q)
        const v = calculatePointsFromQuartics(y, e1, e2)

        if (corr) {
          for (let i = 0; i < v.length; i++) {
            v[i] = vec.rotWith(v[i], c1, -corr)
          }
        }
      }
    },

    circle(
      c: number[],
      rx: number,
      ry: number,
      rotation: number,
      c2: number[],
      r2: number
    ): Intersection {
      return Intersect.ellipse.ellipse(c, rx, ry, rotation, c2, r2, r2, 0)
    },

    // Intersect an ellipse with a bounding box.
    bounds(
      c: number[],
      rx: number,
      ry: number,
      rotation: number,
      bounds: Bounds
    ): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.ellipse.rectangle(
        c,
        rx,
        ry,
        rotation,
        [minX, minY],
        [width, height]
      )
    },
  }

  static bounds = {
    ray(bounds: Bounds, origin: number[], direction: number[]): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.ray.rectangle(
        origin,
        direction,
        [minX, minY],
        [width, height]
      )
    },

    lineSegment(bounds: Bounds, a1: number[], a2: number[]): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.lineSegment.rectangle(
        a1,
        a2,
        [minX, minY],
        [width, height]
      )
    },

    rectangle(bounds: Bounds, point: number[], size: number[]): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.rectangle.rectangle(
        point,
        size,
        [minX, minY],
        [width, height]
      )
    },

    bounds(bounds1: Bounds, bounds2: Bounds): Intersection[] {
      return Intersect.rectangle.rectangle(
        [bounds1.minX, bounds1.minY],
        [bounds1.width, bounds1.height],
        [bounds2.minX, bounds2.minY],
        [bounds2.width, bounds2.height]
      )
    },

    arc(
      bounds: Bounds,
      center: number[],
      radius: number,
      start: number[],
      end: number[]
    ): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.arc.rectangle(
        center,
        radius,
        start,
        end,
        [minX, minY],
        [width, height]
      )
    },

    circle(bounds: Bounds, c: number[], r: number): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.circle.rectangle(c, r, [minX, minY], [width, height])
    },

    ellipse(
      bounds: Bounds,
      c: number[],
      rx: number,
      ry: number,
      rotation = 0
    ): Intersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.ellipse.rectangle(
        c,
        rx,
        ry,
        rotation,
        [minX, minY],
        [width, height]
      )
    },

    polyline(bounds: Bounds, points: number[][]): Intersection[] {
      return Intersect.polyline.bounds(points, bounds)
    },
  }

  static polyline = {
    // Intersect a polyline with a line segment.
    lineSegment(
      points: number[][],
      a1: number[],
      a2: number[]
    ): Intersection[] {
      return Intersect.lineSegment.polyline(a1, a2, points)
    },

    // Interesct a polyline with a rectangle.
    rectangle(
      points: number[][],
      point: number[],
      size: number[]
    ): Intersection[] {
      return Intersect.rectangle.polyline(point, size, points)
    },

    // Intersect a polyline with a bounding box.
    bounds(points: number[][], bounds: Bounds): Intersection[] {
      return Intersect.rectangle.polyline(
        [bounds.minX, bounds.minY],
        [bounds.width, bounds.height],
        points
      )
    },
  }
}

// export function intersectPolylineBounds(
//   points: number[][],
//   bounds: Bounds
// ): Intersection[] {
//   const { minX, minY, width, height } = bounds
//   const intersections: Intersection[] = []

//   for (let i = 1; i < points.length; i++) {
//     intersections.push(
//       ...intersectRectangleLineSegment(
//         [minX, minY],
//         [width, height],
//         points[i - 1],
//         points[i]
//       )
//     )
//   }

//   return intersections
// }

/* --------------------- Helpers -------------------- */

function getRectangleSides(
  point: number[],
  size: number[]
): [string, number[][]][] {
  const tl = point
  const tr = vec.add(point, [size[0], 0])
  const br = vec.add(point, size)
  const bl = vec.add(point, [0, size[1]])

  return [
    ['top', [tl, tr]],
    ['right', [tr, br]],
    ['bottom', [br, bl]],
    ['left', [bl, tl]],
  ]
}

/* -------------- Rotated Ellipses Math ------------- */

// Calculates the line that runs through the intersection points of two congruent ellipses with the same rotation.
function getEELine(
  o1: number[],
  rx: number,
  ry: number,
  rotation: number,
  o2: number[]
): number[][] {
  const A = Math.cos(rotation)
  const B = Math.sin(rotation)
  const b = rx * rx
  const d = ry * ry
  const a = o1[0]
  const c = o1[1]
  const o = o2[0]
  const p = o2[1]

  const AA = (A * A) / b + (B * B) / d
  const BB = (-2 * A * B) / b + (2 * A * B) / d
  const CC = (B * B) / b + (A * A) / d

  const U = -2 * AA * a + BB * c
  const V = AA * a * a + BB * a * c + CC * c * c
  const W = BB * a + 2 * CC * c

  const X = -2 * AA * o + BB * p
  const Y = BB * o + 2 * CC * p
  const Z = AA * o * o + BB * o * p + CC * p * p

  const a1 = [U - X, Y - W]
  const a2 = vec.mul(a1, Z - V)

  return [a1, a2]
}

// Create a general quadratic function for the ellipse a x^2 + b x y + c y^2 + d x + e y + c = 0
function getEEQuadradic(
  center: number[],
  rx: number,
  ry: number,
  rotation: number
): number[] {
  const a = center[0]
  const b = rx * rx
  const c = center[1]
  const d = ry * ry
  const A = Math.cos(-rotation)
  const B = Math.sin(-rotation)

  return [
    (A * A) / b + (B * B) / d, // x^2
    (2 * A * B) / d - (2 * A * B) / b, // x * y
    (A * A) / d + (B * B) / b, // y^2

    (2 * A * B * c - 2 * a * A * A) / b + (-2 * a * B * B - 2 * A * B * c) / d, // x

    (2 * a * A * B - 2 * B * B * c) / b + (-2 * a * A * B - 2 * A * A * c) / d, // y

    (a * a * A * A - 2 * a * A * B * c + B * B * c * c) / b +
      (a * a * B * B + 2 * a * A * B * c + A * A * c * c) / d -
      1, // Const
  ]
}

function getEEQuartics(q1: number[], q2: number[]) {
  const [a1, b1, c1, d1, e1, f1] = q1

  const [a2, b2, c2, d2, e2, f2] = q2

  return [
    f1 * a1 * d2 * d2 +
      a1 * a1 * f2 * f2 -
      d1 * a1 * d2 * f2 +
      a2 * a2 * f1 * f1 -
      2 * a1 * f2 * a2 * f1 -
      d1 * d2 * a2 * f1 +
      a2 * d1 * d1 * f2,
    e2 * d1 * d1 * a2 -
      f2 * d2 * a1 * b1 -
      2 * a1 * f2 * a2 * e1 -
      f1 * a2 * b2 * d1 +
      2 * d2 * b2 * a1 * f1 +
      2 * e2 * f2 * a1 * a1 +
      d2 * d2 * a1 * e1 -
      e2 * d2 * a1 * d1 -
      2 * a1 * e2 * a2 * f1 -
      f1 * a2 * d2 * b1 +
      2 * f1 * e1 * a2 * a2 -
      f2 * b2 * a1 * d1 -
      e1 * a2 * d2 * d1 +
      2 * f2 * b1 * a2 * d1,
    e2 * e2 * a1 * a1 +
      2 * c2 * f2 * a1 * a1 -
      e1 * a2 * d2 * b1 +
      f2 * a2 * b1 * b1 -
      e1 * a2 * b2 * d1 -
      f2 * b2 * a1 * b1 -
      2 * a1 * e2 * a2 * e1 +
      2 * d2 * b2 * a1 * e1 -
      c2 * d2 * a1 * d1 -
      2 * a1 * c2 * a2 * f1 +
      b2 * b2 * a1 * f1 +
      2 * e2 * b1 * a2 * d1 +
      e1 * e1 * a2 * a2 -
      c1 * a2 * d2 * d1 -
      e2 * b2 * a1 * d1 +
      2 * f1 * c1 * a2 * a2 -
      f1 * a2 * b2 * b1 +
      c2 * d1 * d1 * a2 +
      d2 * d2 * a1 * c1 -
      e2 * d2 * a1 * b1 -
      2 * a1 * f2 * a2 * c1,
    -2 * a1 * a2 * c1 * e2 +
      e2 * a2 * b1 * b1 +
      2 * c2 * b1 * a2 * d1 -
      c1 * a2 * b2 * d1 +
      b2 * b2 * a1 * e1 -
      e2 * b2 * a1 * b1 -
      2 * a1 * c2 * a2 * e1 -
      e1 * a2 * b2 * b1 -
      c2 * b2 * a1 * d1 +
      2 * e2 * c2 * a1 * a1 +
      2 * e1 * c1 * a2 * a2 -
      c1 * a2 * d2 * b1 +
      2 * d2 * b2 * a1 * c1 -
      c2 * d2 * a1 * b1,
    a1 * a1 * c2 * c2 -
      2 * a1 * c2 * a2 * c1 +
      a2 * a2 * c1 * c1 -
      b1 * a1 * b2 * c2 -
      b1 * b2 * a2 * c1 +
      b1 * b1 * a2 * c2 +
      c1 * a1 * b2 * b2,
  ]
}

function getYFromQuartics(quartics: number[]) {
  const [e, d, c, b, a] = quartics

  const d0 = c * c - 3 * b * d + 12 * a * e
  const d1 =
    2 * c * c * c -
    9 * b * c * d +
    27 * b * b * e +
    27 * a * d * d -
    72 * a * c * e

  const p = (8 * a * c - 3 * b * b) / (8 * a * a)
  const q = (b * b * b - 4 * a * b * c + 8 * a * a * d) / (8 * a * a * a)

  let Q: number, S: number

  const phi = Math.acos(d1 / (2 * Math.sqrt(d0 * d0 * d0)))

  if (Number.isNaN(phi) && d1 === 0) {
    Q = d1 + Math.sqrt(d1 * d1 - 4 * d0 * d0 * d0)
    Q = Q / 2
    Q = Math.pow(Q, 1 / 3)
    S = 0.5 * Math.sqrt((-2 / 3) * p + (1 / (3 * a)) * (Q + d0 / Q))
  } else {
    S =
      0.5 *
      Math.sqrt(
        (-2 / 3) * p + (2 / (3 * a)) * Math.sqrt(d0) * Math.cos(phi / 3)
      )
  }

  const y = []

  if (S !== 0) {
    let R = -4 * S * S - 2 * p + q / S
    if (R === 0) {
      R = 0
    }

    if (R > 0) {
      R = 0.5 * Math.sqrt(R)
      y.push(-b / (4 * a) - S + R)
      y.push(-b / (4 * a) - S - R)
    } else if (R === 0) {
      y.push(-b / (4 * a) - S)
    }

    R = -4 * S * S - 2 * p - q / S
    if (R === 0) {
      R = 0
    }
    if (R > 0) {
      R = 0.5 * Math.sqrt(R)
      y.push(-b / (4 * a) + S + R)
      y.push(-b / (4 * a) + S - R)
    } else if (R === 0) {
      y.push(-b / (4 * a) + S)
    }
  }

  return y
}

function calculatePointsFromQuartics(
  y: number[],
  eq1: number[],
  eq2: number[]
): number[][] {
  const [a1, b1, c1, d1, e1, f1] = eq1
  const [a2, b2, c2, d2, e2, f2] = eq2

  const r: number[][] = []

  for (let i = 0; i < y.length; i++) {
    const x =
      -(
        a1 * f2 +
        a1 * c2 * y[i] * y[i] -
        a2 * c1 * y[i] * y[i] +
        a1 * e2 * y[i] -
        a2 * e1 * y[i] -
        a2 * f1
      ) /
      (a1 * b2 * y[i] + a1 * d2 - a2 * b1 * y[i] - a2 * d1)

    r.push([x, y[i]])
  }

  return r
}
