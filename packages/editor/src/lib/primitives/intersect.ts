import { Box } from './Box'
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

	// These comparisons inline approximately(x, 0) and approximatelyLte(x, 0/1)
	// to avoid 7+ function calls per invocation.
	if (Math.abs(ua_t) <= precision || Math.abs(ub_t) <= precision) return null // coincident

	if (Math.abs(u_b) <= precision) return null // parallel

	const ua = ua_t / u_b
	const ub = ub_t / u_b
	// Inlined: approximately(ua, 0) && approximatelyLte(ua, 1) && same for ub
	if (ua >= -precision && ua <= 1 + precision && ub >= -precision && ub <= 1 + precision) {
		// Inlined: Vec.Lrp(a1, a2, ua) — i.e. a1 + ua * (a2 - a1)
		return new Vec(a1.x + ua * AVx, a1.y + ua * AVy)
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
	// Precompute segment delta (dx, dy) and origin-to-center offset (ocx, ocy)
	// to avoid repeated (a2.x - a1.x) and (a1.x - c.x) subexpressions.
	const dx = a2.x - a1.x
	const dy = a2.y - a1.y
	const ocx = a1.x - c.x
	const ocy = a1.y - c.y

	const a = dx * dx + dy * dy
	const b = 2 * (dx * ocx + dy * ocy)
	const cc = ocx * ocx + ocy * ocy - r * r
	const deter = b * b - 4 * a * cc

	if (deter <= 0) return null // outside or tangent

	const e = Math.sqrt(deter)
	const u1 = (-b + e) / (2 * a)
	const u2 = (-b - e) / (2 * a)

	if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
		return null
	}

	const result: VecLike[] = []

	// Inlined: Vec.Lrp(a1, a2, u) — i.e. a1 + u * (a2 - a1)
	if (u1 >= 0 && u1 <= 1) result.push(new Vec(a1.x + dx * u1, a1.y + dy * u1))
	if (u2 >= 0 && u2 <= 1) result.push(new Vec(a1.x + dx * u2, a1.y + dy * u2))

	if (result.length === 0) return null

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

const CLIP_EPSILON = 1e-10

/**
 * Intersect a line segment with the infinite line through `lineStart` and `lineEnd`.
 * Used by Sutherland–Hodgman clipping (half-plane edges, not finite clip segments).
 */
function intersectLineSegmentLine(
	a1: VecLike,
	a2: VecLike,
	lineStart: VecLike,
	lineEnd: VecLike,
	precision = CLIP_EPSILON
): Vec | null {
	const ABx = a1.x - lineStart.x
	const ABy = a1.y - lineStart.y
	const LVx = lineEnd.x - lineStart.x
	const LVy = lineEnd.y - lineStart.y
	const AVx = a2.x - a1.x
	const AVy = a2.y - a1.y
	const ua_t = LVx * ABy - LVy * ABx
	const u_b = LVy * AVx - LVx * AVy

	if (Math.abs(u_b) <= precision) return null // parallel

	const ua = ua_t / u_b
	if (ua >= -precision && ua <= 1 + precision) {
		return new Vec(a1.x + ua * AVx, a1.y + ua * AVy)
	}

	return null
}

function isInsideConvexClipEdge(
	point: VecLike,
	edgeStart: VecLike,
	edgeEnd: VecLike,
	precision = CLIP_EPSILON
): boolean {
	const cross =
		(edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) -
		(edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x)
	return cross >= -precision
}

function clipPolygonByEdge(
	subject: VecLike[],
	edgeStart: VecLike,
	edgeEnd: VecLike,
	precision = CLIP_EPSILON
): VecLike[] {
	const output: VecLike[] = []
	const n = subject.length
	if (n === 0) return output

	for (let i = 0; i < n; i++) {
		const current = subject[i]
		const previous = subject[(i + n - 1) % n]
		const currentInside = isInsideConvexClipEdge(current, edgeStart, edgeEnd, precision)
		const previousInside = isInsideConvexClipEdge(previous, edgeStart, edgeEnd, precision)

		if (currentInside) {
			if (!previousInside) {
				const intersection = intersectLineSegmentLine(
					previous,
					current,
					edgeStart,
					edgeEnd,
					precision
				)
				if (intersection) output.push(intersection)
			}
			output.push(current)
		} else if (previousInside) {
			const intersection = intersectLineSegmentLine(
				previous,
				current,
				edgeStart,
				edgeEnd,
				precision
			)
			if (intersection) output.push(intersection)
		}
	}

	return output
}

function clipPolygonByConvexWindow(subject: VecLike[], clipWindow: VecLike[]): VecLike[] {
	let output = subject
	const m = clipWindow.length
	if (m < 3) return []

	for (let i = 0; i < m; i++) {
		const edgeStart = clipWindow[i]
		const edgeEnd = clipWindow[(i + 1) % m]
		output = clipPolygonByEdge(output, edgeStart, edgeEnd)
		if (output.length === 0) return []
	}

	return output
}

function dedupeConsecutivePolygonPoints(points: VecLike[], precision = CLIP_EPSILON): VecLike[] {
	if (points.length === 0) return points

	const result: VecLike[] = [points[0]]
	for (let i = 1; i < points.length; i++) {
		const prev = result[result.length - 1]
		const cur = points[i]
		const dx = cur.x - prev.x
		const dy = cur.y - prev.y
		if (dx * dx + dy * dy > precision * precision) {
			result.push(cur)
		}
	}

	if (result.length > 1) {
		const first = result[0]
		const last = result[result.length - 1]
		const dx = last.x - first.x
		const dy = last.y - first.y
		if (dx * dx + dy * dy <= precision * precision) {
			result.pop()
		}
	}

	return result
}

function polygonAreaAbs(points: VecLike[]): number {
	let area = 0
	for (let i = 0; i < points.length; i++) {
		const j = (i + 1) % points.length
		area += points[i].x * points[j].y - points[j].x * points[i].y
	}
	return Math.abs(area) / 2
}

function finalizePolygonClipResult(clipped: VecLike[]): VecLike[] | null {
	const deduped = dedupeConsecutivePolygonPoints(clipped)
	if (deduped.length < 3) return null
	if (polygonAreaAbs(deduped) <= CLIP_EPSILON) return null
	return deduped
}

/**
 * Clip a polygon by a convex clip window (Sutherland-Hodgman).
 *
 * `polygonA` may be concave. `polygonB` must be a convex clip window with
 * consistent winding (the same winding as tldraw shape geometry vertices).
 *
 * @param polygonA - Subject polygon to clip.
 * @param polygonB - Convex clip window polygon.
 * @public
 */
export function intersectPolygonPolygon(
	polygonA: VecLike[],
	polygonB: VecLike[]
): VecLike[] | null {
	if (polygonA.length < 3 || polygonB.length < 3) return null

	const clippedA = finalizePolygonClipResult(clipPolygonByConvexWindow(polygonA, polygonB))
	if (clippedA) return clippedA

	return finalizePolygonClipResult(clipPolygonByConvexWindow(polygonB, polygonA))
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
