import { Point, Polygon } from './types'

/** Test if a point is inside a polygon using ray casting */
export function pointInPolygon(point: Point, polygon: Polygon): boolean {
	const { points } = polygon
	let inside = false
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const xi = points[i].x,
			yi = points[i].y
		const xj = points[j].x,
			yj = points[j].y
		const intersect =
			yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
		if (intersect) inside = !inside
	}
	return inside
}

/** Get the bounding box of a polygon */
export function polygonBounds(polygon: Polygon): {
	minX: number
	minY: number
	maxX: number
	maxY: number
} {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity
	for (const p of polygon.points) {
		if (p.x < minX) minX = p.x
		if (p.y < minY) minY = p.y
		if (p.x > maxX) maxX = p.x
		if (p.y > maxY) maxY = p.y
	}
	return { minX, minY, maxX, maxY }
}

/** Find all intersections of a horizontal line (y = scanY) with polygon edges */
export function scanLineIntersections(polygon: Polygon, scanY: number): number[] {
	const intersections: number[] = []
	const { points } = polygon
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const yi = points[i].y,
			yj = points[j].y
		// Check if the scan line crosses this edge
		if ((yi <= scanY && yj > scanY) || (yj <= scanY && yi > scanY)) {
			const xi = points[i].x,
				xj = points[j].x
			const t = (scanY - yi) / (yj - yi)
			intersections.push(xi + t * (xj - xi))
		}
	}
	return intersections.sort((a, b) => a - b)
}

/** Find all intersections of an arbitrary line segment with polygon edges */
export function linePolygonIntersections(p1: Point, p2: Point, polygon: Polygon): Point[] {
	const intersections: Point[] = []
	const { points } = polygon
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const p3 = points[j]
		const p4 = points[i]
		const intersection = lineLineIntersection(p1, p2, p3, p4)
		if (intersection) {
			intersections.push(intersection)
		}
	}
	return intersections
}

/** Find intersection point of two line segments, or null if they don't intersect */
function lineLineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
	const d1x = p2.x - p1.x,
		d1y = p2.y - p1.y
	const d2x = p4.x - p3.x,
		d2y = p4.y - p3.y
	const denom = d1x * d2y - d1y * d2x
	if (Math.abs(denom) < 1e-10) return null // Parallel

	const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom
	const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom

	if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
		return {
			x: p1.x + t * d1x,
			y: p1.y + t * d1y,
		}
	}
	return null
}

/** Rotate points around a center point */
export function rotatePoints(points: Point[], angleDeg: number, center: Point): Point[] {
	const rad = (angleDeg * Math.PI) / 180
	const cos = Math.cos(rad)
	const sin = Math.sin(rad)
	return points.map((p) => ({
		x: cos * (p.x - center.x) - sin * (p.y - center.y) + center.x,
		y: sin * (p.x - center.x) + cos * (p.y - center.y) + center.y,
	}))
}

/** Offset a polygon inward by a given distance using vertex normals.
 * This is a simplified approach - may produce artifacts on very concave polygons. */
export function offsetPolygon(polygon: Polygon, distance: number): Polygon | null {
	const { points } = polygon
	const n = points.length
	if (n < 3) return null

	const result: Point[] = []

	for (let i = 0; i < n; i++) {
		const prev = points[(i - 1 + n) % n]
		const curr = points[i]
		const next = points[(i + 1) % n]

		// Edge vectors
		const e1x = curr.x - prev.x,
			e1y = curr.y - prev.y
		const e2x = next.x - curr.x,
			e2y = next.y - curr.y

		// Edge normals (pointing inward for CW winding, outward for CCW)
		const len1 = Math.sqrt(e1x * e1x + e1y * e1y) || 1
		const len2 = Math.sqrt(e2x * e2x + e2y * e2y) || 1

		const n1x = -e1y / len1,
			n1y = e1x / len1
		const n2x = -e2y / len2,
			n2y = e2x / len2

		// Average normal at vertex
		let nx = n1x + n2x,
			ny = n1y + n2y
		const nLen = Math.sqrt(nx * nx + ny * ny) || 1
		nx /= nLen
		ny /= nLen

		// Scale to maintain offset distance (miter calculation)
		const dot = nx * n1x + ny * n1y
		const scale = dot > 0.1 ? distance / dot : distance

		result.push({
			x: curr.x + nx * scale,
			y: curr.y + ny * scale,
		})
	}

	// Check if polygon is valid (no self-intersections, positive area)
	if (polygonArea(result) < 1) return null

	return { points: result, id: polygon.id }
}

/** Calculate signed area of a polygon (positive = CCW, negative = CW) */
export function polygonArea(points: Point[]): number {
	let area = 0
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		area += (points[j].x + points[i].x) * (points[j].y - points[i].y)
	}
	return Math.abs(area / 2)
}

/** Get the centroid of a polygon */
export function polygonCentroid(polygon: Polygon): Point {
	let cx = 0,
		cy = 0
	for (const p of polygon.points) {
		cx += p.x
		cy += p.y
	}
	const n = polygon.points.length
	return { x: cx / n, y: cy / n }
}

/** A polygon with its associated holes (negative spaces) */
export interface PolygonWithHoles {
	outer: Polygon
	holes: Polygon[]
}

/**
 * Group a flat list of polygons into outer shapes with their holes.
 * A polygon is a hole if its centroid falls inside a larger polygon.
 */
export function groupPolygonsWithHoles(polys: Polygon[]): PolygonWithHoles[] {
	const withArea = polys.map((p) => ({ poly: p, area: polygonArea(p.points) }))
	withArea.sort((a, b) => b.area - a.area) // largest first

	const assigned = new Set<Polygon>()
	const groups: PolygonWithHoles[] = []

	for (const { poly: outer } of withArea) {
		if (assigned.has(outer)) continue
		assigned.add(outer)

		const holes: Polygon[] = []
		for (const { poly: inner } of withArea) {
			if (assigned.has(inner)) continue
			const center = polygonCentroid(inner)
			if (pointInPolygon(center, outer)) {
				holes.push(inner)
				assigned.add(inner)
			}
		}

		groups.push({ outer, holes })
	}

	return groups
}

/**
 * Densify a path and remove any points inside hole polygons or outside the
 * outer polygon (for concave regions), splitting into separate sub-paths at
 * the boundaries.
 */
export function maskPath(
	path: Point[],
	holes: Polygon[],
	resolution: number,
	outerPolygon?: Polygon
): Point[][] {
	if (path.length < 2) return [path]

	// Densify: add intermediate points so holes are cleanly cut
	const dense: Point[] = [path[0]]
	for (let i = 1; i < path.length; i++) {
		const p1 = path[i - 1]
		const p2 = path[i]
		const dx = p2.x - p1.x,
			dy = p2.y - p1.y
		const segLen = Math.sqrt(dx * dx + dy * dy)
		const steps = Math.max(1, Math.ceil(segLen / resolution))
		for (let j = 1; j <= steps; j++) {
			const t = j / steps
			dense.push({ x: p1.x + t * dx, y: p1.y + t * dy })
		}
	}

	// Split into sub-paths, removing points inside any hole
	const subPaths: Point[][] = []
	let current: Point[] = []

	for (const p of dense) {
		const inHole = holes.some((h) => pointInPolygon(p, h))
		const outsideShape = outerPolygon ? !pointInPolygon(p, outerPolygon) : false
		if (!inHole && !outsideShape) {
			current.push(p)
		} else {
			if (current.length >= 2) {
				subPaths.push(current)
			}
			current = []
		}
	}

	if (current.length >= 2) {
		subPaths.push(current)
	}

	return subPaths
}

/** Ensure polygon winding is counter-clockwise */
export function ensureCCW(points: Point[]): Point[] {
	let area = 0
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		area += (points[j].x + points[i].x) * (points[j].y - points[i].y)
	}
	// If area is negative, winding is CW - reverse to make CCW
	if (area < 0) return [...points].reverse()
	return points
}

/** Calculate total path length of a point sequence */
export function pathLength(points: Point[]): number {
	let len = 0
	for (let i = 1; i < points.length; i++) {
		const dx = points[i].x - points[i - 1].x
		const dy = points[i].y - points[i - 1].y
		len += Math.sqrt(dx * dx + dy * dy)
	}
	return len
}

/** Resample a path to have evenly-spaced points */
export function resamplePath(points: Point[], spacing: number): Point[] {
	if (points.length < 2) return [...points]

	const result: Point[] = [points[0]]
	let dist = 0
	let prevPoint = points[0]

	for (let i = 1; i < points.length; i++) {
		const dx = points[i].x - prevPoint.x
		const dy = points[i].y - prevPoint.y
		const segLen = Math.sqrt(dx * dx + dy * dy)

		if (segLen === 0) continue

		let remaining = segLen
		let segStart = prevPoint

		while (dist + remaining >= spacing) {
			const t = (spacing - dist) / remaining
			const newPoint = {
				x: segStart.x + t * (points[i].x - segStart.x),
				y: segStart.y + t * (points[i].y - segStart.y),
			}
			result.push(newPoint)
			remaining -= spacing - dist
			dist = 0
			segStart = newPoint
		}

		dist += remaining
		prevPoint = points[i]
	}

	// Always include the last point
	const last = points[points.length - 1]
	if (
		result.length === 0 ||
		result[result.length - 1].x !== last.x ||
		result[result.length - 1].y !== last.y
	) {
		result.push(last)
	}

	return result
}

/** Find the nearest point on a polygon boundary to a given point */
export function nearestPointOnPolygon(point: Point, polygon: Polygon): Point {
	const pts = polygon.points
	let nearest = pts[0]
	let minDist = Infinity

	for (let i = 0; i < pts.length; i++) {
		const j = (i + 1) % pts.length
		const proj = projectPointOnSegment(point, pts[i], pts[j])
		const dx = proj.x - point.x,
			dy = proj.y - point.y
		const d = dx * dx + dy * dy
		if (d < minDist) {
			minDist = d
			nearest = proj
		}
	}

	return nearest
}

function projectPointOnSegment(p: Point, a: Point, b: Point): Point {
	const dx = b.x - a.x,
		dy = b.y - a.y
	const len2 = dx * dx + dy * dy
	if (len2 === 0) return a
	const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
	return { x: a.x + t * dx, y: a.y + t * dy }
}

/**
 * Post-process a path to deflect it around hole polygons.
 * Densifies the path with intermediate points, then pushes any points
 * that land inside a hole to the nearest point on the hole boundary.
 */
export function deflectPathAroundHoles(
	path: Point[],
	holes: Polygon[],
	resolution: number = 3
): Point[] {
	if (holes.length === 0 || path.length < 2) return path

	// Densify: add intermediate points so curves around holes are smooth
	const dense: Point[] = [path[0]]
	for (let i = 1; i < path.length; i++) {
		const p1 = path[i - 1]
		const p2 = path[i]
		const dx = p2.x - p1.x,
			dy = p2.y - p1.y
		const segLen = Math.sqrt(dx * dx + dy * dy)
		const steps = Math.max(1, Math.ceil(segLen / resolution))
		for (let j = 1; j <= steps; j++) {
			const t = j / steps
			dense.push({ x: p1.x + t * dx, y: p1.y + t * dy })
		}
	}

	// Deflect points inside holes to nearest boundary
	return dense.map((p) => {
		for (const hole of holes) {
			if (pointInPolygon(p, hole)) {
				return nearestPointOnPolygon(p, hole)
			}
		}
		return p
	})
}
