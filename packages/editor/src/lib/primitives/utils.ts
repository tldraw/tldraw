import { Vec, VecLike } from './Vec'

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
export const HALF_PI = PI / 2
/** @public */
export const PI2 = PI * 2
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
 * Whether a number is approximately less than or equal to another number.
 *
 * @param a - The first number.
 * @param b - The second number.
 * @public
 */
export function approximatelyLte(a: number, b: number, precision = 0.000001) {
	return a < b || approximately(a, b, precision)
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
	return PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
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
 * Get a point on the perimeter of a circle.
 *
 * @param center - The center of the circle.
 * @param r - The radius of the circle.
 * @param a - The angle in radians.
 * @public
 */
export function getPointOnCircle(center: VecLike, r: number, a: number) {
	return new Vec(center.x, center.y).add(Vec.FromAngle(a, r))
}

/** @public */
export function getPolygonVertices(width: number, height: number, sides: number) {
	const cx = width / 2
	const cy = height / 2
	const pointsOnPerimeter: Vec[] = []

	let minX = Infinity
	let maxX = -Infinity
	let minY = Infinity
	let maxY = -Infinity
	for (let i = 0; i < sides; i++) {
		const step = PI2 / sides
		const t = -HALF_PI + i * step
		const x = cx + cx * Math.cos(t)
		const y = cy + cy * Math.sin(t)
		if (x < minX) minX = x
		if (y < minY) minY = y
		if (x > maxX) maxX = x
		if (y > maxY) maxY = y
		pointsOnPerimeter.push(new Vec(x, y))
	}

	// Bounds of calculated points
	const w = maxX - minX
	const h = maxY - minY

	// Difference between input bounds and calculated bounds
	const dx = width - w
	const dy = height - h

	// If there's a difference, scale the points to the input bounds
	if (dx !== 0 || dy !== 0) {
		for (let i = 0; i < pointsOnPerimeter.length; i++) {
			const pt = pointsOnPerimeter[i]
			pt.x = ((pt.x - minX) / w) * width
			pt.y = ((pt.y - minY) / h) * height
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

/** Helper for point in polygon */
function cross(x: VecLike, y: VecLike, z: VecLike): number {
	return (y.x - x.x) * (z.y - x.y) - (z.x - x.x) * (y.y - x.y)
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
		// Point is the same as one of the corners of the polygon
		if (a.x === A.x && a.y === A.y) return true

		b = points[(i + 1) % points.length]

		// Point is on the polygon edge
		if (Vec.Dist(A, a) + Vec.Dist(A, b) === Vec.Dist(a, b)) return true

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
 * The DOM likes values to be fixed to 3 decimal places
 *
 * @public
 */
export function toDomPrecision(v: number) {
	return Math.round(v * 1e4) / 1e4
}

/**
 * @public
 */
export function toFixed(v: number) {
	return Math.round(v * 1e2) / 1e2
}

/**
 * Check if a float is safe to use. ie: Not too big or small.
 * @public
 */
export const isSafeFloat = (n: number) => {
	return Math.abs(n) < Number.MAX_SAFE_INTEGER
}

/**
 * Get the angle of a point on an arc.
 * @param fromAngle - The angle from center to arc's start point (A) on the circle
 * @param toAngle - The angle from center to arc's end point (B) on the circle
 * @param direction - The direction of the arc (1 = counter-clockwise, -1 = clockwise)
 * @returns The distance in radians between the two angles according to the direction
 * @public
 */
export function angleDistance(fromAngle: number, toAngle: number, direction: number) {
	const dist =
		direction < 0
			? clockwiseAngleDist(fromAngle, toAngle)
			: counterClockwiseAngleDist(fromAngle, toAngle)
	return dist
}

/**
 * Returns the t value of the point on the arc.
 *
 * @param mAB - The measure of the arc from A to B, negative if counter-clockwise
 * @param A - The angle from center to arc's start point (A) on the circle
 * @param B - The angle from center to arc's end point (B) on the circle
 * @param P - The angle on the circle (P) to find the t value for
 *
 * @returns The t value of the point on the arc, with 0 being the start and 1 being the end
 *
 * @public
 */
export function getPointInArcT(mAB: number, A: number, B: number, P: number): number {
	let mAP: number
	if (Math.abs(mAB) > PI) {
		mAP = shortAngleDist(A, P)
		const mPB = shortAngleDist(P, B)
		if (Math.abs(mAP) < Math.abs(mPB)) {
			return mAP / mAB
		} else {
			return (mAB - mPB) / mAB
		}
	} else {
		mAP = shortAngleDist(A, P)
		const t = mAP / mAB

		// If the arc is something like -2.8 to 2.2, then we'll get a weird bug
		// where the measurement to the center is negative but measure to points
		// near the end are positive
		if (Math.sign(mAP) !== Math.sign(mAB)) {
			return Math.abs(t) > 0.5 ? 1 : 0
		}

		return t
	}
}

/**
 * Get the measure of an arc.
 *
 * @param A - The angle from center to arc's start point (A) on the circle
 * @param B - The angle from center to arc's end point (B) on the circle
 * @param sweepFlag - 1 if the arc is clockwise, 0 if counter-clockwise
 * @param largeArcFlag - 1 if the arc is greater than 180 degrees, 0 if less than 180 degrees
 *
 * @returns The measure of the arc, negative if counter-clockwise
 *
 * @public
 */
export function getArcMeasure(A: number, B: number, sweepFlag: number, largeArcFlag: number) {
	const m = ((2 * ((B - A) % PI2)) % PI2) - ((B - A) % PI2)
	if (!largeArcFlag) return m
	return (PI2 - Math.abs(m)) * (sweepFlag ? 1 : -1)
}

/**
 * Get the center of a circle from three points.
 *
 * @param a - The first point
 * @param b - The second point
 * @param c - The third point
 *
 * @returns The center of the circle or null if the points are collinear
 *
 * @public
 */
export function centerOfCircleFromThreePoints(a: VecLike, b: VecLike, c: VecLike) {
	const u = -2 * (a.x * (b.y - c.y) - a.y * (b.x - c.x) + b.x * c.y - c.x * b.y)
	const x =
		((a.x * a.x + a.y * a.y) * (c.y - b.y) +
			(b.x * b.x + b.y * b.y) * (a.y - c.y) +
			(c.x * c.x + c.y * c.y) * (b.y - a.y)) /
		u
	const y =
		((a.x * a.x + a.y * a.y) * (b.x - c.x) +
			(b.x * b.x + b.y * b.y) * (c.x - a.x) +
			(c.x * c.x + c.y * c.y) * (a.x - b.x)) /
		u
	if (!Number.isFinite(x) || !Number.isFinite(y)) {
		return null
	}
	return new Vec(x, y)
}

/** @public */
export function getPointsOnArc(
	startPoint: VecLike,
	endPoint: VecLike,
	center: VecLike | null,
	radius: number,
	numPoints: number
): Vec[] {
	if (center === null) {
		return [Vec.From(startPoint), Vec.From(endPoint)]
	}
	const results: Vec[] = []
	const startAngle = Vec.Angle(center, startPoint)
	const endAngle = Vec.Angle(center, endPoint)
	const l = clockwiseAngleDist(startAngle, endAngle)
	for (let i = 0; i < numPoints; i++) {
		const t = i / (numPoints - 1)
		const angle = startAngle + l * t
		const point = getPointOnCircle(center, radius, angle)
		results.push(point)
	}
	return results
}
