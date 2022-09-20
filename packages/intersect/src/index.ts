import { Vec } from '@tldraw/vec'

export type TLIntersection = {
  didIntersect: boolean
  message: string
  points: number[][]
}

export interface TLBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  rotation?: number
}

/**
 * Get an intersection.
 * @param message
 * @param points
 * @internal
 */
function createIntersection(message: string, ...points: number[][]): TLIntersection {
  const didIntersect = points.length > 0
  return { didIntersect, message, points }
}

/**
 *
 * @param point
 * @param size
 * @param rotation
 * @internal
 */
function getRectangleSides(point: number[], size: number[], rotation = 0): [string, number[][]][] {
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

/**
 * Get whether angle c lies between angles a and b.
 * @param a
 * @param b
 * @param c
 * @internal
 */
function isAngleBetween(a: number, b: number, c: number): boolean {
  if (c === a || c === b) return true
  const PI2 = Math.PI * 2
  const AB = (b - a + PI2) % PI2
  const AC = (c - a + PI2) % PI2
  return AB <= Math.PI !== AC > AB
}

/* -------------------------------------------------- */
/*                        Line                        */
/* -------------------------------------------------- */

export function intersectLineLine(AB: number[][], PQ: number[][]): number[] | undefined {
  const slopeAB = Vec.slope(AB[0], AB[1])
  const slopePQ = Vec.slope(PQ[0], PQ[1])

  if (slopeAB === slopePQ) return undefined

  if (Number.isNaN(slopeAB) && !Number.isNaN(slopePQ)) {
    return [AB[0][0], (AB[0][0] - PQ[0][0]) * slopePQ + PQ[0][1]]
  }

  if (Number.isNaN(slopePQ) && !Number.isNaN(slopeAB)) {
    return [PQ[0][0], (PQ[0][0] - AB[0][0]) * slopeAB + AB[0][1]]
  }

  const x = (slopeAB * AB[0][0] - slopePQ * PQ[0][0] + PQ[0][1] - AB[0][1]) / (slopeAB - slopePQ)
  const y = slopePQ * (x - PQ[0][0]) + PQ[0][1]

  return [x, y]
}

/* -------------------------------------------------- */
/*                         Ray                        */
/* -------------------------------------------------- */

/**
 * Find the intersection between a ray and a ray.
 * @param p0 The first ray's point
 * @param n0 The first ray's direction vector.
 * @param p1 The second ray's point.
 * @param n1 The second ray's direction vector.
 */
export function intersectRayRay(
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
  if (u < 0 || v < 0) return createIntersection('miss')

  const m0 = n0[1] / n0[0]
  const m1 = n1[1] / n1[0]
  const b0 = p0[1] - m0 * p0[0]
  const b1 = p1[1] - m1 * p1[0]
  const x = (b1 - b0) / (m0 - m1)
  const y = m0 * x + b0

  return Number.isFinite(x)
    ? createIntersection('intersection', [x, y])
    : createIntersection('parallel')
}

/**
 * Find the intersections between a ray and a line segment.
 * @param origin
 * @param direction
 * @param a1
 * @param a2
 */
export function intersectRayLineSegment(
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
        return createIntersection('intersection', [x + r * dx, y + r * dy])
      }
    }
  }
  return createIntersection('no intersection')
}

/**
 * Find the intersections between a ray and a rectangle.
 * @param origin
 * @param direction
 * @param point
 * @param size
 * @param rotation
 */
export function intersectRayRectangle(
  origin: number[],
  direction: number[],
  point: number[],
  size: number[],
  rotation = 0
): TLIntersection[] {
  return intersectRectangleRay(point, size, rotation, origin, direction)
}

/**
 * Find the intersections between a ray and an ellipse.
 * @param origin
 * @param direction
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 */
export function intersectRayEllipse(
  origin: number[],
  direction: number[],
  center: number[],
  rx: number,
  ry: number,
  rotation: number
): TLIntersection {
  const a1 = origin
  const a2 = Vec.mul(direction, 999999999)
  return intersectLineSegmentEllipse(a1, a2, center, rx, ry, rotation)
}

/**
 * Find the intersections between a ray and a bounding box.
 * @param origin
 * @param direction
 * @param bounds
 * @param rotation
 */
export function intersectRayBounds(
  origin: number[],
  direction: number[],
  bounds: TLBounds,
  rotation = 0
): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectRayRectangle(origin, direction, [minX, minY], [width, height], rotation)
}

/* -------------------------------------------------- */
/*                    Line Segment                    */
/* -------------------------------------------------- */

/**
 * Find the intersection between a line segment and a ray.
 * @param a1
 * @param a2
 * @param origin
 * @param direction
 */
export function intersectLineSegmentRay(
  a1: number[],
  a2: number[],
  origin: number[],
  direction: number[]
): TLIntersection {
  return intersectRayLineSegment(origin, direction, a1, a2)
}

/**
 * Find the intersection between a line segment and a line segment.
 * @param a1
 * @param a2
 * @param b1
 * @param b2
 */
export function intersectLineSegmentLineSegment(
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
    return createIntersection('coincident')
  }

  if (u_b === 0) {
    return createIntersection('parallel')
  }

  if (u_b !== 0) {
    const ua = ua_t / u_b
    const ub = ub_t / u_b
    if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
      return createIntersection('intersection', Vec.add(a1, Vec.mul(AV, ua)))
    }
  }

  return createIntersection('no intersection')
}

/**
 * Find the intersections between a line segment and a rectangle.
 * @param a1
 * @param a2
 * @param point
 * @param size
 */
export function intersectLineSegmentRectangle(
  a1: number[],
  a2: number[],
  point: number[],
  size: number[]
): TLIntersection[] {
  return intersectRectangleLineSegment(point, size, a1, a2)
}

/**
 * Find the intersections between a line segment and an arc.
 * @param a1
 * @param a2
 * @param center
 * @param radius
 * @param start
 * @param end
 */
export function intersectLineSegmentArc(
  a1: number[],
  a2: number[],
  center: number[],
  radius: number,
  start: number[],
  end: number[]
): TLIntersection {
  const sa = Vec.angle(center, start)
  const ea = Vec.angle(center, end)
  const ellipseTest = intersectEllipseLineSegment(center, radius, radius, 0, a1, a2)

  if (!ellipseTest.didIntersect) return createIntersection('no intersection')

  const points = ellipseTest.points.filter((point) =>
    isAngleBetween(sa, ea, Vec.angle(center, point))
  )

  if (points.length === 0) {
    return createIntersection('no intersection')
  }

  return createIntersection('intersection', ...points)
}

/**
 * Find the intersections between a line segment and a circle.
 * @param a1
 * @param a2
 * @param c
 * @param r
 */
export function intersectLineSegmentCircle(
  a1: number[],
  a2: number[],
  c: number[],
  r: number
): TLIntersection {
  const a = (a2[0] - a1[0]) * (a2[0] - a1[0]) + (a2[1] - a1[1]) * (a2[1] - a1[1])
  const b = 2 * ((a2[0] - a1[0]) * (a1[0] - c[0]) + (a2[1] - a1[1]) * (a1[1] - c[1]))
  const cc =
    c[0] * c[0] +
    c[1] * c[1] +
    a1[0] * a1[0] +
    a1[1] * a1[1] -
    2 * (c[0] * a1[0] + c[1] * a1[1]) -
    r * r

  const deter = b * b - 4 * a * cc

  if (deter < 0) {
    return createIntersection('outside')
  }

  if (deter === 0) {
    return createIntersection('tangent')
  }

  const e = Math.sqrt(deter)
  const u1 = (-b + e) / (2 * a)
  const u2 = (-b - e) / (2 * a)
  if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
    if ((u1 < 0 && u2 < 0) || (u1 > 1 && u2 > 1)) {
      return createIntersection('outside')
    } else {
      return createIntersection('inside')
    }
  }

  const results: number[][] = []
  if (0 <= u1 && u1 <= 1) results.push(Vec.lrp(a1, a2, u1))
  if (0 <= u2 && u2 <= 1) results.push(Vec.lrp(a1, a2, u2))

  return createIntersection('intersection', ...results)
}

/**
 * Find the intersections between a line segment and an ellipse.
 * @param a1
 * @param a2
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 */
export function intersectLineSegmentEllipse(
  a1: number[],
  a2: number[],
  center: number[],
  rx: number,
  ry: number,
  rotation = 0
): TLIntersection {
  // If the ellipse or line segment are empty, return no tValues.
  if (rx === 0 || ry === 0 || Vec.isEqual(a1, a2)) {
    return createIntersection('no intersection')
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
  const B = (2 * a1[0] * diff[0]) / rx / rx + (2 * a1[1] * diff[1]) / ry / ry
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

  return createIntersection('intersection', ...points)
}

/**
 * Find the intersections between a line segment and a bounding box.
 * @param a1
 * @param a2
 * @param bounds
 */
export function intersectLineSegmentBounds(
  a1: number[],
  a2: number[],
  bounds: TLBounds
): TLIntersection[] {
  return intersectBoundsLineSegment(bounds, a1, a2)
}

/**
 * Find the intersections between a line segment and a polyline.
 * @param a1
 * @param a2
 * @param points
 */
export function intersectLineSegmentPolyline(
  a1: number[],
  a2: number[],
  points: number[][]
): TLIntersection {
  const pts: number[][] = []

  for (let i = 1; i < points.length; i++) {
    const int = intersectLineSegmentLineSegment(a1, a2, points[i - 1], points[i])

    if (int) {
      pts.push(...int.points)
    }
  }

  if (pts.length === 0) {
    return createIntersection('no intersection')
  }

  return createIntersection('intersection', ...points)
}
/**
 * Find the intersections between a line segment and a closed polygon.
 * @param a1
 * @param a2
 * @param points
 */
export function intersectLineSegmentPolygon(
  a1: number[],
  a2: number[],
  points: number[][]
): TLIntersection {
  const pts: number[][] = []

  for (let i = 1; i < points.length + 1; i++) {
    const int = intersectLineSegmentLineSegment(a1, a2, points[i - 1], points[i % points.length])

    if (int) {
      pts.push(...int.points)
    }
  }

  if (pts.length === 0) {
    return createIntersection('no intersection')
  }

  return createIntersection('intersection', ...points)
}

/* -------------------------------------------------- */
/*                      Rectangle                     */
/* -------------------------------------------------- */

/**
 * Find the intersections between a rectangle and a ray.
 * @param point
 * @param size
 * @param rotation
 * @param origin
 * @param direction
 */
export function intersectRectangleRay(
  point: number[],
  size: number[],
  rotation: number,
  origin: number[],
  direction: number[]
): TLIntersection[] {
  const sideIntersections = getRectangleSides(point, size, rotation).reduce<TLIntersection[]>(
    (acc, [message, [a1, a2]]) => {
      const intersection = intersectRayLineSegment(origin, direction, a1, a2)

      if (intersection) {
        acc.push(createIntersection(message, ...intersection.points))
      }

      return acc
    },
    []
  )

  return sideIntersections.filter((int) => int.didIntersect)
}

/**
 * Find the intersections between a rectangle and a line segment.
 * @param point
 * @param size
 * @param a1
 * @param a2
 */
export function intersectRectangleLineSegment(
  point: number[],
  size: number[],
  a1: number[],
  a2: number[]
): TLIntersection[] {
  const sideIntersections = getRectangleSides(point, size).reduce<TLIntersection[]>(
    (acc, [message, [b1, b2]]) => {
      const intersection = intersectLineSegmentLineSegment(a1, a2, b1, b2)

      if (intersection) {
        acc.push(createIntersection(message, ...intersection.points))
      }

      return acc
    },
    []
  )

  return sideIntersections.filter((int) => int.didIntersect)
}

/**
 * Find the intersections between a rectangle and a rectangle.
 * @param point1
 * @param size1
 * @param point2
 * @param size2
 */
export function intersectRectangleRectangle(
  point1: number[],
  size1: number[],
  point2: number[],
  size2: number[]
): TLIntersection[] {
  const sideIntersections = getRectangleSides(point1, size1).reduce<TLIntersection[]>(
    (acc, [message, [a1, a2]]) => {
      const intersections = intersectRectangleLineSegment(point2, size2, a1, a2)

      acc.push(
        ...intersections.map((int) =>
          createIntersection(`${message} ${int.message}`, ...int.points)
        )
      )

      return acc
    },
    []
  )

  return sideIntersections.filter((int) => int.didIntersect)
}

/**
 * Find the intersections between a rectangle and an arc.
 * @param point
 * @param size
 * @param center
 * @param radius
 * @param start
 * @param end
 */
export function intersectRectangleArc(
  point: number[],
  size: number[],
  center: number[],
  radius: number,
  start: number[],
  end: number[]
): TLIntersection[] {
  const sideIntersections = getRectangleSides(point, size).reduce<TLIntersection[]>(
    (acc, [message, [a1, a2]]) => {
      const intersection = intersectArcLineSegment(center, radius, start, end, a1, a2)

      if (intersection) {
        acc.push({ ...intersection, message })
      }

      return acc
    },
    []
  )

  return sideIntersections.filter((int) => int.didIntersect)
}

/**
 * Find the intersections between a rectangle and a circle.
 * @param point
 * @param size
 * @param c
 * @param r
 */
export function intersectRectangleCircle(
  point: number[],
  size: number[],
  c: number[],
  r: number
): TLIntersection[] {
  const sideIntersections = getRectangleSides(point, size).reduce<TLIntersection[]>(
    (acc, [message, [a1, a2]]) => {
      const intersection = intersectLineSegmentCircle(a1, a2, c, r)

      if (intersection) {
        acc.push({ ...intersection, message })
      }

      return acc
    },
    []
  )

  return sideIntersections.filter((int) => int.didIntersect)
}

/**
 * Find the intersections between a rectangle and an ellipse.
 * @param point
 * @param size
 * @param c
 * @param rx
 * @param ry
 * @param rotation
 */
export function intersectRectangleEllipse(
  point: number[],
  size: number[],
  c: number[],
  rx: number,
  ry: number,
  rotation = 0
): TLIntersection[] {
  const sideIntersections = getRectangleSides(point, size).reduce<TLIntersection[]>(
    (acc, [message, [a1, a2]]) => {
      const intersection = intersectLineSegmentEllipse(a1, a2, c, rx, ry, rotation)

      if (intersection) {
        acc.push({ ...intersection, message })
      }

      return acc
    },
    []
  )

  return sideIntersections.filter((int) => int.didIntersect)
}

/**
 * Find the intersections between a rectangle and a bounding box.
 * @param point
 * @param size
 * @param bounds
 */
export function intersectRectangleBounds(
  point: number[],
  size: number[],
  bounds: TLBounds
): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectRectangleRectangle(point, size, [minX, minY], [width, height])
}

/**
 * Find the intersections between a rectangle and a polyline.
 * @param point
 * @param size
 * @param points
 */
export function intersectRectanglePolyline(
  point: number[],
  size: number[],
  points: number[][]
): TLIntersection[] {
  const sideIntersections = getRectangleSides(point, size).reduce<TLIntersection[]>(
    (acc, [message, [a1, a2]]) => {
      const intersection = intersectLineSegmentPolyline(a1, a2, points)

      if (intersection.didIntersect) {
        acc.push(createIntersection(message, ...intersection.points))
      }

      return acc
    },
    []
  )

  return sideIntersections.filter((int) => int.didIntersect)
}
/**
 * Find the intersections between a rectangle and a polygon.
 * @param point
 * @param size
 * @param points
 */
export function intersectRectanglePolygon(
  point: number[],
  size: number[],
  points: number[][]
): TLIntersection[] {
  const sideIntersections = getRectangleSides(point, size).reduce<TLIntersection[]>(
    (acc, [message, [a1, a2]]) => {
      const intersection = intersectLineSegmentPolygon(a1, a2, points)

      if (intersection.didIntersect) {
        acc.push(createIntersection(message, ...intersection.points))
      }

      return acc
    },
    []
  )

  return sideIntersections.filter((int) => int.didIntersect)
}

/* -------------------------------------------------- */
/*                         Arc                        */
/* -------------------------------------------------- */

/**
 * Find the intersections between a arc and a line segment.
 * @param center
 * @param radius
 * @param start
 * @param end
 * @param a1
 * @param a2
 */
export function intersectArcLineSegment(
  center: number[],
  radius: number,
  start: number[],
  end: number[],
  a1: number[],
  a2: number[]
): TLIntersection {
  return intersectLineSegmentArc(a1, a2, center, radius, start, end)
}

/**
 * Find the intersections between a arc and a rectangle.
 * @param center
 * @param radius
 * @param start
 * @param end
 * @param point
 * @param size
 */
export function intersectArcRectangle(
  center: number[],
  radius: number,
  start: number[],
  end: number[],
  point: number[],
  size: number[]
): TLIntersection[] {
  return intersectRectangleArc(point, size, center, radius, start, end)
}

/**
 * Find the intersections between a arc and a bounding box.
 * @param center
 * @param radius
 * @param start
 * @param end
 * @param bounds
 */
export function intersectArcBounds(
  center: number[],
  radius: number,
  start: number[],
  end: number[],
  bounds: TLBounds
): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectArcRectangle(center, radius, start, end, [minX, minY], [width, height])
}

/* -------------------------------------------------- */
/*                       Circle                       */
/* -------------------------------------------------- */

/**
 * Find the intersections between a circle and a line segment.
 * @param c
 * @param r
 * @param a1
 * @param a2
 */
export function intersectCircleLineSegment(
  c: number[],
  r: number,
  a1: number[],
  a2: number[]
): TLIntersection {
  return intersectLineSegmentCircle(a1, a2, c, r)
}

/**
 * Find the intersections between a circle and a circle.
 * @param c1
 * @param r1
 * @param c2
 * @param r2
 */
export function intersectCircleCircle(
  c1: number[],
  r1: number,
  c2: number[],
  r2: number
): TLIntersection {
  let dx = c2[0] - c1[0],
    dy = c2[1] - c1[1]

  const d = Math.sqrt(dx * dx + dy * dy),
    x = (d * d - r2 * r2 + r1 * r1) / (2 * d),
    y = Math.sqrt(r1 * r1 - x * x)

  dx /= d
  dy /= d

  return createIntersection(
    'intersection',
    [c1[0] + dx * x - dy * y, c1[1] + dy * x + dx * y],
    [c1[0] + dx * x + dy * y, c1[1] + dy * x - dx * y]
  )
}

/**
 * Find the intersections between a circle and a rectangle.
 * @param c
 * @param r
 * @param point
 * @param size
 */
export function intersectCircleRectangle(
  c: number[],
  r: number,
  point: number[],
  size: number[]
): TLIntersection[] {
  return intersectRectangleCircle(point, size, c, r)
}

/**
 * Find the intersections between a circle and a bounding box.
 * @param c
 * @param r
 * @param bounds
 */
export function intersectCircleBounds(c: number[], r: number, bounds: TLBounds): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectCircleRectangle(c, r, [minX, minY], [width, height])
}

/* -------------------------------------------------- */
/*                       Ellipse                      */
/* -------------------------------------------------- */

/**
 * Find the intersections between an ellipse and a ray.
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 * @param point
 * @param direction
 */
export function intersectEllipseRay(
  center: number[],
  rx: number,
  ry: number,
  rotation: number,
  point: number[],
  direction: number[]
): TLIntersection {
  return intersectRayEllipse(point, direction, center, rx, ry, rotation)
}

/**
 * Find the intersections between an ellipse and a line segment.
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 * @param a1
 * @param a2
 */
export function intersectEllipseLineSegment(
  center: number[],
  rx: number,
  ry: number,
  rotation = 0,
  a1: number[],
  a2: number[]
): TLIntersection {
  if (rx === ry) {
    return intersectLineSegmentCircle(a1, a2, center, rx)
  }

  return intersectLineSegmentEllipse(a1, a2, center, rx, ry, rotation)
}

/**
 * Find the intersections between an ellipse and a rectangle.
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 * @param point
 * @param size
 */
export function intersectEllipseRectangle(
  center: number[],
  rx: number,
  ry: number,
  rotation = 0,
  point: number[],
  size: number[]
): TLIntersection[] {
  if (rx === ry) {
    return intersectRectangleCircle(point, size, center, rx)
  }

  return intersectRectangleEllipse(point, size, center, rx, ry, rotation)
}

/**
 * Find the intersections between an ellipse and an ellipse.
 * Adapted from https://gist.github.com/drawable/92792f59b6ff8869d8b1
 * @param _c1
 * @param _rx1
 * @param _ry1
 * @param _r1
 * @param _c2
 * @param _rx2
 * @param _ry2
 * @param _r2
 */
export function intersectEllipseEllipse(
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
  return createIntersection('no intersection')
}

/**
 * Find the intersections between an ellipse and a circle.
 * @param c
 * @param rx
 * @param ry
 * @param rotation
 * @param c2
 * @param r2
 */
export function intersectEllipseCircle(
  c: number[],
  rx: number,
  ry: number,
  rotation: number,
  c2: number[],
  r2: number
): TLIntersection {
  return intersectEllipseEllipse(c, rx, ry, rotation, c2, r2, r2, 0)
}

/**
 * Find the intersections between an ellipse and a bounding box.
 * @param c
 * @param rx
 * @param ry
 * @param rotation
 * @param bounds
 */
export function intersectEllipseBounds(
  c: number[],
  rx: number,
  ry: number,
  rotation: number,
  bounds: TLBounds
): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectEllipseRectangle(c, rx, ry, rotation, [minX, minY], [width, height])
}

/**
 * Find the intersections between a bounding box and a ray.
 * @param bounds
 * @param origin
 * @param direction
 */
export function intersectBoundsRay(
  bounds: TLBounds,
  origin: number[],
  direction: number[]
): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectRayRectangle(origin, direction, [minX, minY], [width, height])
}

/**
 * Find the intersections between a bounding box and a line segment.
 * @param bounds
 * @param a1
 * @param a2
 */
export function intersectBoundsLineSegment(
  bounds: TLBounds,
  a1: number[],
  a2: number[]
): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectLineSegmentRectangle(a1, a2, [minX, minY], [width, height])
}

/**
 * Find the intersections between a bounding box and a rectangle.
 * @param bounds
 * @param point
 * @param size
 */
export function intersectBoundsRectangle(
  bounds: TLBounds,
  point: number[],
  size: number[]
): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectRectangleRectangle(point, size, [minX, minY], [width, height])
}

/**
 * Find the intersections between a bounding box and a bounding box.
 * @param bounds1
 * @param bounds2
 */
export function intersectBoundsBounds(bounds1: TLBounds, bounds2: TLBounds): TLIntersection[] {
  return intersectRectangleRectangle(
    [bounds1.minX, bounds1.minY],
    [bounds1.width, bounds1.height],
    [bounds2.minX, bounds2.minY],
    [bounds2.width, bounds2.height]
  )
}

/**
 * Find the intersections between a bounding box and an arc.
 * @param bounds
 * @param center
 * @param radius
 * @param start
 * @param end
 */
export function intersectBoundsArc(
  bounds: TLBounds,
  center: number[],
  radius: number,
  start: number[],
  end: number[]
): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectArcRectangle(center, radius, start, end, [minX, minY], [width, height])
}

/**
 * Find the intersections between a bounding box and a circle.
 * @param bounds
 * @param c
 * @param r
 */
export function intersectBoundsCircle(bounds: TLBounds, c: number[], r: number): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectCircleRectangle(c, r, [minX, minY], [width, height])
}

/**
 * Find the intersections between a bounding box and an ellipse.
 * @param bounds
 * @param c
 * @param rx
 * @param ry
 * @param rotation
 */
export function intersectBoundsEllipse(
  bounds: TLBounds,
  c: number[],
  rx: number,
  ry: number,
  rotation = 0
): TLIntersection[] {
  const { minX, minY, width, height } = bounds
  return intersectEllipseRectangle(c, rx, ry, rotation, [minX, minY], [width, height])
}

/**
 * Find the intersections between a bounding box and a polyline.
 * @param bounds
 * @param points
 */
export function intersectBoundsPolyline(bounds: TLBounds, points: number[][]): TLIntersection[] {
  return intersectPolylineBounds(points, bounds)
}

/**
 * Find the intersections between a bounding box and a polygon.
 * @param bounds
 * @param points
 */
export function intersectBoundsPolygon(bounds: TLBounds, points: number[][]): TLIntersection[] {
  return intersectPolygonBounds(points, bounds)
}

/* -------------------------------------------------- */
/*                      Polyline                      */
/* -------------------------------------------------- */

/**
 * Find the intersections between a polyline and a line segment.
 * @param points
 * @param a1
 * @param a2
 */
export function intersectPolylineLineSegment(
  points: number[][],
  a1: number[],
  a2: number[]
): TLIntersection {
  return intersectLineSegmentPolyline(a1, a2, points)
}

/**
 * Find the intersections between a polyline and a rectangle.
 * @param points
 * @param point
 * @param size
 */
export function intersectPolylineRectangle(
  points: number[][],
  point: number[],
  size: number[]
): TLIntersection[] {
  return intersectRectanglePolyline(point, size, points)
}

/**
 * Find the intersections between a polyline and a bounding box.
 * @param points
 * @param bounds
 */
export function intersectPolylineBounds(points: number[][], bounds: TLBounds): TLIntersection[] {
  return intersectRectanglePolyline(
    [bounds.minX, bounds.minY],
    [bounds.width, bounds.height],
    points
  )
}

/* -------------------------------------------------- */
/*                       Polygon                      */
/* -------------------------------------------------- */

/**
 * Find the intersections between a polygon nd a line segment.
 * @param points
 * @param a1
 * @param a2
 */
export function intersectPolygonLineSegment(
  points: number[][],
  a1: number[],
  a2: number[]
): TLIntersection {
  return intersectLineSegmentPolyline(a1, a2, points)
}

/**
 * Find the intersections between a polygon and a rectangle.
 * @param points
 * @param point
 * @param size
 */
export function intersectPolygonRectangle(
  points: number[][],
  point: number[],
  size: number[]
): TLIntersection[] {
  return intersectRectanglePolyline(point, size, points)
}

/**
 * Find the intersections between a polygon and a bounding box.
 * @param points
 * @param bounds
 */
export function intersectPolygonBounds(points: number[][], bounds: TLBounds): TLIntersection[] {
  return intersectRectanglePolygon(
    [bounds.minX, bounds.minY],
    [bounds.width, bounds.height],
    points
  )
}

/**
 * Find the intersections between a rectangle and a ray.
 * @param point
 * @param size
 * @param rotation
 * @param origin
 * @param direction
 */
export function intersectRayPolygon(
  origin: number[],
  direction: number[],
  points: number[][]
): TLIntersection[] {
  const sideIntersections = pointsToLineSegments(points, true).reduce<TLIntersection[]>(
    (acc, [a1, a2], i) => {
      const intersection = intersectRayLineSegment(origin, direction, a1, a2)

      if (intersection) {
        acc.push(createIntersection(i.toString(), ...intersection.points))
      }

      return acc
    },
    []
  )

  return sideIntersections.filter((int) => int.didIntersect)
}

export function pointsToLineSegments(points: number[][], closed = false) {
  const segments = []
  for (let i = 1; i < points.length; i++) segments.push([points[i - 1], points[i]])
  if (closed) segments.push([points[points.length - 1], points[0]])
  return segments
}
