import { Bounds } from 'types'
import vec from 'utils/vec'
import { getRectangleSides, isAngleBetween } from './utils'

/* ----------------- Start Copy Here ---------------- */

export class Intersection {
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

    // Intersect a ray with an ellipse.
    ellipse(
      origin: number[],
      direction: number[],
      center: number[],
      rx: number,
      ry: number,
      rotation: number
    ): Intersection {
      const a1 = origin
      const a2 = vec.mul(direction, 999999999)
      return Intersect.lineSegment.ellipse(a1, a2, center, rx, ry, rotation)
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
    // Intersect an ellipse with a ray.
    ray(
      center: number[],
      rx: number,
      ry: number,
      rotation: number,
      point: number[],
      direction: number[]
    ): Intersection {
      return Intersect.ray.ellipse(point, direction, center, rx, ry, rotation)
    },

    // Intersect an ellipse with a line segment.
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
      c2: number[],
      rx2: number,
      ry2: number
    ): Intersection {
      if (rx1 === ry1 && rx2 === ry2) {
        return Intersect.circle.circle(c1, rx1, c2, rx2)
      }

      const a = [
        ry1 * ry1,
        0,
        rx1 * rx1,
        -2 * ry1 * ry1 * c1[0],
        -2 * rx1 * rx1 * c1[1],
        ry1 * ry1 * c1[0] * c1[0] +
          rx1 * rx1 * c1[1] * c1[1] -
          rx1 * rx1 * ry1 * ry1,
      ]
      const b = [
        ry2 * ry2,
        0,
        rx2 * rx2,
        -2 * ry2 * ry2 * c2[0],
        -2 * rx2 * rx2 * c2[1],
        ry2 * ry2 * c2[0] * c2[0] +
          rx2 * rx2 * c2[1] * c2[1] -
          rx2 * rx2 * ry2 * ry2,
      ]

      const yPoly = bezout(a, b)
      const yRoots = getPolynomialRoots(yPoly)
      const epsilon = 1e-3
      const norm0 = (a[0] * a[0] + 2 * a[1] * a[1] + a[2] * a[2]) * epsilon
      const norm1 = (b[0] * b[0] + 2 * b[1] * b[1] + b[2] * b[2]) * epsilon
      const result: number[][] = []

      for (let y = 0; y < yRoots.length; y++) {
        const xRoots = getPolynomialRoots([
          a[0],
          a[3] + yRoots[y] * a[1],
          a[5] + yRoots[y] * (a[4] + yRoots[y] * a[2]),
        ])
        for (let x = 0; x < xRoots.length; x++) {
          let test =
            (a[0] * xRoots[x] + a[1] * yRoots[y] + a[3]) * xRoots[x] +
            (a[2] * yRoots[y] + a[4]) * yRoots[y] +
            a[5]
          if (Math.abs(test) < norm0) {
            test =
              (b[0] * xRoots[x] + b[1] * yRoots[y] + b[3]) * xRoots[x] +
              (b[2] * yRoots[y] + b[4]) * yRoots[y] +
              b[5]
            b[5]
            if (Math.abs(test) < norm1) {
              result.push([xRoots[x], yRoots[y]])
            }
          }
        }
      }
      if (result.length > 0) {
        return new Intersection('no intersection')
      }

      return new Intersection('intersection', ...result)
    },

    circle(
      c: number[],
      rx: number,
      ry: number,
      rotation: number,
      c2: number[],
      r2: number
    ): Intersection {
      return Intersect.ellipse.ellipse(c, rx, ry, c2, r2, r2)
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

// /* -------------- Rotated Ellipses Math ------------- */

function bezout(e1: number[], e2: number[]) {
  const AB = e1[0] * e2[1] - e2[0] * e1[1]
  const AC = e1[0] * e2[2] - e2[0] * e1[2]
  const AD = e1[0] * e2[3] - e2[0] * e1[3]
  const AE = e1[0] * e2[4] - e2[0] * e1[4]
  const AF = e1[0] * e2[5] - e2[0] * e1[5]
  const BC = e1[1] * e2[2] - e2[1] * e1[2]
  const BE = e1[1] * e2[4] - e2[1] * e1[4]
  const BF = e1[1] * e2[5] - e2[1] * e1[5]
  const CD = e1[2] * e2[3] - e2[2] * e1[3]
  const DE = e1[3] * e2[4] - e2[3] * e1[4]
  const DF = e1[3] * e2[5] - e2[3] * e1[5]
  const BFpDE = BF + DE
  const BEmCD = BE - CD

  return [
    AB * BC - AC * AC,
    AB * BEmCD + AD * BC - 2 * AC * AE,
    AB * BFpDE + AD * BEmCD - AE * AE - 2 * AC * AF,
    AB * DF + AD * BFpDE - 2 * AE * AF,
    AD * DF - AF * AF,
  ]
}

function evalPolynomial(poly: number[], x: number) {
  if (isNaN(x)) {
    throw new TypeError(`Parameter must be a number. Found '${x}'`)
  }

  let result = 0

  for (let i = poly.length - 1; i >= 0; i--) {
    result = result * x + poly[i]
  }

  return result
}

function getZeroErrorEstimate(poly: number[], maxAbsX: number) {
  const ERRF = 1e-15

  if (typeof maxAbsX === 'undefined') {
    const rb = getPolynomialBounds(poly)

    maxAbsX = Math.max(Math.abs(rb.minX), Math.abs(rb.maxX))
  }

  if (maxAbsX < 0.001) {
    return 2 * Math.abs(evalPolynomial(poly, ERRF))
  }

  const n = poly.length - 1
  const an = poly[n]

  return (
    10 *
    ERRF *
    poly.reduce((m, v, i) => {
      const nm = (v / an) * Math.pow(maxAbsX, i)
      return nm > m ? nm : m
    }, 0)
  )
}

function getNewtonSecantBisection(
  x0: number,
  f: (x: number) => number,
  df: (x: number) => number,
  max_iterations: number,
  min: number,
  max: number
) {
  let x: number,
    prev_dfx = 0,
    dfx: number,
    prev_x_ef_correction = 0,
    x_correction: number,
    x_new: number
  let y: number, y_atmin: number, y_atmax: number

  x = x0

  const ACCURACY = 14
  const min_correction_factor = Math.pow(10, -ACCURACY)
  const isBounded = typeof min === 'number' && typeof max === 'number'

  if (isBounded) {
    if (min > max) {
      throw new RangeError('Min must be greater than max')
    }

    y_atmin = f(min)
    y_atmax = f(max)

    if (getSign(y_atmin) === getSign(y_atmax)) {
      throw new RangeError('Y values of bounds must be of opposite sign')
    }
  }

  const isEnoughCorrection = function () {
    // stop if correction is too small or if correction is in simple loop
    return (
      Math.abs(x_correction) <= min_correction_factor * Math.abs(x) ||
      prev_x_ef_correction === x - x_correction - x
    )
  }

  for (let i = 0; i < max_iterations; i++) {
    dfx = df(x)

    if (dfx === 0) {
      if (prev_dfx === 0) {
        // error
        throw new RangeError('df(x) is zero')
      } else {
        // use previous derivation value
        dfx = prev_dfx
      }
      // or move x a little?
      // dfx = df(x != 0 ? x + x * 1e-15 : 1e-15);
    }

    prev_dfx = dfx
    y = f(x)
    x_correction = y / dfx
    x_new = x - x_correction

    if (isEnoughCorrection()) {
      break
    }

    if (isBounded) {
      if (getSign(y) === getSign(y_atmax)) {
        max = x
        y_atmax = y
      } else if (getSign(y) === getSign(y_atmin)) {
        min = x
        y_atmin = y
      } else {
        x = x_new
        break
      }

      if (x_new < min || x_new > max) {
        if (getSign(y_atmin) === getSign(y_atmax)) {
          break
        }

        const RATIO_LIMIT = 50
        const AIMED_BISECT_OFFSET = 0.25 // [0, 0.5)
        const dy = y_atmax - y_atmin
        const dx = max - min

        if (dy === 0) {
          x_correction = x - (min + dx * 0.5)
        } else if (Math.abs(dy / Math.min(y_atmin, y_atmax)) > RATIO_LIMIT) {
          x_correction =
            x -
            (min +
              dx *
                (0.5 +
                  (Math.abs(y_atmin) < Math.abs(y_atmax)
                    ? -AIMED_BISECT_OFFSET
                    : AIMED_BISECT_OFFSET)))
        } else {
          x_correction = x - (min - (y_atmin / dy) * dx)
        }
        x_new = x - x_correction

        if (isEnoughCorrection()) {
          break
        }
      }
    }

    prev_x_ef_correction = x - x_new
    x = x_new
  }

  return x
}

function getBoundsUpperRealFujiwara(poly: number[]) {
  let a = [...poly]
  const n = a.length - 1
  const an = a[n]

  if (an !== 1) {
    a = poly.map((v) => v / an)
  }

  const b = a.map((v, i) => {
    return i < n ? Math.pow(Math.abs(i === 0 ? v / 2 : v), 1 / (n - i)) : v
  })

  const max_nearmax_pos = b.reduce(
    (acc, bi, i) => {
      if (i < n && a[i] < 0) {
        if (acc.max < bi) {
          acc.nearmax = acc.max
          acc.max = bi
        } else if (acc.nearmax < bi) {
          acc.nearmax = bi
        }
      }
      return acc
    },
    { max: 0, nearmax: 0 }
  )

  const max_nearmax_neg = b.reduce(
    (acc, bi, i) => {
      if (i < n && (n % 2 === i % 2 ? a[i] < 0 : a[i] > 0)) {
        if (acc.max < bi) {
          acc.nearmax = acc.max
          acc.max = bi
        } else if (acc.nearmax < bi) {
          acc.nearmax = bi
        }
      }
      return acc
    },
    { max: 0, nearmax: 0 }
  )

  return {
    negX: -2 * max_nearmax_neg.max,
    posX: 2 * max_nearmax_pos.max,
  }
}

function getBoundsLowerRealFujiwara(poly: number[]) {
  const coefs = [...poly].reverse()

  const res = getBoundsUpperRealFujiwara(coefs)

  res.negX = 1 / res.negX
  res.posX = 1 / res.posX

  return res
}

function getPolynomialBounds(poly: number[]) {
  const urb = getBoundsUpperRealFujiwara(poly)
  const rb = { minX: urb.negX, maxX: urb.posX }

  if (urb.negX === 0 && urb.posX === 0) {
    return rb
  }

  if (urb.negX === 0) {
    rb.minX = getBoundsLowerRealFujiwara(poly).posX
  } else if (urb.posX === 0) {
    rb.maxX = getBoundsLowerRealFujiwara(poly).negX
  }

  if (rb.minX > rb.maxX) {
    rb.minX = rb.maxX = 0
  }

  return rb
}

function getDerivative(poly: number[]) {
  const coefs: number[] = []

  for (let i = 1; i < poly.length; i++) {
    coefs.push(i * poly[i])
  }

  return coefs
}

function getSign(x: number) {
  // eslint-disable-next-line no-self-compare
  return typeof x === 'number'
    ? x
      ? x < 0
        ? -1
        : 1
      : x === x
      ? x
      : NaN
    : NaN
}

function getPolyDegree(poly: number[]) {
  return poly.length - 1
}

function simplifyPolynomial(poly: number[]) {
  const coefs = [...poly]

  for (let i = getPolyDegree(coefs); i >= 0; i--) {
    if (Math.abs(coefs[i]) <= 1e-12) {
      coefs.pop()
    } else {
      break
    }
  }

  return coefs
}

function getPolynomialRoots(poly: number[]): number[] {
  const coefs = simplifyPolynomial(poly)

  // Return roots based on degree
  switch (getPolyDegree(coefs)) {
    case 1: {
      return getLinearPolymonialRoots(coefs)
    }
    case 2: {
      return getQuadradicPolynomialRoots(coefs)
    }
    case 3: {
      return getCubicPolymonialRoots(coefs)
    }
    case 4: {
      return getQuarticPolymomialRoots(coefs)
    }
  }

  return []
}

function getLinearPolymonialRoots(poly: number[]): number[] {
  const results: number[] = []
  const a = poly[1]

  if (a !== 0) results.push(-poly[0] / a)

  return results
}

function getQuadradicPolynomialRoots(poly: number[]): number[] {
  const results: number[] = []

  if (getPolyDegree(poly) === 2) {
    const a = poly[2]
    const b = poly[1] / a
    const c = poly[0] / a
    const d = b * b - 4 * c

    if (d > 0) {
      const e = Math.sqrt(d)
      results.push(0.5 * (-b + e))
      results.push(0.5 * (-b - e))
    } else if (d == 0) {
      results.push(0.5 * -b)
    }
  }
  return results
}

function getCubicPolymonialRoots(poly: number[]): number[] {
  const results: number[] = []

  if (getPolyDegree(poly) == 3) {
    const c3 = poly[3]
    const c2 = poly[2] / c3
    const c1 = poly[1] / c3
    const c0 = poly[0] / c3
    const a = (3 * c1 - c2 * c2) / 3
    const b = (2 * c2 * c2 * c2 - 9 * c1 * c2 + 27 * c0) / 27
    const offset = c2 / 3
    const halfB = b / 2
    let discrim = (b * b) / 4 + (a * a * a) / 27

    if (Math.abs(discrim) <= 1e-6) discrim = 0

    if (discrim > 0) {
      const e = Math.sqrt(discrim)
      let tmp: number
      let root: number
      tmp = -halfB + e
      if (tmp >= 0) root = Math.pow(tmp, 1 / 3)
      else root = -Math.pow(-tmp, 1 / 3)
      tmp = -halfB - e
      if (tmp >= 0) root += Math.pow(tmp, 1 / 3)
      else root -= Math.pow(-tmp, 1 / 3)
      results.push(root - offset)
    } else if (discrim < 0) {
      const distance = Math.sqrt(-a / 3)
      const angle = Math.atan2(Math.sqrt(-discrim), -halfB) / 3
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const sqrt3 = Math.sqrt(3)
      results.push(2 * distance * cos - offset)
      results.push(-distance * (cos + sqrt3 * sin) - offset)
      results.push(-distance * (cos - sqrt3 * sin) - offset)
    } else {
      let tmp: number
      if (halfB >= 0) tmp = -Math.pow(halfB, 1 / 3)
      else tmp = Math.pow(-halfB, 1 / 3)
      results.push(2 * tmp - offset)
      results.push(-tmp - offset)
    }
  }

  return results
}

function getQuarticPolymomialRoots(poly: number[]): number[] {
  const results: number[] = []
  const n = getPolyDegree(poly)
  if (n === 4) {
    const coefs = [...poly].map((n) => n / poly[4])

    const ERRF = 1e-15

    if (Math.abs(coefs[0]) < 10 * ERRF * Math.abs(coefs[3])) {
      coefs[0] = 0
    }

    const poly_d = getDerivative(coefs)
    const derrt = getPolynomialRoots(poly_d).sort((a, b) => a - b)
    const dery = []
    const nr = derrt.length - 1
    const rb = getPolynomialBounds(coefs)

    const maxabsX = Math.max(Math.abs(rb.minX), Math.abs(rb.maxX))
    const ZEROepsilon = getZeroErrorEstimate(coefs, maxabsX)

    for (let i = 0; i <= nr; i++) {
      dery.push(evalPolynomial(coefs, derrt[i]))
    }

    for (let i = 0; i <= nr; i++) {
      if (Math.abs(dery[i]) < ZEROepsilon) {
        dery[i] = 0
      }
    }

    let i = 0
    const dx = Math.max((0.1 * (rb.maxX - rb.minX)) / n, ERRF)
    const guesses = []
    const minmax = []

    if (nr > -1) {
      if (dery[0] !== 0) {
        if (
          getSign(dery[0]) !==
          getSign(evalPolynomial(coefs, derrt[0] - dx) - dery[0])
        ) {
          guesses.push(derrt[0] - dx)
          minmax.push([rb.minX, derrt[0]])
        }
      } else {
        results.push(derrt[0], derrt[0])
        i++
      }

      for (; i < nr; i++) {
        if (dery[i + 1] === 0) {
          results.push(derrt[i + 1], derrt[i + 1])
          i++
        } else if (getSign(dery[i]) !== getSign(dery[i + 1])) {
          guesses.push((derrt[i] + derrt[i + 1]) / 2)
          minmax.push([derrt[i], derrt[i + 1]])
        }
      }
      if (
        dery[nr] !== 0 &&
        getSign(dery[nr]) !==
          getSign(evalPolynomial(coefs, derrt[nr] + dx) - dery[nr])
      ) {
        guesses.push(derrt[nr] + dx)
        minmax.push([derrt[nr], rb.maxX])
      }
    }

    if (guesses.length > 0) {
      for (i = 0; i < guesses.length; i++) {
        guesses[i] = getNewtonSecantBisection(
          guesses[i],
          (x: number) => evalPolynomial(poly, x),
          (x: number) => evalPolynomial(poly_d, x),
          32,
          minmax[i][0],
          minmax[i][1]
        )
      }
    }

    return results.concat(guesses)
  }
  return results
}
