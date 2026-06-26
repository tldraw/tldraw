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
/** Rectangles/ellipses tilted within this many radians of an axis snap to axis-aligned. */
const AXIS_ALIGN_SNAP_RADIANS = (7.5 * Math.PI) / 180
/** An ellipse fills ~π/4 (≈0.785) of its oriented box; accept within this band. */
const ELLIPSE_FILL_MIN = 0.6
const ELLIPSE_FILL_MAX = 0.92
/** A boundary point's normalized radius (1 = exactly on the outline) may stray this far. */
const ELLIPSE_RADIUS_TOLERANCE = 0.2
/** Fraction of stroke points that must sit near the inscribed ellipse's boundary. */
const ELLIPSE_BOUNDARY_FRACTION = 0.75
/** Normalized radius above which a point counts as a "spike" (a rectangle corner reaches √2). */
const ELLIPSE_SPIKE_RADIUS = 1.2
/** Reject as an ellipse if more than this fraction of points poke well outside the outline. */
const ELLIPSE_MAX_SPIKE_FRACTION = 0.1

/** The normalized input handed to every recognizer. Points are in page space. */
export interface RecognizerInput {
	points: Vec[]
	/** Absolute area of the (assumed simple) polygon, via the shoelace formula. */
	area: number
	/** Whether the stroke loops back close to where it started. */
	isClosed: boolean
}

/** An oriented box (center, dimensions, tilt) — the geometry shared by recognized shapes. */
interface OrientedBox {
	/** Page-space center of the oriented box. */
	center: Vec
	w: number
	h: number
	/** Rotation in radians, normalized to (-π/4, π/4]. */
	rotation: number
}

/** A recognized rectangle. */
export interface RecognizedRectangle extends OrientedBox {
	kind: 'rectangle'
}

/** A recognized ellipse (also covers circles, where w ≈ h). */
export interface RecognizedEllipse extends OrientedBox {
	kind: 'ellipse'
}

/** The result of recognizing a gesture as a shape. New kinds are unioned in here. */
export type ShapeRecognitionResult = RecognizedRectangle | RecognizedEllipse

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
 * The page-space top-left origin for a recognized shape's geo shape. A geo shape
 * rotates around its (x, y) origin, so we offset the center back by the rotated
 * half-extents. Works for any oriented box (rectangle, ellipse, …).
 */
export function recognizedShapeTopLeft(r: ShapeRecognitionResult): Vec {
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

		// A nearly upright rectangle is almost always meant to be axis-aligned, so
		// snap small tilts to exactly 0 rather than spawning a subtly crooked shape.
		const snappedRotation = Math.abs(rotation) <= AXIS_ALIGN_SNAP_RADIANS ? 0 : rotation
		return { kind: 'rectangle', center, w, h, rotation: snappedRotation }
	},
}

const recognizeEllipse: ShapeRecognizer = {
	kind: 'ellipse',
	recognize(input) {
		// An ellipse is a closed figure.
		if (!input.isClosed) return null

		const hull = convexHull(input.points)
		if (hull.length < 3) return null

		// The oriented box gives the ellipse's axes and tilt; the fill test is then
		// rotation-invariant, so tilted ellipses are recognized too.
		const { center, w, h, rotation } = minAreaRect(hull)

		if (w < MIN_DIM || h < MIN_DIM) return null
		if (Math.max(w, h) / Math.min(w, h) > MAX_ASPECT) return null

		// An inscribed ellipse fills ~π/4 of its box — distinctly less than a
		// rectangle (~1.0) and more than a triangle (~0.5).
		const fill = input.area / (w * h)
		if (fill < ELLIPSE_FILL_MIN || fill > ELLIPSE_FILL_MAX) return null

		// The points must hug the inscribed ellipse's outline rather than poke out
		// at corners — that's what separates a round shape from a rectangle.
		if (!pointsHugEllipse(input.points, center, w, h, rotation)) return null

		// Match the rectangle's behavior: snap a near-upright ellipse to upright.
		const snappedRotation = Math.abs(rotation) <= AXIS_ALIGN_SNAP_RADIANS ? 0 : rotation
		return { kind: 'ellipse', center, w, h, rotation: snappedRotation }
	},
}

/** Ordered list of classifiers; first non-null result wins. */
export const SHAPE_RECOGNIZERS: ShapeRecognizer[] = [recognizeRectangle, recognizeEllipse]

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

/**
 * Whether the stroke points lie along the inscribed ellipse's outline: most
 * points within a tolerance band of normalized radius 1, and few poking well
 * outside it. A rectangle's corners reach a normalized radius of √2, so its
 * corner points read as "spikes" and the shape is rejected.
 */
function pointsHugEllipse(
	points: Vec[],
	center: Vec,
	w: number,
	h: number,
	rotation: number
): boolean {
	const rx = w / 2
	const ry = h / 2
	if (rx <= 0 || ry <= 0) return false

	let nearBoundary = 0
	let spikes = 0
	for (const p of points) {
		// Normalized radius in the ellipse's local frame: exactly 1 on the outline.
		const local = Vec.Rot(Vec.Sub(p, center), -rotation)
		const nr = Math.hypot(local.x / rx, local.y / ry)
		if (Math.abs(nr - 1) <= ELLIPSE_RADIUS_TOLERANCE) nearBoundary++
		if (nr > ELLIPSE_SPIKE_RADIUS) spikes++
	}

	const n = points.length
	return nearBoundary / n >= ELLIPSE_BOUNDARY_FRACTION && spikes / n <= ELLIPSE_MAX_SPIKE_FRACTION
}
