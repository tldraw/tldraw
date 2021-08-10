import type { TLBounds, TLIntersection } from '../types'
import { Vec } from './vec'
import { Utils } from './utils'

/* ----------------- Start Copy Here ---------------- */

function getIntersection(
  message: string,
  ...points: number[][]
): TLIntersection {
  const didIntersect = points.length > 0
  return { didIntersect, message, points }
}

export class Intersect {
  static ray = {
    // Intersect a ray with a ray.
    ray(
      p0: number[],
      n0: number[],
      p1: number[],
      n1: number[]
    ): TLIntersection {
      const dx = p1[0] - p0[0]
      const dy = p1[1] - p0[1]
      const det = n1[0] * n0[1] - n1[1] * n0[0]
      const u = (dy * n1[0] - dx * n1[1]) / det
      const v = (dy * n0[0] - dx * n0[1]) / det
      if (u < 0 || v < 0) return getIntersection('miss')

      const m0 = n0[1] / n0[0]
      const m1 = n1[1] / n1[0]
      const b0 = p0[1] - m0 * p0[0]
      const b1 = p1[1] - m1 * p1[0]
      const x = (b1 - b0) / (m0 - m1)
      const y = m0 * x + b0

      return Number.isFinite(x)
        ? getIntersection('intersection', [x, y])
        : getIntersection('parallel')
    },

    // Interseg a ray with a line segment.
    lineSegment(
      origin: number[],
      direction: number[],
      a1: number[],
      a2: number[]
    ): TLIntersection {
      const [x, y] = origin
      const [dx, dy] = direction
      const [x1, y1] = a1
      const [x2, y2] = a2

      if (dy / dx !== (y2 - y1) / (x2 - x1)) {
        const d = dx * (y2 - y1) - dy * (x2 - x1)
        if (d !== 0) {
          const r = ((y - y1) * (x2 - x1) - (x - x1) * (y2 - y1)) / d
          const s = ((y - y1) * dx - (x - x1) * dy) / d
          if (r >= 0 && s >= 0 && s <= 1) {
            return getIntersection('intersection', [x + r * dx, y + r * dy])
          }
        }
      }
      return getIntersection('no intersection')
    },

    // Intersect a ray with a rectangle.
    rectangle(
      origin: number[],
      direction: number[],
      point: number[],
      size: number[]
    ): TLIntersection[] {
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
    ): TLIntersection {
      const a1 = origin
      const a2 = Vec.mul(direction, 999999999)
      return Intersect.lineSegment.ellipse(a1, a2, center, rx, ry, rotation)
    },

    // Intersect a ray with a bounding box.
    bounds(
      origin: number[],
      direction: number[],
      bounds: TLBounds
    ): TLIntersection[] {
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
    ): TLIntersection {
      return Intersect.ray.lineSegment(origin, direction, a1, a2)
    },

    // Intersect a line segment with a line segment.
    lineSegment(
      a1: number[],
      a2: number[],
      b1: number[],
      b2: number[]
    ): TLIntersection {
      const AB = Vec.sub(a1, b1)
      const BV = Vec.sub(b2, b1)
      const AV = Vec.sub(a2, a1)

      const ua_t = BV[0] * AB[1] - BV[1] * AB[0]
      const ub_t = AV[0] * AB[1] - AV[1] * AB[0]
      const u_b = BV[1] * AV[0] - BV[0] * AV[1]

      if (ua_t === 0 || ub_t === 0) {
        return getIntersection('coincident')
      }

      if (u_b === 0) {
        return getIntersection('parallel')
      }

      if (u_b !== 0) {
        const ua = ua_t / u_b
        const ub = ub_t / u_b
        if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
          return getIntersection('intersection', Vec.add(a1, Vec.mul(AV, ua)))
        }
      }

      return getIntersection('no intersection')
    },

    // Intersect a line segment with a rectangle
    rectangle(
      a1: number[],
      a2: number[],
      point: number[],
      size: number[]
    ): TLIntersection[] {
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
    ): TLIntersection {
      const sa = Vec.angle(center, start)
      const ea = Vec.angle(center, end)
      const ellipseTest = Intersect.ellipse.lineSegment(
        center,
        radius,
        radius,
        0,
        a1,
        a2
      )

      if (!ellipseTest.didIntersect) return getIntersection('No intersection')

      const points = ellipseTest.points.filter((point) =>
        Utils.isAngleBetween(sa, ea, Vec.angle(center, point))
      )

      if (points.length === 0) {
        return getIntersection('No intersection')
      }

      return getIntersection('intersection', ...points)
    },

    // Intersect a line segment with a circle.
    circle(a1: number[], a2: number[], c: number[], r: number): TLIntersection {
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
        return getIntersection('outside')
      }

      if (deter === 0) {
        return getIntersection('tangent')
      }

      const e = Math.sqrt(deter)
      const u1 = (-b + e) / (2 * a)
      const u2 = (-b - e) / (2 * a)
      if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
        if ((u1 < 0 && u2 < 0) || (u1 > 1 && u2 > 1)) {
          return getIntersection('outside')
        } else {
          return getIntersection('inside')
        }
      }

      const results: number[][] = []
      if (0 <= u1 && u1 <= 1) results.push(Vec.lrp(a1, a2, u1))
      if (0 <= u2 && u2 <= 1) results.push(Vec.lrp(a1, a2, u2))

      return getIntersection('intersection', ...results)
    },

    // Intersect a line segment with an ellipse.
    ellipse(
      a1: number[],
      a2: number[],
      center: number[],
      rx: number,
      ry: number,
      rotation = 0
    ): TLIntersection {
      // If the ellipse or line segment are empty, return no tValues.
      if (rx === 0 || ry === 0 || Vec.isEqual(a1, a2)) {
        return getIntersection('No intersection')
      }

      // Get the semimajor and semiminor axes.
      rx = rx < 0 ? rx : -rx
      ry = ry < 0 ? ry : -ry

      // Rotate points and translate so the ellipse is centered at the origin.
      a1 = Vec.sub(Vec.rotWith(a1, center, -rotation), center)
      a2 = Vec.sub(Vec.rotWith(a2, center, -rotation), center)

      // Calculate the quadratic parameters.
      const diff = Vec.sub(a2, a1)

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
        .map((t) => Vec.add(center, Vec.add(a1, Vec.mul(Vec.sub(a2, a1), t))))
        .map((p) => Vec.rotWith(p, center, rotation))

      return getIntersection('intersection', ...points)
    },

    // Intersect a line segment with a bounding box.
    bounds(a1: number[], a2: number[], bounds: TLBounds): TLIntersection[] {
      return Intersect.bounds.lineSegment(bounds, a1, a2)
    },

    // Intersect a line segment with a polyline
    polyline(a1: number[], a2: number[], points: number[][]): TLIntersection[] {
      const intersections: TLIntersection[] = []

      for (let i = 1; i < points.length + 1; i++) {
        const int = Intersect.lineSegment.lineSegment(
          a1,
          a2,
          points[i - 1],
          points[i % points.length]
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
    ): TLIntersection[] {
      const sideIntersections = Utils.getRectangleSides(point, size).reduce<
        TLIntersection[]
      >((acc, [message, [a1, a2]]) => {
        const intersection = Intersect.ray.lineSegment(
          origin,
          direction,
          a1,
          a2
        )

        if (intersection) {
          acc.push(getIntersection(message, ...intersection.points))
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
    ): TLIntersection[] {
      const sideIntersections = Utils.getRectangleSides(point, size).reduce<
        TLIntersection[]
      >((acc, [message, [b1, b2]]) => {
        const intersection = Intersect.lineSegment.lineSegment(a1, a2, b1, b2)

        if (intersection) {
          acc.push(getIntersection(message, ...intersection.points))
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
    ): TLIntersection[] {
      const sideIntersections = Utils.getRectangleSides(point1, size1).reduce<
        TLIntersection[]
      >((acc, [message, [a1, a2]]) => {
        const intersections = Intersect.rectangle.lineSegment(
          point2,
          size2,
          a1,
          a2
        )

        acc.push(
          ...intersections.map((int) =>
            getIntersection(`${message} ${int.message}`, ...int.points)
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
    ): TLIntersection[] {
      const sideIntersections = Utils.getRectangleSides(point, size).reduce<
        TLIntersection[]
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
    ): TLIntersection[] {
      const sideIntersections = Utils.getRectangleSides(point, size).reduce<
        TLIntersection[]
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
    ): TLIntersection[] {
      const sideIntersections = Utils.getRectangleSides(point, size).reduce<
        TLIntersection[]
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
    bounds(
      point: number[],
      size: number[],
      bounds: TLBounds
    ): TLIntersection[] {
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
    ): TLIntersection[] {
      const sideIntersections = Utils.getRectangleSides(point, size).reduce<
        TLIntersection[]
      >((acc, [message, [a1, a2]]) => {
        const intersections = Intersect.lineSegment.polyline(a1, a2, points)

        if (intersections.length > 0) {
          acc.push(
            getIntersection(message, ...intersections.flatMap((i) => i.points))
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
    ): TLIntersection {
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
    ): TLIntersection[] {
      return Intersect.rectangle.arc(point, size, center, radius, start, end)
    },

    // Intersect an arc with a bounding box.
    bounds(
      center: number[],
      radius: number,
      start: number[],
      end: number[],
      bounds: TLBounds
    ): TLIntersection[] {
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
    ): TLIntersection {
      return Intersect.lineSegment.circle(a1, a2, c, r)
    },

    // Intersect a circle with a circle.
    circle(c1: number[], r1: number, c2: number[], r2: number): TLIntersection {
      let dx = c2[0] - c1[0],
        dy = c2[1] - c1[1]

      const d = Math.sqrt(dx * dx + dy * dy),
        x = (d * d - r2 * r2 + r1 * r1) / (2 * d),
        y = Math.sqrt(r1 * r1 - x * x)

      dx /= d
      dy /= d

      return getIntersection(
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
    ): TLIntersection[] {
      return Intersect.rectangle.circle(point, size, c, r)
    },

    // Intersect a circle with a bounding box.
    bounds(c: number[], r: number, bounds: TLBounds): TLIntersection[] {
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
    ): TLIntersection {
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
    ): TLIntersection {
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
    ): TLIntersection[] {
      if (rx === ry) {
        return Intersect.rectangle.circle(point, size, center, rx)
      }

      return Intersect.rectangle.ellipse(point, size, center, rx, ry, rotation)
    },

    // Get an intersection between an ellipse and a second ellipse.
    // Adapted from https://gist.github.com/drawable/92792f59b6ff8869d8b1
    ellipse(
      _c1: number[],
      _rx1: number,
      _ry1: number,
      _r1: number,
      _c2: number[],
      _rx2: number,
      _ry2: number,
      _r2: number
    ): TLIntersection {
      // TODO
      return getIntersection('no intersection')
    },

    circle(
      c: number[],
      rx: number,
      ry: number,
      rotation: number,
      c2: number[],
      r2: number
    ): TLIntersection {
      return Intersect.ellipse.ellipse(c, rx, ry, rotation, c2, r2, r2, 0)
    },

    // Intersect an ellipse with a bounding box.
    bounds(
      c: number[],
      rx: number,
      ry: number,
      rotation: number,
      bounds: TLBounds
    ): TLIntersection[] {
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
    ray(
      bounds: TLBounds,
      origin: number[],
      direction: number[]
    ): TLIntersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.ray.rectangle(
        origin,
        direction,
        [minX, minY],
        [width, height]
      )
    },

    lineSegment(
      bounds: TLBounds,
      a1: number[],
      a2: number[]
    ): TLIntersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.lineSegment.rectangle(
        a1,
        a2,
        [minX, minY],
        [width, height]
      )
    },

    rectangle(
      bounds: TLBounds,
      point: number[],
      size: number[]
    ): TLIntersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.rectangle.rectangle(
        point,
        size,
        [minX, minY],
        [width, height]
      )
    },

    bounds(bounds1: TLBounds, bounds2: TLBounds): TLIntersection[] {
      return Intersect.rectangle.rectangle(
        [bounds1.minX, bounds1.minY],
        [bounds1.width, bounds1.height],
        [bounds2.minX, bounds2.minY],
        [bounds2.width, bounds2.height]
      )
    },

    arc(
      bounds: TLBounds,
      center: number[],
      radius: number,
      start: number[],
      end: number[]
    ): TLIntersection[] {
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

    circle(bounds: TLBounds, c: number[], r: number): TLIntersection[] {
      const { minX, minY, width, height } = bounds
      return Intersect.circle.rectangle(c, r, [minX, minY], [width, height])
    },

    ellipse(
      bounds: TLBounds,
      c: number[],
      rx: number,
      ry: number,
      rotation = 0
    ): TLIntersection[] {
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

    polyline(bounds: TLBounds, points: number[][]): TLIntersection[] {
      return Intersect.polyline.bounds(points, bounds)
    },
  }

  static polyline = {
    // Intersect a polyline with a line segment.
    lineSegment(
      points: number[][],
      a1: number[],
      a2: number[]
    ): TLIntersection[] {
      return Intersect.lineSegment.polyline(a1, a2, points)
    },

    // Interesct a polyline with a rectangle.
    rectangle(
      points: number[][],
      point: number[],
      size: number[]
    ): TLIntersection[] {
      return Intersect.rectangle.polyline(point, size, points)
    },

    // Intersect a polyline with a bounding box.
    bounds(points: number[][], bounds: TLBounds): TLIntersection[] {
      return Intersect.rectangle.polyline(
        [bounds.minX, bounds.minY],
        [bounds.width, bounds.height],
        points
      )
    },
  }
}

export default Intersect
