import { Bounds } from 'types'
import vec from 'utils/vec'
import { isAngleBetween } from './utils'

interface Intersection {
  didIntersect: boolean
  message: string
  points: number[][]
}

function getIntersection(message: string, ...points: number[][]) {
  return { didIntersect: points.length > 0, message, points }
}

export function intersectRays(
  p0: number[],
  n0: number[],
  p1: number[],
  n1: number[]
): Intersection {
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
}

export function intersectLineSegments(
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
    return getIntersection('coincident')
  }

  if (u_b === 0) {
    return getIntersection('parallel')
  }

  if (u_b != 0) {
    const ua = ua_t / u_b
    const ub = ub_t / u_b
    if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
      return getIntersection('intersection', vec.add(a1, vec.mul(AV, ua)))
    }
  }

  return getIntersection('no intersection')
}

export function intersectCircleCircle(a: number[], b: number[]): Intersection {
  const R = a[2],
    r = b[2]

  let dx = b[0] - a[0],
    dy = b[1] - a[1]

  const d = Math.sqrt(dx * dx + dy * dy),
    x = (d * d - r * r + R * R) / (2 * d),
    y = Math.sqrt(R * R - x * x)

  dx /= d
  dy /= d

  return getIntersection(
    'intersection',
    [a[0] + dx * x - dy * y, a[1] + dy * x + dx * y],
    [a[0] + dx * x + dy * y, a[1] + dy * x - dx * y]
  )
}

export function intersectCircleLineSegment(
  c: number[],
  r: number,
  a1: number[],
  a2: number[]
): Intersection {
  const a =
    (a2[0] - a1[0]) * (a2[0] - a1[0]) + (a2[1] - a1[1]) * (a2[1] - a1[1])
  const b =
    2 * ((a2[0] - a1[0]) * (a1[0] - c[0]) + (a2[1] - a1[1]) * (a1[1] - c[1]))
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
  if (0 <= u1 && u1 <= 1) results.push(vec.lrp(a1, a2, u1))
  if (0 <= u2 && u2 <= 1) results.push(vec.lrp(a1, a2, u2))

  return getIntersection('intersection', ...results)
}

export function intersectEllipseLineSegment(
  center: number[],
  rx: number,
  ry: number,
  a1: number[],
  a2: number[],
  rotation = 0
): Intersection {
  // If the ellipse or line segment are empty, return no tValues.
  if (rx === 0 || ry === 0 || vec.isEqual(a1, a2)) {
    return getIntersection('No intersection')
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
    .map((t) => vec.add(center, vec.add(a1, vec.mul(vec.sub(a2, a1), t))))
    .map((p) => vec.rotWith(p, center, rotation))

  return getIntersection('intersection', ...points)
}

export function intersectArcLineSegment(
  start: number[],
  end: number[],
  center: number[],
  radius: number,
  A: number[],
  B: number[]
): Intersection {
  const sa = vec.angle(center, start)
  const ea = vec.angle(center, end)
  const ellipseTest = intersectEllipseLineSegment(center, radius, radius, A, B)

  if (!ellipseTest.didIntersect) return getIntersection('No intersection')

  const points = ellipseTest.points.filter((point) =>
    isAngleBetween(sa, ea, vec.angle(center, point))
  )

  if (points.length === 0) {
    return getIntersection('No intersection')
  }

  return getIntersection('intersection', ...points)
}

export function intersectCircleRectangle(
  c: number[],
  r: number,
  point: number[],
  size: number[]
): Intersection[] {
  const tl = point
  const tr = vec.add(point, [size[0], 0])
  const br = vec.add(point, size)
  const bl = vec.add(point, [0, size[1]])

  const intersections: Intersection[] = []

  const topIntersection = intersectCircleLineSegment(c, r, tl, tr)
  const rightIntersection = intersectCircleLineSegment(c, r, tr, br)
  const bottomIntersection = intersectCircleLineSegment(c, r, bl, br)
  const leftIntersection = intersectCircleLineSegment(c, r, tl, bl)

  if (topIntersection.didIntersect) {
    intersections.push({ ...topIntersection, message: 'top' })
  }

  if (rightIntersection.didIntersect) {
    intersections.push({ ...rightIntersection, message: 'right' })
  }

  if (bottomIntersection.didIntersect) {
    intersections.push({ ...bottomIntersection, message: 'bottom' })
  }

  if (leftIntersection.didIntersect) {
    intersections.push({ ...leftIntersection, message: 'left' })
  }

  return intersections
}

export function intersectEllipseRectangle(
  c: number[],
  rx: number,
  ry: number,
  point: number[],
  size: number[],
  rotation = 0
): Intersection[] {
  const tl = point
  const tr = vec.add(point, [size[0], 0])
  const br = vec.add(point, size)
  const bl = vec.add(point, [0, size[1]])

  const intersections: Intersection[] = []

  const topIntersection = intersectEllipseLineSegment(
    c,
    rx,
    ry,
    tl,
    tr,
    rotation
  )
  const rightIntersection = intersectEllipseLineSegment(
    c,
    rx,
    ry,
    tr,
    br,
    rotation
  )
  const bottomIntersection = intersectEllipseLineSegment(
    c,
    rx,
    ry,
    bl,
    br,
    rotation
  )
  const leftIntersection = intersectEllipseLineSegment(
    c,
    rx,
    ry,
    tl,
    bl,
    rotation
  )

  if (topIntersection.didIntersect) {
    intersections.push({ ...topIntersection, message: 'top' })
  }

  if (rightIntersection.didIntersect) {
    intersections.push({ ...rightIntersection, message: 'right' })
  }

  if (bottomIntersection.didIntersect) {
    intersections.push({ ...bottomIntersection, message: 'bottom' })
  }

  if (leftIntersection.didIntersect) {
    intersections.push({ ...leftIntersection, message: 'left' })
  }

  return intersections
}

export function intersectRectangleLineSegment(
  point: number[],
  size: number[],
  a1: number[],
  a2: number[]
): Intersection[] {
  const tl = point
  const tr = vec.add(point, [size[0], 0])
  const br = vec.add(point, size)
  const bl = vec.add(point, [0, size[1]])

  const intersections: Intersection[] = []

  const topIntersection = intersectLineSegments(a1, a2, tl, tr)
  const rightIntersection = intersectLineSegments(a1, a2, tr, br)
  const bottomIntersection = intersectLineSegments(a1, a2, bl, br)
  const leftIntersection = intersectLineSegments(a1, a2, tl, bl)

  if (topIntersection.didIntersect) {
    intersections.push({ ...topIntersection, message: 'top' })
  }

  if (rightIntersection.didIntersect) {
    intersections.push({ ...rightIntersection, message: 'right' })
  }

  if (bottomIntersection.didIntersect) {
    intersections.push({ ...bottomIntersection, message: 'bottom' })
  }

  if (leftIntersection.didIntersect) {
    intersections.push({ ...leftIntersection, message: 'left' })
  }

  return intersections
}

export function intersectArcRectangle(
  start: number[],
  end: number[],
  center: number[],
  radius: number,
  point: number[],
  size: number[]
): Intersection[] {
  const tl = point
  const tr = vec.add(point, [size[0], 0])
  const br = vec.add(point, size)
  const bl = vec.add(point, [0, size[1]])

  const intersections: Intersection[] = []

  const topIntersection = intersectArcLineSegment(
    start,
    end,
    center,
    radius,
    tl,
    tr
  )
  const rightIntersection = intersectArcLineSegment(
    start,
    end,
    center,
    radius,
    tr,
    br
  )
  const bottomIntersection = intersectArcLineSegment(
    start,
    end,
    center,
    radius,
    bl,
    br
  )
  const leftIntersection = intersectArcLineSegment(
    start,
    end,
    center,
    radius,
    tl,
    bl
  )

  if (topIntersection.didIntersect) {
    intersections.push({ ...topIntersection, message: 'top' })
  }

  if (rightIntersection.didIntersect) {
    intersections.push({ ...rightIntersection, message: 'right' })
  }

  if (bottomIntersection.didIntersect) {
    intersections.push({ ...bottomIntersection, message: 'bottom' })
  }

  if (leftIntersection.didIntersect) {
    intersections.push({ ...leftIntersection, message: 'left' })
  }

  return intersections
}

/* -------------------------------------------------- */
/*                  Shape vs. Bounds                  */
/* -------------------------------------------------- */

export function intersectCircleBounds(
  c: number[],
  r: number,
  bounds: Bounds
): Intersection[] {
  const { minX, minY, width, height } = bounds
  return intersectCircleRectangle(c, r, [minX, minY], [width, height])
}

export function intersectEllipseBounds(
  c: number[],
  rx: number,
  ry: number,
  bounds: Bounds,
  rotation = 0
): Intersection[] {
  const { minX, minY, width, height } = bounds
  return intersectEllipseRectangle(
    c,
    rx,
    ry,
    [minX, minY],
    [width, height],
    rotation
  )
}

export function intersectLineSegmentBounds(
  a1: number[],
  a2: number[],
  bounds: Bounds
): Intersection[] {
  const { minX, minY, width, height } = bounds
  return intersectRectangleLineSegment([minX, minY], [width, height], a1, a2)
}

export function intersectPolylineBounds(
  points: number[][],
  bounds: Bounds
): Intersection[] {
  const { minX, minY, width, height } = bounds
  const intersections: Intersection[] = []

  for (let i = 1; i < points.length; i++) {
    intersections.push(
      ...intersectRectangleLineSegment(
        [minX, minY],
        [width, height],
        points[i - 1],
        points[i]
      )
    )
  }

  return intersections
}

export function intersectPolygonBounds(
  points: number[][],
  bounds: Bounds
): Intersection[] {
  const { minX, minY, width, height } = bounds
  const intersections: Intersection[] = []

  for (let i = 1; i < points.length + 1; i++) {
    intersections.push(
      ...intersectRectangleLineSegment(
        [minX, minY],
        [width, height],
        points[i - 1],
        points[i % points.length]
      )
    )
  }

  return intersections
}

export function intersectArcBounds(
  start: number[],
  end: number[],
  center: number[],
  radius: number,
  bounds: Bounds
): Intersection[] {
  const { minX, minY, width, height } = bounds

  return intersectArcRectangle(
    start,
    end,
    center,
    radius,
    [minX, minY],
    [width, height]
  )
}
