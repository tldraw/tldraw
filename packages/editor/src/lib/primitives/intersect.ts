import { Box } from './Box'
import { approximately, approximatelyLte, pointInPolygon } from './utils'
import { Vec, VecLike } from './Vec'

// need even more intersections? See https://gist.github.com/steveruizok/35c02d526c707003a5c79761bfb89a52

/**
 * Find the intersection between a line segment and a line segment.
 *
 * @param a1 - The first segment's first point.
 * @param a2 - The first segment's second point.
 * @param b1 - The second segment's first point.
 * @param b2 - The second segment's second point.
 * @public
 */
export function intersectLineSegmentLineSegment(
	a1: VecLike,
	a2: VecLike,
	b1: VecLike,
	b2: VecLike,
	precision = 1e-10
) {
	const ABx = a1.x - b1.x
	const ABy = a1.y - b1.y
	const BVx = b2.x - b1.x
	const BVy = b2.y - b1.y
	const AVx = a2.x - a1.x
	const AVy = a2.y - a1.y
	const ua_t = BVx * ABy - BVy * ABx
	const ub_t = AVx * ABy - AVy * ABx
	const u_b = BVy * AVx - BVx * AVy

	if (approximately(ua_t, 0, precision) || approximately(ub_t, 0, precision)) return null // coincident

	if (approximately(u_b, 0, precision)) return null // parallel

	if (u_b !== 0) {
		const ua = ua_t / u_b
		const ub = ub_t / u_b
		if (
			approximatelyLte(0, ua, precision) &&
			approximatelyLte(ua, 1, precision) &&
			approximatelyLte(0, ub, precision) &&
			approximatelyLte(ub, 1, precision)
		) {
			return Vec.AddXY(a1, ua * AVx, ua * AVy)
		}
	}

	return null // no intersection
}

/**
 * Find the intersections between a line segment and a circle.
 *
 * @param a1 - The segment's first point.
 * @param a2 - The segment's second point.
 * @param c - The circle's center.
 * @param r - The circle's radius.
 * @public
 */
export function intersectLineSegmentCircle(a1: VecLike, a2: VecLike, c: VecLike, r: number) {
	const a = (a2.x - a1.x) * (a2.x - a1.x) + (a2.y - a1.y) * (a2.y - a1.y)
	const b = 2 * ((a2.x - a1.x) * (a1.x - c.x) + (a2.y - a1.y) * (a1.y - c.y))
	const cc =
		c.x * c.x + c.y * c.y + a1.x * a1.x + a1.y * a1.y - 2 * (c.x * a1.x + c.y * a1.y) - r * r
	const deter = b * b - 4 * a * cc

	if (deter < 0) return null // outside
	if (deter === 0) return null // tangent

	const e = Math.sqrt(deter)
	const u1 = (-b + e) / (2 * a)
	const u2 = (-b - e) / (2 * a)

	if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
		return null // outside or inside
		// if ((u1 < 0 && u2 < 0) || (u1 > 1 && u2 > 1)) {
		// 	return null // outside
		// } else return null // inside'
	}

	const result: VecLike[] = []

	if (0 <= u1 && u1 <= 1) result.push(Vec.Lrp(a1, a2, u1))
	if (0 <= u2 && u2 <= 1) result.push(Vec.Lrp(a1, a2, u2))

	if (result.length === 0) return null // no intersection

	return result
}

/**
 * Find the intersections between a line segment and a polyline.
 *
 * @param a1 - The segment's first point.
 * @param a2 - The segment's second point.
 * @param points - The points in the polyline.
 * @public
 */
export function intersectLineSegmentPolyline(a1: VecLike, a2: VecLike, points: VecLike[]) {
	const result: VecLike[] = []
	let segmentIntersection: VecLike | null

	for (let i = 0, n = points.length - 1; i < n; i++) {
		segmentIntersection = intersectLineSegmentLineSegment(a1, a2, points[i], points[i + 1])
		if (segmentIntersection) result.push(segmentIntersection)
	}

	if (result.length === 0) return null // no intersection

	return result
}

/**
 * Find the intersections between a line segment and a closed polygon.
 *
 * @param a1 - The segment's first point.
 * @param a2 - The segment's second point.
 * @param points - The points in the polygon.
 * @public
 */
export function intersectLineSegmentPolygon(a1: VecLike, a2: VecLike, points: VecLike[]) {
	const result: VecLike[] = []
	let segmentIntersection: VecLike | null

	for (let i = 1, n = points.length; i < n + 1; i++) {
		segmentIntersection = intersectLineSegmentLineSegment(
			a1,
			a2,
			points[i - 1],
			points[i % points.length]
		)

		if (segmentIntersection) result.push(segmentIntersection)
	}

	if (result.length === 0) return null // no intersection

	return result
}

/**
 * Find the intersections between a circle and a circle.
 *
 * @param c1 - The first circle's center.
 * @param r1 - The first circle's radius.
 * @param c2 - The second circle's center.
 * @param r2 - The second circle's radius.
 * @public
 */
export function intersectCircleCircle(c1: VecLike, r1: number, c2: VecLike, r2: number) {
	let dx = c2.x - c1.x
	let dy = c2.y - c1.y
	const d = Math.sqrt(dx * dx + dy * dy),
		x = (d * d - r2 * r2 + r1 * r1) / (2 * d),
		y = Math.sqrt(r1 * r1 - x * x)
	dx /= d
	dy /= d
	return [
		new Vec(c1.x + dx * x - dy * y, c1.y + dy * x + dx * y),
		new Vec(c1.x + dx * x + dy * y, c1.y + dy * x - dx * y),
	]
}

/**
 * Find the intersections between a circle and a bounding box.
 *
 * @param c - The circle's center.
 * @param r - The circle's radius.
 * @param points - The points in the polygon.
 * @public
 */
export function intersectCirclePolygon(c: VecLike, r: number, points: VecLike[]) {
	const result: VecLike[] = []
	let a: VecLike, b: VecLike, int: VecLike[] | null

	for (let i = 0, n = points.length; i < n; i++) {
		a = points[i]
		b = points[(i + 1) % points.length]
		int = intersectLineSegmentCircle(a, b, c, r)
		if (int) result.push(...int)
	}

	if (result.length === 0) return null // no intersection

	return result
}

/**
 * Find the intersections between a circle and a bounding box.
 *
 * @param c - The circle's center.
 * @param r - The circle's radius.
 * @param points - The points in the polyline.
 * @public
 */
export function intersectCirclePolyline(c: VecLike, r: number, points: VecLike[]) {
	const result: VecLike[] = []
	let a: VecLike, b: VecLike, int: VecLike[] | null

	for (let i = 1, n = points.length; i < n; i++) {
		a = points[i - 1]
		b = points[i]
		int = intersectLineSegmentCircle(a, b, c, r)
		if (int) result.push(...int)
	}

	if (result.length === 0) return null // no intersection

	return result
}

/**
 * Find the intersections between a polygon and a bounding box.
 *
 * @public
 */
export function intersectPolygonBounds(points: VecLike[], bounds: Box) {
	const result: VecLike[] = []
	let segmentIntersection: VecLike[] | null

	for (const side of bounds.sides) {
		segmentIntersection = intersectLineSegmentPolygon(side[0], side[1], points)
		if (segmentIntersection) result.push(...segmentIntersection)
	}

	if (result.length === 0) return null // no intersection

	return result
}

function ccw(A: VecLike, B: VecLike, C: VecLike) {
	return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x)
}

/** @public */
export function linesIntersect(A: VecLike, B: VecLike, C: VecLike, D: VecLike) {
	return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D)
}

/**
 * Create a new convex polygon as the intersection of two convex polygons.
 *
 * @param polygonA - An array of points representing the first polygon.
 * @param polygonB - An array of points representing the second polygon.
 * @public
 */
export function intersectPolygonPolygon(
	polygonA: VecLike[],
	polygonB: VecLike[]
): VecLike[] | null {
	// Create an empty polygon as result
	const result: Map<string, VecLike> = new Map()
	let a: VecLike, b: VecLike, c: VecLike, d: VecLike

	// Add all corners of PolygonA that is inside PolygonB to result
	for (let i = 0, n = polygonA.length; i < n; i++) {
		a = polygonA[i]
		if (pointInPolygon(a, polygonB)) {
			const id = getPointId(a)
			if (!result.has(id)) {
				result.set(id, a)
			}
		}
	}
	// Add all corners of PolygonB that is inside PolygonA to result
	for (let i = 0, n = polygonB.length; i < n; i++) {
		a = polygonB[i]
		if (pointInPolygon(a, polygonA)) {
			const id = getPointId(a)
			if (!result.has(id)) {
				result.set(id, a)
			}
		}
	}

	// Add all intersection points to result
	for (let i = 0, n = polygonA.length; i < n; i++) {
		a = polygonA[i]
		b = polygonA[(i + 1) % polygonA.length]

		for (let j = 0, m = polygonB.length; j < m; j++) {
			c = polygonB[j]
			d = polygonB[(j + 1) % polygonB.length]
			const intersection = intersectLineSegmentLineSegment(a, b, c, d)

			if (intersection !== null) {
				const id = getPointId(intersection)
				if (!result.has(id)) {
					result.set(id, intersection)
				}
			}
		}
	}

	if (result.size === 0) return null // no intersection

	// Order all points in the result counter-clockwise.
	return orderClockwise([...result.values()])
}

/**
 * Find all the points where `polyA` and `polyB` intersect and returns them in an undefined order.
 * To find the polygon that's the intersection of polyA and polyB, use `intersectPolygonPolygon`
 * instead, which orders the points and includes internal points.
 *
 * @param polyA - The first polygon.
 * @param polyB - The second polygon.
 * @param isAClosed - Whether `polyA` is a closed polygon or a polyline.
 * @param isBClosed - Whether `polyB` is a closed polygon or a polyline.
 * @public
 */
export function intersectPolys(
	polyA: VecLike[],
	polyB: VecLike[],
	isAClosed: boolean,
	isBClosed: boolean
): VecLike[] {
	const result: Map<string, VecLike> = new Map()

	// Add all intersection points to result
	for (let i = 0, n = isAClosed ? polyA.length : polyA.length - 1; i < n; i++) {
		const currentA = polyA[i]
		const nextA = polyA[(i + 1) % polyA.length]

		for (let j = 0, m = isBClosed ? polyB.length : polyB.length - 1; j < m; j++) {
			const currentB = polyB[j]
			const nextB = polyB[(j + 1) % polyB.length]
			const intersection = intersectLineSegmentLineSegment(currentA, nextA, currentB, nextB)

			if (intersection !== null) {
				const id = getPointId(intersection)
				if (!result.has(id)) {
					result.set(id, intersection)
				}
			}
		}
	}

	return [...result.values()]
}

function getPointId(point: VecLike) {
	return `${point.x},${point.y}`
}

function orderClockwise(points: VecLike[]): VecLike[] {
	const C = Vec.Average(points)
	return points.sort((A, B) => Vec.Angle(C, A) - Vec.Angle(C, B))
}

/** @public */
export function polygonsIntersect(a: VecLike[], b: VecLike[]) {
	let a0: VecLike, a1: VecLike, b0: VecLike, b1: VecLike
	for (let i = 0, n = a.length; i < n; i++) {
		a0 = a[i]
		a1 = a[(i + 1) % n]
		for (let j = 0, m = b.length; j < m; j++) {
			b0 = b[j]
			b1 = b[(j + 1) % m]
			if (linesIntersect(a0, a1, b0, b1)) return true
		}
	}
	return false
}

/** @public */
export function polygonIntersectsPolyline(polygon: VecLike[], polyline: VecLike[]) {
	let a: VecLike, b: VecLike, c: VecLike, d: VecLike
	for (let i = 0, n = polygon.length; i < n; i++) {
		a = polygon[i]
		b = polygon[(i + 1) % n]

		for (let j = 1, m = polyline.length; j < m; j++) {
			c = polyline[j - 1]
			d = polyline[j]
			if (linesIntersect(a, b, c, d)) return true
		}
	}
	return false
}
