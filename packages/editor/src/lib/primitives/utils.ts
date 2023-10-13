import { Box2d } from './Box2d'
import { Vec2d, VecLike } from './Vec2d'

/** @public */
export function precise(A: VecLike) {
	return `${toDomPrecision(A.x)},${toDomPrecision(A.y)} `
}

/** @public */
export function average(A: VecLike, B: VecLike) {
	return `${toDomPrecision((A.x + B.x) / 2)},${toDomPrecision((A.y + B.y) / 2)} `
}

/** @public */
export const PI = Math.PI
/** @public */
export const TAU = PI / 2
/** @public */
export const PI2 = PI * 2
/** @public */
export const EPSILON = Math.PI / 180
/** @public */
export const SIN = Math.sin

/**
 * Clamp a value into a range.
 *
 * @example
 *
 * ```ts
 * const A = clamp(0, 1) // 1
 * ```
 *
 * @param n - The number to clamp.
 * @param min - The minimum value.
 * @public
 */
export function clamp(n: number, min: number): number
/**
 * Clamp a value into a range.
 *
 * @example
 *
 * ```ts
 * const A = clamp(0, 1, 10) // 1
 * const B = clamp(11, 1, 10) // 10
 * const C = clamp(5, 1, 10) // 5
 * ```
 *
 * @param n - The number to clamp.
 * @param min - The minimum value.
 * @param max - The maximum value.
 * @public
 */
export function clamp(n: number, min: number, max: number): number
export function clamp(n: number, min: number, max?: number): number {
	return Math.max(min, typeof max !== 'undefined' ? Math.min(n, max) : n)
}

/**
 * Get a number to a precision.
 *
 * @param n - The number.
 * @param precision - The precision.
 * @public
 */
export function toPrecision(n: number, precision = 10000000000) {
	if (!n) return 0
	return Math.round(n * precision) / precision
}

/**
 * Whether two numbers numbers a and b are approximately equal.
 *
 * @param a - The first point.
 * @param b - The second point.
 * @public
 */
export function approximately(a: number, b: number, precision = 0.000001) {
	return Math.abs(a - b) <= precision
}

/**
 * Find the approximate perimeter of an ellipse.
 *
 * @param rx - The ellipse's x radius.
 * @param ry - The ellipse's y radius.
 * @public
 */
export function perimeterOfEllipse(rx: number, ry: number): number {
	const h = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2)
	const p = PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
	return p
}

/**
 * @param a - Any angle in radians
 * @returns A number between 0 and 2 * PI
 * @public
 */
export function canonicalizeRotation(a: number) {
	a = a % PI2
	if (a < 0) {
		a = a + PI2
	} else if (a === 0) {
		// prevent negative zero
		a = 0
	}
	return a
}

/**
 * Get the clockwise angle distance between two angles.
 *
 * @param a0 - The first angle.
 * @param a1 - The second angle.
 * @public
 */
export function clockwiseAngleDist(a0: number, a1: number): number {
	a0 = canonicalizeRotation(a0)
	a1 = canonicalizeRotation(a1)
	if (a0 > a1) {
		a1 += PI2
	}
	return a1 - a0
}

/**
 * Get the counter-clockwise angle distance between two angles.
 *
 * @param a0 - The first angle.
 * @param a1 - The second angle.
 * @public
 */
export function counterClockwiseAngleDist(a0: number, a1: number): number {
	return PI2 - clockwiseAngleDist(a0, a1)
}

/**
 * Get the short angle distance between two angles.
 *
 * @param a0 - The first angle.
 * @param a1 - The second angle.
 * @public
 */
export function shortAngleDist(a0: number, a1: number): number {
	const da = (a1 - a0) % PI2
	return ((2 * da) % PI2) - da
}

/**
 * Get the long angle distance between two angles.
 *
 * @param a0 - The first angle.
 * @param a1 - The second angle.
 * @public
 */
export function longAngleDist(a0: number, a1: number): number {
	return PI2 - shortAngleDist(a0, a1)
}

/**
 * Interpolate an angle between two angles.
 *
 * @param a0 - The first angle.
 * @param a1 - The second angle.
 * @param t - The interpolation value.
 * @public
 */
export function lerpAngles(a0: number, a1: number, t: number): number {
	return a0 + shortAngleDist(a0, a1) * t
}

/**
 * Get the short distance between two angles.
 *
 * @param a0 - The first angle.
 * @param a1 - The second angle.
 * @public
 */
export function angleDelta(a0: number, a1: number): number {
	return shortAngleDist(a0, a1)
}

/**
 * Get the "sweep" or short distance between two points on a circle's perimeter.
 *
 * @param C - The center of the circle.
 * @param A - The first point.
 * @param B - The second point.
 * @public
 */
export function getSweep(C: VecLike, A: VecLike, B: VecLike): number {
	return angleDelta(Vec2d.Angle(C, A), Vec2d.Angle(C, B))
}

/**
 * Clamp radians within 0 and 2PI
 *
 * @param r - The radian value.
 * @public
 */
export function clampRadians(r: number): number {
	return (PI2 + r) % PI2
}

/**
 * Clamp rotation to even segments.
 *
 * @param r - The rotation in radians.
 * @param segments - The number of segments.
 * @public
 */
export function snapAngle(r: number, segments: number): number {
	const seg = PI2 / segments
	let ang = (Math.floor((clampRadians(r) + seg / 2) / seg) * seg) % PI2
	if (ang < PI) ang += PI2
	if (ang > PI) ang -= PI2
	return ang
}

/**
 * Checks whether two angles are approximately at right-angles or parallel to each other
 *
 * @param a - Angle a (radians)
 * @param b - Angle b (radians)
 * @returns True iff the angles are approximately at right-angles or parallel to each other
 * @public
 */
export function areAnglesCompatible(a: number, b: number) {
	return a === b || approximately((a % (Math.PI / 2)) - (b % (Math.PI / 2)), 0)
}

/**
 * Is angle c between angles a and b?
 *
 * @param a - The first angle.
 * @param b - The second angle.
 * @param c - The third angle.
 * @public
 */
export function isAngleBetween(a: number, b: number, c: number): boolean {
	// Normalize the angles to ensure they're in the same domain
	a = canonicalizeRotation(a)
	b = canonicalizeRotation(b)
	c = canonicalizeRotation(c)

	// Compute vectors corresponding to angles a and b
	const ax = Math.cos(a)
	const ay = Math.sin(a)
	const bx = Math.cos(b)
	const by = Math.sin(b)

	// Compute the vector corresponding to angle c
	const cx = Math.cos(c)
	const cy = Math.sin(c)

	// Calculate dot products
	const dotAc = ax * cx + ay * cy
	const dotBc = bx * cx + by * cy

	// If angle c is between a and b, both dot products should be >= 0
	return dotAc >= 0 && dotBc >= 0
}

/**
 * Convert degrees to radians.
 *
 * @param d - The degree in degrees.
 * @public
 */
export function degreesToRadians(d: number): number {
	return (d * PI) / 180
}

/**
 * Convert radians to degrees.
 *
 * @param r - The degree in radians.
 * @public
 */
export function radiansToDegrees(r: number): number {
	return (r * 180) / PI
}

/**
 * Get the length of an arc between two points on a circle's perimeter.
 *
 * @param C - The circle's center as [x, y].
 * @param r - The circle's radius.
 * @param A - The first point.
 * @param B - The second point.
 * @public
 */
export function getArcLength(C: VecLike, r: number, A: VecLike, B: VecLike): number {
	const sweep = getSweep(C, A, B)
	return r * PI2 * (sweep / PI2)
}

/**
 * Get a point on the perimeter of a circle.
 *
 * @param cx - The center x of the circle.
 * @param cy - The center y of the circle.
 * @param r - The radius of the circle.
 * @param a - The normalized point on the circle.
 * @public
 */
export function getPointOnCircle(cx: number, cy: number, r: number, a: number) {
	return new Vec2d(cx + r * Math.cos(a), cy + r * Math.sin(a))
}
/** @public */
export function getPolygonVertices(width: number, height: number, sides: number) {
	const cx = width / 2
	const cy = height / 2
	const pointsOnPerimeter: Vec2d[] = []
	let minX = Infinity
	let minY = Infinity
	for (let i = 0; i < sides; i++) {
		const step = PI2 / sides
		const t = -TAU + i * step
		const x = cx + cx * Math.cos(t)
		const y = cy + cy * Math.sin(t)
		if (x < minX) minX = x
		if (y < minY) minY = y
		pointsOnPerimeter.push(new Vec2d(x, y))
	}

	if (minX !== 0 || minY !== 0) {
		for (let i = 0; i < pointsOnPerimeter.length; i++) {
			const pt = pointsOnPerimeter[i]
			pt.x -= minX
			pt.y -= minY
		}
	}

	return pointsOnPerimeter
}

/**
 * @param a0 - The start point in the A range
 * @param a1 - The end point in the A range
 * @param b0 - The start point in the B range
 * @param b1 - The end point in the B range
 * @returns True if the ranges overlap
 * @public
 */
export function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
	return a0 < b1 && b0 < a1
}

/**
 * Finds the intersection of two ranges.
 *
 * @param a0 - The start point in the A range
 * @param a1 - The end point in the A range
 * @param b0 - The start point in the B range
 * @param b1 - The end point in the B range
 * @returns The intersection of the ranges, or null if no intersection
 * @public
 */
export function rangeIntersection(
	a0: number,
	a1: number,
	b0: number,
	b1: number
): [number, number] | null {
	const min = Math.max(a0, b0)
	const max = Math.min(a1, b1)
	if (min <= max) {
		return [min, max]
	}
	return null
}

/**
 * Gets the width/height of a star given its input bounds.
 *
 * @param sides - Number of sides
 * @param w - T target width
 * @param h - Target height
 * @returns Box2d
 * @public
 */
export const getStarBounds = (sides: number, w: number, h: number): Box2d => {
	const step = PI2 / sides / 2
	const rightMostIndex = Math.floor(sides / 4) * 2
	const leftMostIndex = sides * 2 - rightMostIndex
	const topMostIndex = 0
	const bottomMostIndex = Math.floor(sides / 2) * 2
	const maxX = (Math.cos(-TAU + rightMostIndex * step) * w) / 2
	const minX = (Math.cos(-TAU + leftMostIndex * step) * w) / 2
	const minY = (Math.sin(-TAU + topMostIndex * step) * h) / 2
	const maxY = (Math.sin(-TAU + bottomMostIndex * step) * h) / 2
	return new Box2d(0, 0, maxX - minX, maxY - minY)
}

/** Helper for point in polygon */
function cross(x: VecLike, y: VecLike, z: VecLike): number {
	return (y.x - x.x) * (z.y - x.y) - (z.x - x.x) * (y.y - x.y)
}

/**
 * Utils for working with points.
 *
 * @public
 */
/**
 * Get whether a point is inside of a circle.
 *
 * @param A - The point to check.
 * @param C - The circle's center point as [x, y].
 * @param r - The circle's radius.
 * @returns Boolean
 * @public
 */
export function pointInCircle(A: VecLike, C: VecLike, r: number): boolean {
	return Vec2d.Dist(A, C) <= r
}

/**
 * Get whether a point is inside of an ellipse.
 *
 * @param point - The point to check.
 * @param center - The ellipse's center point as [x, y].
 * @param rx - The ellipse's x radius.
 * @param ry - The ellipse's y radius.
 * @param rotation - The ellipse's rotation.
 * @returns Boolean
 * @public
 */
export function pointInEllipse(
	A: VecLike,
	C: VecLike,
	rx: number,
	ry: number,
	rotation = 0
): boolean {
	rotation = rotation || 0
	const cos = Math.cos(rotation)
	const sin = Math.sin(rotation)
	const delta = Vec2d.Sub(A, C)
	const tdx = cos * delta.x + sin * delta.y
	const tdy = sin * delta.x - cos * delta.y

	return (tdx * tdx) / (rx * rx) + (tdy * tdy) / (ry * ry) <= 1
}

/**
 * Get whether a point is inside of a rectangle.
 *
 * @param A - The point to check.
 * @param point - The rectangle's top left point as [x, y].
 * @param size - The rectangle's size as [width, height].
 * @public
 */
export function pointInRect(A: VecLike, point: VecLike, size: VecLike): boolean {
	return !(A.x < point.x || A.x > point.x + size.x || A.y < point.y || A.y > point.y + size.y)
}

/**
 * Get whether a point is inside of a polygon.
 *
 * ```ts
 * const result = pointInPolygon(myPoint, myPoints)
 * ```
 *
 * @public
 */
export function pointInPolygon(A: VecLike, points: VecLike[]): boolean {
	let windingNumber = 0
	let a: VecLike
	let b: VecLike

	for (let i = 0; i < points.length; i++) {
		a = points[i]
		b = points[(i + 1) % points.length]

		if (a.y <= A.y) {
			if (b.y > A.y && cross(a, b, A) > 0) {
				windingNumber += 1
			}
		} else if (b.y <= A.y && cross(a, b, A) < 0) {
			windingNumber -= 1
		}
	}

	return windingNumber !== 0
}

/**
 * Get whether a point is inside of a bounds.
 *
 * @param A - The point to check.
 * @param b - The bounds to check.
 * @returns Boolean
 * @public
 */
export function pointInBounds(A: VecLike, b: Box2d): boolean {
	return !(A.x < b.minX || A.x > b.maxX || A.y < b.minY || A.y > b.maxY)
}

/**
 * Hit test a point and a polyline using a minimum distance.
 *
 * @param A - The point to check.
 * @param points - The points that make up the polyline.
 * @param distance - The mininum distance that qualifies a hit.
 * @returns Boolean
 * @public
 */
export function pointInPolyline(A: VecLike, points: VecLike[], distance = 3): boolean {
	for (let i = 1; i < points.length; i++) {
		if (Vec2d.DistanceToLineSegment(points[i - 1], points[i], A) < distance) {
			return true
		}
	}
	return false
}

/**
 * Get whether a point is within a certain distance from a polyline.
 *
 * @param A - The point to check.
 * @param points - The points that make up the polyline.
 * @param distance - The mininum distance that qualifies a hit.
 * @public
 */
export function pointNearToPolyline(A: VecLike, points: VecLike[], distance = 8) {
	const len = points.length
	for (let i = 1; i < len; i++) {
		const p1 = points[i - 1]
		const p2 = points[i]
		const d = Vec2d.DistanceToLineSegment(p1, p2, A)
		if (d < distance) return true
	}
	return false
}

/**
 * Get whether a point is within a certain distance from a line segment.
 *
 * @param A - The point to check.
 * @param p1 - The polyline's first point.
 * @param p2 - The polyline's second point.
 * @param distance - The mininum distance that qualifies a hit.
 * @public
 */
export function pointNearToLineSegment(A: VecLike, p1: VecLike, p2: VecLike, distance = 8) {
	const d = Vec2d.DistanceToLineSegment(p1, p2, A)
	if (d < distance) return true
	return false
}

/**
 * Simplify a line (using Ramer-Douglas-Peucker algorithm).
 *
 * @param points - An array of points as [x, y, ...][]
 * @param tolerance - The minimum line distance (also called epsilon).
 * @returns Simplified array as [x, y, ...][]
 * @public
 */
export function simplify(points: VecLike[], tolerance = 1): VecLike[] {
	const len = points.length
	const a = points[0]
	const b = points[len - 1]
	const { x: x1, y: y1 } = a
	const { x: x2, y: y2 } = b
	if (len > 2) {
		let distance = 0
		let index = 0
		const max = new Vec2d(y2 - y1, x2 - x1).len2()
		for (let i = 1; i < len - 1; i++) {
			const { x: x0, y: y0 } = points[i]
			const d = Math.pow(x0 * (y2 - y1) + x1 * (y0 - y2) + x2 * (y1 - y0), 2) / max
			if (distance > d) continue
			distance = d
			index = i
		}
		if (distance > tolerance) {
			const l0 = simplify(points.slice(0, index + 1), tolerance)
			const l1 = simplify(points.slice(index + 1), tolerance)
			return l0.concat(l1.slice(1))
		}
	}
	return [a, b]
}

function _getSqSegDist(p: VecLike, p1: VecLike, p2: VecLike) {
	let x = p1.x
	let y = p1.y
	let dx = p2.x - x
	let dy = p2.y - y
	if (dx !== 0 || dy !== 0) {
		const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy)
		if (t > 1) {
			x = p2.x
			y = p2.y
		} else if (t > 0) {
			x += dx * t
			y += dy * t
		}
	}
	dx = p.x - x
	dy = p.y - y
	return dx * dx + dy * dy
}

function _simplifyStep(
	points: VecLike[],
	first: number,
	last: number,
	sqTolerance: number,
	result: VecLike[]
) {
	let maxSqDist = sqTolerance
	let index = -1
	for (let i = first + 1; i < last; i++) {
		const sqDist = _getSqSegDist(points[i], points[first], points[last])
		if (sqDist > maxSqDist) {
			index = i
			maxSqDist = sqDist
		}
	}
	if (index > -1 && maxSqDist > sqTolerance) {
		if (index - first > 1) _simplifyStep(points, first, index, sqTolerance, result)
		result.push(points[index])
		if (last - index > 1) _simplifyStep(points, index, last, sqTolerance, result)
	}
}

/** @public */
export function simplify2(points: VecLike[], tolerance = 1) {
	if (points.length <= 2) return points
	const sqTolerance = tolerance * tolerance
	// Radial distance
	let A = points[0]
	let B = points[1]
	const newPoints = [A]
	for (let i = 1, len = points.length; i < len; i++) {
		B = points[i]
		if ((B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y) > sqTolerance) {
			newPoints.push(B)
			A = B
		}
	}
	if (A !== B) newPoints.push(B)
	// Ramer-Douglas-Peucker
	const last = newPoints.length - 1
	const result = [newPoints[0]]
	_simplifyStep(newPoints, 0, last, sqTolerance, result)
	result.push(newPoints[last], points[points.length - 1])
	return result
}

/** @public */
export function getMinX(pts: VecLike[]) {
	let top = pts[0]
	for (let i = 1; i < pts.length; i++) {
		if (pts[i].x < top.x) {
			top = pts[i]
		}
	}
	return top.x
}

/** @public */
export function getMinY(pts: VecLike[]) {
	let top = pts[0]
	for (let i = 1; i < pts.length; i++) {
		if (pts[i].y < top.y) {
			top = pts[i]
		}
	}
	return top.y
}

/** @public */
export function getMaxX(pts: VecLike[]) {
	let top = pts[0]
	for (let i = 1; i < pts.length; i++) {
		if (pts[i].x > top.x) {
			top = pts[i]
		}
	}
	return top.x
}

/** @public */
export function getMaxY(pts: VecLike[]) {
	let top = pts[0]
	for (let i = 1; i < pts.length; i++) {
		if (pts[i].y > top.y) {
			top = pts[i]
		}
	}
	return top.y
}

/** @public */
export function getMidX(pts: VecLike[]) {
	const a = getMinX(pts)
	const b = getMaxX(pts)

	return a + (b - a) / 2
}

/** @public */
export function getMidY(pts: VecLike[]) {
	const a = getMinY(pts)
	const b = getMaxY(pts)

	return a + (b - a) / 2
}

/** @public */
export function getWidth(pts: VecLike[]) {
	const a = getMinX(pts)
	const b = getMaxX(pts)
	return b - a
}

/** @public */
export function getHeight(pts: VecLike[]) {
	const a = getMinY(pts)
	const b = getMaxY(pts)
	return b - a
}

/**
 * The DOM likes values to be fixed to 3 decimal places
 *
 * @public
 */
export function toDomPrecision(v: number) {
	return +v.toFixed(4)
}

/**
 * @public
 */
export function toFixed(v: number) {
	return +v.toFixed(2)
}

/**
 * Check if a float is safe to use. ie: Not too big or small.
 * @public
 */
export const isSafeFloat = (n: number) => {
	return Math.abs(n) < Number.MAX_SAFE_INTEGER
}
