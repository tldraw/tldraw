import { Box, Vec } from '@tldraw/editor'

/**
 * Recognizes a freehand gesture polygon as a known shape. New shape kinds are
 * added by appending a {@link ShapeRecognizer} to {@link SHAPE_RECOGNIZERS} — the
 * gesture code only ever calls {@link recognizeShape} and switches on the result
 * `kind`, so no shape-specific logic leaks into the tool.
 */

/** The smallest a recognized shape's oriented dimensions may be, in page units. */
const MIN_DIM = 20
/** Reject slivers above this width/height ratio (handled by the line classifier instead). */
const MAX_ASPECT = 20
/** Minimum gap (page units) below which the stroke's endpoints count as "closed". */
const MIN_CLOSE_DISTANCE = 8
/** Rectangles/ellipses tilted within this many radians of an axis snap to axis-aligned. */
const AXIS_ALIGN_SNAP_RADIANS = (7.5 * Math.PI) / 180
/** Below this longer/shorter side ratio, a shape snaps to equal sides (square/circle). */
const SQUARE_SNAP_RATIO = 1.2
/** A closed shape must fill at least this fraction of its box (rejects triangles ~0.5). */
const CLOSED_FILL_MIN = 0.6
/**
 * Mean corner occupancy below which a closed shape reads as a rectangle (its
 * stroke reaches into the box corners) rather than an ellipse (corners empty).
 * See {@link meanCornerOccupancy}. Rectangles sit around 0.3–0.7 and ellipses
 * around 0.8–1.1, so this threshold separates them even for small/noisy shapes.
 */
const CORNER_OCCUPANCY_MAX = 0.74
/** The chosen outline's mean residual must be within this fraction of the short side. */
const SHAPE_FIT_MAX_RATIO = 0.25
/** A stroke is a line if no point strays more than this fraction of its length from the chord. */
const LINE_STRAIGHTNESS_RATIO = 0.1
/** End stretch over which a line's entry/exit direction is checked, as a fraction of its length. */
const LINE_END_SPAN_RATIO = 0.15
/** Clamp (page units) for that end stretch, so hooks are caught on both short and long lines. */
const LINE_END_SPAN_MIN = 6
const LINE_END_SPAN_MAX = 16
/** Max angle (radians) a line's entry/exit direction may turn from its body — rejects end hooks. */
const LINE_END_MAX_ANGLE = (35 * Math.PI) / 180

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

/** Recognized shapes backed by an oriented box (spawned as geo shapes). */
export type RecognizedBoxShape = RecognizedRectangle | RecognizedEllipse

/** A recognized straight line, kept at the sketch's exact endpoints (no fitting). */
export interface RecognizedLine {
	kind: 'line'
	/** Page-space start point — the freehand stroke's first point. */
	start: Vec
	/** Page-space end point — the freehand stroke's last point. */
	end: Vec
}

/** The result of recognizing a gesture as a shape. New kinds are unioned in here. */
export type ShapeRecognitionResult = RecognizedBoxShape | RecognizedLine

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
 * The page-space top-left origin for a box shape's geo shape. A geo shape rotates
 * around its (x, y) origin, so we offset the center back by the rotated
 * half-extents. Works for any oriented box (rectangle, ellipse, …).
 */
export function recognizedShapeTopLeft(r: RecognizedBoxShape): Vec {
	return Vec.Sub(r.center, Vec.Rot(new Vec(r.w / 2, r.h / 2), r.rotation))
}

/**
 * Snaps a near-square oriented box to equal sides. When the longer side is less
 * than {@link SQUARE_SNAP_RATIO}× the shorter, both sides become their average —
 * the closest equal-sided fit to the sketch, keeping the same center. Otherwise
 * the sides are returned unchanged.
 */
function snapNearSquare(w: number, h: number): { w: number; h: number } {
	const longer = Math.max(w, h)
	const shorter = Math.min(w, h)
	if (shorter > 0 && longer / shorter < SQUARE_SNAP_RATIO) {
		const side = (w + h) / 2
		return { w: side, h: side }
	}
	return { w, h }
}

/** A recognized closed shape's oriented box plus which outline its points follow. */
interface ClosedShapeFit extends OrientedBox {
	kind: 'rectangle' | 'ellipse'
}

/**
 * Fits a closed gesture to an oriented box and decides whether its points follow
 * a rectangle outline or an ellipse outline.
 *
 * The two are told apart by corner occupancy (see {@link meanCornerOccupancy}):
 * a rectangle's stroke reaches into the box corners, an ellipse's leaves them
 * empty. This is far more robust than comparing how closely the points hug each
 * outline overall — for small or noisy near-square shapes the points sit about
 * equally close to both, so that comparison flips a circle to a rectangle, while
 * the corners stay decisive at any size or aspect.
 */
function fitClosedShape(input: RecognizerInput): ClosedShapeFit | null {
	if (!input.isClosed) return null

	const hull = convexHull(input.points)
	if (hull.length < 3) return null

	// The oriented (minimum-area) bounding box; everything below is in its frame.
	const { center, w, h, rotation } = minAreaRect(hull)
	if (w < MIN_DIM || h < MIN_DIM) return null
	if (Math.max(w, h) / Math.min(w, h) > MAX_ASPECT) return null

	// Coarse area gate: rejects triangles (~0.5) and sparse scribbles.
	if (input.area / (w * h) < CLOSED_FILL_MIN) return null

	const localPts = input.points.map((p) => toBoxLocal(p, center, rotation))

	// Filled corners → rectangle; empty corners → ellipse.
	const kind = meanCornerOccupancy(localPts, w, h) <= CORNER_OCCUPANCY_MAX ? 'rectangle' : 'ellipse'

	// The chosen outline must actually fit (rejects blobs that are neither).
	const dist = kind === 'rectangle' ? distToRectOutline : distToEllipseOutline
	const residual = meanOutlineDist(localPts, w, h, dist)
	if (residual > SHAPE_FIT_MAX_RATIO * Math.min(w, h)) return null

	return { kind, center, w, h, rotation }
}

/**
 * Mean "corner occupancy" of a closed stroke (points already in box-local space):
 * for each of the four box corners, the nearest stroke point's distance divided by
 * the gap an inscribed ellipse would leave at that corner. Near 0 when the stroke
 * fills the corners (a rectangle); near 1 when they're empty like the ellipse. The
 * per-corner normalization makes it scale-, aspect-, and noise-independent, so it
 * separates rectangles from ellipses even when both hug the outlines about equally.
 */
function meanCornerOccupancy(localPts: Vec[], w: number, h: number): number {
	if (localPts.length === 0) return 0
	const corners = [
		new Vec(w / 2, h / 2),
		new Vec(-w / 2, h / 2),
		new Vec(-w / 2, -h / 2),
		new Vec(w / 2, -h / 2),
	]
	let sum = 0
	for (const corner of corners) {
		let nearest = Infinity
		for (const lp of localPts) {
			const d = Vec.Dist(lp, corner)
			if (d < nearest) nearest = d
		}
		const ellipseGap = distToEllipseOutline(corner, w, h)
		sum += ellipseGap > 0 ? nearest / ellipseGap : 0
	}
	return sum / corners.length
}

/** Snaps a recognized box's rotation (near-axis → upright) and sides (near-square → equal). */
function finishBoxShape<K extends 'rectangle' | 'ellipse'>(
	fit: ClosedShapeFit,
	kind: K
): Extract<ShapeRecognitionResult, { kind: K }> {
	const rotation = Math.abs(fit.rotation) <= AXIS_ALIGN_SNAP_RADIANS ? 0 : fit.rotation
	const sides = snapNearSquare(fit.w, fit.h)
	return { kind, center: fit.center, w: sides.w, h: sides.h, rotation } as Extract<
		ShapeRecognitionResult,
		{ kind: K }
	>
}

const recognizeRectangle: ShapeRecognizer = {
	kind: 'rectangle',
	recognize(input) {
		const fit = fitClosedShape(input)
		return fit && fit.kind === 'rectangle' ? finishBoxShape(fit, 'rectangle') : null
	},
}

const recognizeEllipse: ShapeRecognizer = {
	kind: 'ellipse',
	recognize(input) {
		const fit = fitClosedShape(input)
		return fit && fit.kind === 'ellipse' ? finishBoxShape(fit, 'ellipse') : null
	},
}

const recognizeLine: ShapeRecognizer = {
	kind: 'line',
	recognize(input) {
		// A line is an open stroke; a closed loop is a rectangle/ellipse/lasso.
		if (input.isClosed) return null

		const start = input.points[0]
		const end = input.points[input.points.length - 1]
		const length = Vec.Dist(start, end)
		if (length < MIN_DIM) return null

		// Global straightness: no point strays far from the chord (catches bows/curves).
		let maxDeviation = 0
		for (const p of input.points) {
			const deviation = distanceToLine(p, start, end)
			if (deviation > maxDeviation) maxDeviation = deviation
		}
		if (maxDeviation / length > LINE_STRAIGHTNESS_RATIO) return null

		// End straightness: the stroke must run straight into each endpoint, so a
		// sharp hook or flick disqualifies it. The global test barely notices a short
		// hook (it changes the length-normalized average very little), so check angles.
		if (!endpointsRunStraight(input.points, length)) return null

		// Keep the exact freehand endpoints — no "closest match" fitting.
		return { kind: 'line', start: start.clone(), end: end.clone() }
	},
}

/** Ordered list of classifiers; first non-null result wins. */
export const SHAPE_RECOGNIZERS: ShapeRecognizer[] = [
	recognizeRectangle,
	recognizeEllipse,
	recognizeLine,
]

/** Perpendicular distance from point p to the infinite line through a and b. */
function distanceToLine(p: Vec, a: Vec, b: Vec): number {
	const ab = Vec.Sub(b, a)
	const lengthAb = ab.len()
	if (lengthAb === 0) return Vec.Dist(p, a)
	const ap = Vec.Sub(p, a)
	// |cross(ab, ap)| / |ab| is the height of the triangle on base ab.
	return Math.abs(ab.x * ap.y - ab.y * ap.x) / lengthAb
}

/** Unsigned angle between two vectors, in radians [0, π]. Scale-invariant. */
function angleBetween(a: Vec, b: Vec): number {
	const dot = a.x * b.x + a.y * b.y
	const cross = a.x * b.y - a.y * b.x
	return Math.abs(Math.atan2(cross, dot))
}

/** A direction change sharper than this (radians, ~110°) counts as a scribble reversal. */
const SCRIBBLE_REVERSAL_ANGLE = (110 * Math.PI) / 180

/**
 * Counts sharp direction reversals (U-turns) along a stroke — the signature of a
 * back-and-forth scribble. Points are resampled to `minSegmentLength` apart first
 * so per-point jitter doesn't register as reversals; a 90° corner (e.g. a
 * rectangle lasso) stays under the threshold, while a scribble's U-turns clear it.
 */
export function countStrokeReversals(points: Vec[], minSegmentLength: number): number {
	if (points.length < 3) return 0

	const sampled: Vec[] = [points[0]]
	for (const p of points) {
		if (Vec.Dist(p, sampled[sampled.length - 1]) >= minSegmentLength) sampled.push(p)
	}
	if (sampled.length < 3) return 0

	let reversals = 0
	for (let i = 1; i < sampled.length - 1; i++) {
		const into = Vec.Sub(sampled[i], sampled[i - 1])
		const outOf = Vec.Sub(sampled[i + 1], sampled[i])
		if (angleBetween(into, outOf) >= SCRIBBLE_REVERSAL_ANGLE) reversals++
	}
	return reversals
}

/**
 * Whether the stroke runs straight into each endpoint. We trim a short stretch
 * off both ends; the trimmed middle gives the "body" direction, and each end's
 * direction must align with it. A sharp hook or flick turns an end away from the
 * body and fails this — even when it's too short to move the overall deviation.
 *
 * The body (not the endpoint chord) is the reference on purpose: a hook tilts the
 * chord toward itself, which would otherwise hide it.
 */
function endpointsRunStraight(points: Vec[], chordLength: number): boolean {
	const pStart = points[0]
	const pEnd = points[points.length - 1]
	const span = Math.min(
		LINE_END_SPAN_MAX,
		Math.max(LINE_END_SPAN_MIN, chordLength * LINE_END_SPAN_RATIO)
	)

	// First point at least `span` from the start, and (scanning back) from the end.
	let innerStart: Vec | undefined
	for (let i = 1; i < points.length; i++) {
		if (Vec.Dist(points[i], pStart) >= span) {
			innerStart = points[i]
			break
		}
	}
	let innerEnd: Vec | undefined
	for (let i = points.length - 2; i >= 0; i--) {
		if (Vec.Dist(points[i], pEnd) >= span) {
			innerEnd = points[i]
			break
		}
	}
	if (!innerStart || !innerEnd) return true // too short to judge the ends

	const bodyDir = Vec.Sub(innerEnd, innerStart)
	if (bodyDir.len() < 1) return true // ends overlap; no meaningful body

	const startDir = Vec.Sub(innerStart, pStart)
	const endDir = Vec.Sub(pEnd, innerEnd)
	return (
		angleBetween(startDir, bodyDir) <= LINE_END_MAX_ANGLE &&
		angleBetween(endDir, bodyDir) <= LINE_END_MAX_ANGLE
	)
}

/** A point transformed into an oriented box's local frame (centered, axis-aligned). */
function toBoxLocal(p: Vec, center: Vec, rotation: number): Vec {
	return Vec.Rot(Vec.Sub(p, center), -rotation)
}

/** Distance from a box-local point to the rectangle outline of size w×h. */
function distToRectOutline(local: Vec, w: number, h: number): number {
	const ax = w / 2
	const ay = h / 2
	const insideX = ax - Math.abs(local.x)
	const insideY = ay - Math.abs(local.y)
	if (insideX >= 0 && insideY >= 0) return Math.min(insideX, insideY) // inside: nearest edge
	// outside: distance to the clamped point on the border
	return Math.hypot(Math.max(-insideX, 0), Math.max(-insideY, 0))
}

/** Bisection root finder for {@link distToEllipseOutline} (Eberly's method). */
function ellipseRoot(r0: number, z0: number, z1: number, g: number): number {
	const n0 = r0 * z0
	let s0 = z1 - 1
	let s1 = g < 0 ? 0 : Math.hypot(n0, z1) - 1
	let s = 0
	for (let i = 0; i < 60; i++) {
		s = (s0 + s1) / 2
		if (s === s0 || s === s1) break
		const ratio0 = n0 / (s + r0)
		const ratio1 = z1 / (s + 1)
		const gg = ratio0 * ratio0 + ratio1 * ratio1 - 1
		if (gg > 0) s0 = s
		else if (gg < 0) s1 = s
		else break
	}
	return s
}

/**
 * Accurate perpendicular distance from a box-local point to the inscribed ellipse
 * outline (Eberly, "Distance from a Point to an Ellipse"). Stays accurate at any
 * eccentricity — unlike the gradient or radial estimates — so the rectangle vs
 * ellipse residual comparison is fair for thin shapes.
 */
function distToEllipseOutline(local: Vec, w: number, h: number): number {
	let e0 = w / 2
	let e1 = h / 2
	let y0 = Math.abs(local.x)
	let y1 = Math.abs(local.y)
	// The algorithm assumes the first semi-axis is the larger one.
	if (e0 < e1) {
		;[e0, e1] = [e1, e0]
		;[y0, y1] = [y1, y0]
	}
	if (e1 <= 0) return Math.abs(y1) // degenerate: a segment
	if (y1 > 0) {
		if (y0 > 0) {
			const z0 = y0 / e0
			const z1 = y1 / e1
			const g = z0 * z0 + z1 * z1 - 1
			if (g === 0) return 0
			const r0 = (e0 / e1) ** 2
			const sbar = ellipseRoot(r0, z0, z1, g)
			const x0 = (r0 * y0) / (sbar + r0)
			const x1 = y1 / (sbar + 1)
			return Math.hypot(x0 - y0, x1 - y1)
		}
		return Math.abs(y1 - e1)
	}
	const numer0 = e0 * y0
	const denom0 = e0 * e0 - e1 * e1
	if (numer0 < denom0) {
		const xde0 = numer0 / denom0
		const x0 = e0 * xde0
		const x1 = e1 * Math.sqrt(Math.max(0, 1 - xde0 * xde0))
		return Math.hypot(x0 - y0, x1)
	}
	return Math.abs(y0 - e0)
}

/** Mean distance of box-local points to an outline (rectangle or ellipse), in page units. */
function meanOutlineDist(
	localPts: Vec[],
	w: number,
	h: number,
	dist: (local: Vec, w: number, h: number) => number
): number {
	if (localPts.length === 0) return 0
	let sum = 0
	for (const lp of localPts) sum += dist(lp, w, h)
	return sum / localPts.length
}

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
