import { Box, Vec } from '@tldraw/editor'

/**
 * Recognizes a freehand gesture polygon as a known shape. New shape kinds are
 * added by appending a {@link ShapeRecognizer} to {@link SHAPE_RECOGNIZERS} — the
 * gesture code only ever calls {@link recognizeShape} and switches on the result
 * `kind`, so no shape-specific logic leaks into the tool.
 */

/** The smallest a recognized shape's oriented dimensions may be, in page units. */
const MIN_DIM = 20
/** Reject slivers above this width/height ratio (a future "line" classifier's job). */
const MAX_ASPECT = 20
/** A stroke fills at least this fraction of its oriented bounding box to be a rectangle. */
const RECT_FILL_MIN = 0.85
/** Minimum gap (page units) below which the stroke's endpoints count as "closed". */
const MIN_CLOSE_DISTANCE = 8
/** A recognized corner must have a stroke point within this fraction of the short side. */
const CORNER_TOLERANCE_RATIO = 0.3

/** The normalized input handed to every recognizer. Points are in page space. */
export interface RecognizerInput {
	points: Vec[]
	/** Absolute area of the (assumed simple) polygon, via the shoelace formula. */
	area: number
	/** Whether the stroke loops back close to where it started. */
	isClosed: boolean
}

/** The result of recognizing a gesture as a shape. */
export interface ShapeRecognitionResult {
	kind: 'rectangle'
	/** Page-space center of the oriented rectangle. */
	center: Vec
	w: number
	h: number
	/** Rotation in radians, normalized to (-π/4, π/4]. */
	rotation: number
}
// Future kinds would be additional interface members unioned in here.

/** A single shape classifier. */
export interface ShapeRecognizer {
	kind: ShapeRecognitionResult['kind']
	recognize(input: RecognizerInput): ShapeRecognitionResult | null
}

/**
 * Builds the shared recognizer input from a page-space gesture polygon, or
 * returns null if the gesture is too small/short to be a deliberate shape.
 */
export function buildRecognizerInput(points: Vec[]): RecognizerInput | null {
	if (points.length < 8) return null

	const box = Box.FromPoints(points)
	if (box.width < MIN_DIM && box.height < MIN_DIM) return null

	const area = polygonArea(points)
	const closeThreshold = Math.max(MIN_CLOSE_DISTANCE, 0.15 * (box.width + box.height))
	const isClosed = Vec.Dist(points[0], points[points.length - 1]) < closeThreshold

	return { points, area, isClosed }
}

/** Runs the registered recognizers in order; the first match wins. */
export function recognizeShape(input: RecognizerInput): ShapeRecognitionResult | null {
	for (const recognizer of SHAPE_RECOGNIZERS) {
		const result = recognizer.recognize(input)
		if (result) return result
	}
	return null
}

/**
 * The page-space top-left origin for the geo shape of a recognized rectangle. A
 * geo shape rotates around its (x, y) origin, so we offset the center back by the
 * rotated half-extents.
 */
export function rectangleTopLeft(r: Extract<ShapeRecognitionResult, { kind: 'rectangle' }>): Vec {
	return Vec.Sub(r.center, Vec.Rot(new Vec(r.w / 2, r.h / 2), r.rotation))
}

const recognizeRectangle: ShapeRecognizer = {
	kind: 'rectangle',
	recognize(input) {
		// A rectangle is a closed figure.
		if (!input.isClosed) return null

		const hull = convexHull(input.points)
		if (hull.length < 3) return null

		// The oriented (minimum-area) bounding rectangle makes the fill test
		// rotation-invariant, so tilted rectangles are recognized too.
		const { center, w, h, rotation } = minAreaRect(hull)

		// Reject tiny shapes and extreme slivers (the latter are better classified
		// as lines once that recognizer exists).
		if (w < MIN_DIM || h < MIN_DIM) return null
		if (Math.max(w, h) / Math.min(w, h) > MAX_ASPECT) return null

		// A rectangle fills its oriented bounding box (~1.0); an ellipse fills
		// ~0.785 and a triangle ~0.5, so this cleanly separates them.
		const fill = input.area / (w * h)
		if (fill < RECT_FILL_MIN) return null

		// Each oriented corner should have a stroke point nearby — rejects rounded
		// blobs that happen to fill their box.
		if (!hasPointNearEachCorner(input.points, center, w, h, rotation)) return null

		return { kind: 'rectangle', center, w, h, rotation }
	},
}

/** Ordered list of classifiers; first non-null result wins. */
export const SHAPE_RECOGNIZERS: ShapeRecognizer[] = [recognizeRectangle]

/** Absolute area of a polygon via the shoelace formula. */
function polygonArea(points: Vec[]): number {
	let sum = 0
	for (let i = 0, n = points.length; i < n; i++) {
		const a = points[i]
		const b = points[(i + 1) % n]
		sum += a.x * b.y - b.x * a.y
	}
	return Math.abs(sum) / 2
}

/** Andrew's monotone-chain convex hull. Returns hull vertices in CCW order. */
function convexHull(points: Vec[]): Vec[] {
	const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y)
	if (pts.length <= 2) return pts

	const cross = (o: Vec, a: Vec, b: Vec) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

	const lower: Vec[] = []
	for (const p of pts) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
			lower.pop()
		}
		lower.push(p)
	}

	const upper: Vec[] = []
	for (let i = pts.length - 1; i >= 0; i--) {
		const p = pts[i]
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
			upper.pop()
		}
		upper.push(p)
	}

	lower.pop()
	upper.pop()
	return lower.concat(upper)
}

/**
 * Minimum-area bounding rectangle of a convex hull (rotating calipers): the
 * optimal rectangle always has a side collinear with a hull edge, so we test
 * each edge's orientation and keep the smallest box. Returns the rectangle's
 * page-space center, dimensions, and rotation normalized to (-π/4, π/4].
 */
function minAreaRect(hull: Vec[]): { center: Vec; w: number; h: number; rotation: number } {
	let best: { area: number; w: number; h: number; angle: number; center: Vec } | null = null

	for (let i = 0; i < hull.length; i++) {
		const a = hull[i]
		const b = hull[(i + 1) % hull.length]
		const angle = Math.atan2(b.y - a.y, b.x - a.x)

		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity
		for (const p of hull) {
			const q = Vec.Rot(p, -angle)
			if (q.x < minX) minX = q.x
			if (q.x > maxX) maxX = q.x
			if (q.y < minY) minY = q.y
			if (q.y > maxY) maxY = q.y
		}

		const w = maxX - minX
		const h = maxY - minY
		const area = w * h
		if (!best || area < best.area) {
			const centerInFrame = new Vec((minX + maxX) / 2, (minY + maxY) / 2)
			best = { area, w, h, angle, center: Vec.Rot(centerInFrame, angle) }
		}
	}

	// Normalize to the smallest tilt, swapping dimensions when we rotate by 90°.
	let { angle: rotation, w, h } = best!
	while (rotation > Math.PI / 4) {
		rotation -= Math.PI / 2
		;[w, h] = [h, w]
	}
	while (rotation <= -Math.PI / 4) {
		rotation += Math.PI / 2
		;[w, h] = [h, w]
	}

	return { center: best!.center, w, h, rotation }
}

/** Whether the stroke has a point near each of the oriented rectangle's corners. */
function hasPointNearEachCorner(
	points: Vec[],
	center: Vec,
	w: number,
	h: number,
	rotation: number
): boolean {
	const tolerance = CORNER_TOLERANCE_RATIO * Math.min(w, h)
	const halfExtents = [
		new Vec(-w / 2, -h / 2),
		new Vec(w / 2, -h / 2),
		new Vec(w / 2, h / 2),
		new Vec(-w / 2, h / 2),
	]

	for (const half of halfExtents) {
		const corner = Vec.Add(center, Vec.Rot(half, rotation))
		let nearest = Infinity
		for (const p of points) {
			const d = Vec.Dist(p, corner)
			if (d < nearest) nearest = d
		}
		if (nearest > tolerance) return false
	}

	return true
}
