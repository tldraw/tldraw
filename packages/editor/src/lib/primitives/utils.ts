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
 * @param cx - The center x of the circle.
 * @param cy - The center y of the circle.
 * @param r - The radius of the circle.
 * @param a - The normalized point on the circle.
 * @public
 */
export function getPointOnCircle(cx: number, cy: number, r: number, a: number) {
	return new Vec(cx + r * Math.cos(a), cy + r * Math.sin(a))
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
