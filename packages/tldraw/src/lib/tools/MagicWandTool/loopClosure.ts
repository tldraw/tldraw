import { Box, Vec, intersectLineSegmentLineSegment } from '@tldraw/editor'
import { polygonArea } from './shapeRecognition'

/**
 * Closed-loop detection for magic wand gestures.
 *
 * A strict endpoint-to-start distance check misses how people actually sketch a
 * quick loop: they either overshoot (the tail crosses the earlier stroke and
 * keeps going) or undershoot (they release with a gap). Both read as obvious
 * loops. Detection therefore uses two rules, tried in order:
 *
 * - Rule A (crossing): the stroke crosses itself. The enclosed loop between the
 *   crossing points is extracted; lead-in and overshoot tails are trimmed away.
 *   Drawing on far past the loop un-closes it again (live "no longer a lasso"
 *   feedback) — and also vetoes Rule B, since a completed-then-departed loop
 *   means the user is drawing, not lassoing.
 * - Rule B (proximity): the endpoint lands near an earlier part of the stroke.
 *   The gap tolerance scales with the candidate loop's size, and the drawn part
 *   must turn most of a full revolution so open arcs (U/C shapes) stay open.
 *
 * All functions are pure; tolerances are screen-space px divided by the zoom.
 */

/** Resample step between points, screen px. */
const LOOP_RESAMPLE_DISTANCE = 5
/** Cap on resampled points: very long strokes coarsen instead of growing the scan. */
const LOOP_MAX_SAMPLES = 768
/** Minimum resampled points a candidate loop needs (rejects hairpin slivers). */
const LOOP_MIN_POINTS = 8
/** Minimum candidate-loop bounding-box short side, screen px (rejects slivers). */
const LOOP_MIN_DIMENSION = 12
/** Rule B gap floor, screen px (matches the old strict endpoint threshold). */
const GAP_MIN = 16
/** Rule B: gap allowance as a fraction of the candidate loop's (width + height). */
const GAP_RATIO = 0.3
/** Rule B gap cap, screen px; also the endpoint-proximity prefilter radius. The
 * scale-free {@link GAP_RATIO} does the real rejecting — this only bounds it. */
const GAP_MAX = 320
/** Rule B: the drawn part of the loop must turn at least this much. A U-shape
 * turns 180°, a rectangle drawn 3.5 sides around turns 270°. */
const WINDING_MIN = (245 / 180) * Math.PI
/** Rule B: how many resample steps back to compare when checking that the pen
 * was moving toward the closure point at release. */
const APPROACH_LOOKBACK = 3
/**
 * Rule A: how far the stroke's endpoint may sit from the loop, as a fraction of
 * the loop perimeter. Euclidean distance rather than tail arc length, so
 * circling twice for emphasis (endpoint still on the ring) stays closed while
 * drawing away past a loop un-closes it — even when the exit run grazes the
 * loop and mints new crossings along the way.
 */
const TAIL_DISTANCE_RATIO = 0.2
/** Rule A endpoint-distance allowance clamp, screen px. */
const TAIL_DISTANCE_MIN = 64
const TAIL_DISTANCE_MAX = 320
/** Stop collecting crossings past this many (pathological zigzag inputs). */
const MAX_CROSSINGS = 64

/** A detected closed loop within a gesture stroke. */
export interface DetectedLoop {
	/**
	 * The loop's polygon in the input's (page) space, with lead-in and overshoot
	 * tails removed. Explicitly closed: the last point equals the first.
	 */
	polygon: Vec[]
	/** Which rule closed it: the stroke crossing itself, or the endpoint landing
	 * near an earlier segment. */
	closure: 'crossing' | 'proximity'
}

/**
 * Resamples a polyline to uniform `step` spacing by interpolating along its arc
 * length (fast flicks leave large gaps between raw points, so subsampling isn't
 * enough). Keeps the exact first and last points.
 */
export function resamplePoints(points: Vec[], step: number): Vec[] {
	if (points.length === 0) return []
	const out: Vec[] = [points[0].clone()]
	let untilNext = step // arc length remaining until the next sample
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1]
		const b = points[i]
		const segLength = Vec.Dist(a, b)
		if (segLength === 0) continue
		let d = untilNext
		while (d <= segLength) {
			out.push(Vec.Lrp(a, b, d / segLength))
			d += step
		}
		untilNext = d - segLength
	}
	const last = points[points.length - 1]
	if (Vec.Dist(out[out.length - 1], last) > 1e-9) out.push(last.clone())
	return out
}

/**
 * Detects whether a gesture stroke forms a closed loop, returning the loop's
 * polygon (tails trimmed, explicitly closed) or null if the stroke reads as
 * open. `zoom` converts the screen-px tolerances to the input's page units.
 */
export function detectClosedLoop(points: Vec[], zoom: number): DetectedLoop | null {
	if (points.length < 2) return null

	let totalLength = 0
	for (let i = 1; i < points.length; i++) totalLength += Vec.Dist(points[i - 1], points[i])
	const step = Math.max(LOOP_RESAMPLE_DISTANCE / zoom, totalLength / LOOP_MAX_SAMPLES)
	const pts = resamplePoints(points, step)
	if (pts.length < LOOP_MIN_POINTS) return null

	const minDimension = LOOP_MIN_DIMENSION / zoom

	const crossing = findCrossingLoop(pts, zoom, minDimension)
	if (crossing === 'departed') {
		// The stroke completed a loop and then drew far away from it. That reads
		// as "drawing, not lassoing" — don't let Rule B re-close the exit path
		// into a bigger sloppy loop.
		return null
	}
	if (crossing) return { polygon: crossing, closure: 'crossing' }

	const proximity = findProximityLoop(pts, zoom, minDimension, step)
	if (proximity) return { polygon: proximity, closure: 'proximity' }

	return null
}

/** Signed double-area contribution of the edge a→b (shoelace term). */
function cross(a: Vec, b: Vec): number {
	return a.x * b.y - b.x * a.y
}

/**
 * Rule A: find the best self-intersection loop. Scans all non-adjacent segment
 * pairs (bounding-box prefiltered); each crossing X yields the candidate loop
 * `[X, pts[i+1..j], X]`. Candidates must be big enough not to be slivers, and
 * the stroke's endpoint must still be near the loop (the tail rule — a loop the
 * user has drawn away from no longer reads as a lasso). Returns the
 * largest-area survivor, so figure-eights pick their bigger lobe.
 *
 * Returns `'departed'` when the stroke contains a genuine (non-sliver) loop
 * whose only failure is the tail rule: the user completed a loop and then drew
 * away from it, which the caller treats as "drawing, not lassoing".
 */
function findCrossingLoop(
	pts: Vec[],
	zoom: number,
	minDimension: number
): Vec[] | 'departed' | null {
	const segCount = pts.length - 1
	const end = pts[pts.length - 1]

	// Flat per-segment bounds for the pair prefilter.
	const minX = new Float64Array(segCount)
	const minY = new Float64Array(segCount)
	const maxX = new Float64Array(segCount)
	const maxY = new Float64Array(segCount)
	for (let i = 0; i < segCount; i++) {
		const a = pts[i]
		const b = pts[i + 1]
		minX[i] = Math.min(a.x, b.x)
		minY[i] = Math.min(a.y, b.y)
		maxX[i] = Math.max(a.x, b.x)
		maxY[i] = Math.max(a.y, b.y)
	}

	// Cumulative arc length (arcLen[i] = stroke length from pts[0] to pts[i]) and
	// shoelace prefix (areaPrefix[i] = Σ cross(pts[k], pts[k+1]) for k < i) make
	// each candidate's perimeter and area O(1).
	const arcLength = new Float64Array(pts.length)
	const areaPrefix = new Float64Array(pts.length)
	for (let i = 1; i < pts.length; i++) {
		arcLength[i] = arcLength[i - 1] + Vec.Dist(pts[i - 1], pts[i])
		areaPrefix[i] = areaPrefix[i - 1] + cross(pts[i - 1], pts[i])
	}

	let best: { i: number; j: number; x: Vec; area: number } | null = null
	let departed = false
	let crossings = 0

	outer: for (let i = 0; i < segCount - 2; i++) {
		for (let j = i + 2; j < segCount; j++) {
			if (minX[i] > maxX[j] || maxX[i] < minX[j] || minY[i] > maxY[j] || maxY[i] < minY[j]) {
				continue
			}
			const x = intersectLineSegmentLineSegment(pts[i], pts[i + 1], pts[j], pts[j + 1])
			if (!x) continue
			if (++crossings > MAX_CROSSINGS) break outer

			// Candidate loop = [x, pts[i+1..j], x]. Area first (O(1)): only gate
			// candidates that would beat the current best. (Pruning can't hide a
			// departure signal — it only skips once a passing loop exists, and then
			// the loop is returned and the signal is moot.)
			const doubleArea = areaPrefix[j] - areaPrefix[i + 1] + cross(pts[j], x) + cross(x, pts[i + 1])
			const area = Math.abs(doubleArea) / 2
			if (best && area <= best.area) continue

			// Sliver gates first, so slivers never count as a departed loop.
			if (j - i < LOOP_MIN_POINTS) continue
			const bounds = Box.FromPoints(pts.slice(i + 1, j + 1))
			if (Math.min(bounds.w, bounds.h) < minDimension) continue

			// Tail rule: the stroke's endpoint must still be near the loop.
			const perimeter =
				arcLength[j] - arcLength[i + 1] + Vec.Dist(x, pts[i + 1]) + Vec.Dist(pts[j], x)
			const tailAllowance = Math.min(
				Math.max(TAIL_DISTANCE_RATIO * perimeter, TAIL_DISTANCE_MIN / zoom),
				TAIL_DISTANCE_MAX / zoom
			)
			if (distanceToPoints(end, pts, i + 1, j) > tailAllowance) {
				departed = true
				continue
			}

			best = { i, j, x, area }
		}
	}

	if (!best) return departed ? 'departed' : null
	const loop = [best.x.clone(), ...pts.slice(best.i + 1, best.j + 1), best.x.clone()]
	return loop
}

/** Distance from `p` to the nearest of `pts[from..to]` (inclusive). Point-based
 * rather than segment-based — within half a resample step of the true outline
 * distance, which is plenty for the tail allowance. */
function distanceToPoints(p: Vec, pts: Vec[], from: number, to: number): number {
	let min = Infinity
	for (let i = from; i <= to; i++) {
		const d = Vec.Dist(p, pts[i])
		if (d < min) min = d
	}
	return min
}

/**
 * Rule B: close an almost-loop whose endpoint lands near an earlier segment.
 * The closure point is the nearest point on that segment (trimming any partial
 * lead-in), the allowed gap scales with the candidate loop's size, and the
 * drawn part must turn nearly a full revolution ({@link WINDING_MIN}) so open
 * arcs never close. Returns the largest-area survivor.
 */
function findProximityLoop(
	pts: Vec[],
	zoom: number,
	minDimension: number,
	step: number
): Vec[] | null {
	const n = pts.length
	const end = pts[n - 1]
	const gapMin = GAP_MIN / zoom
	const gapMax = GAP_MAX / zoom

	let best: { polygon: Vec[]; area: number } | null = null

	// Skip the last two segments — they're adjacent to the endpoint.
	for (let k = 0; k < n - 3; k++) {
		const gap = Vec.DistanceToLineSegment(pts[k], pts[k + 1], end)
		if (gap > gapMax) continue

		const closurePoint = Vec.NearestPointOnLineSegment(pts[k], pts[k + 1], end)
		const drawn = [closurePoint, ...pts.slice(k + 1)]

		const area = polygonArea(drawn)
		if (best && area <= best.area) continue

		if (drawn.length < LOOP_MIN_POINTS) continue

		const bounds = Box.FromPoints(drawn)
		if (Math.min(bounds.w, bounds.h) < minDimension) continue

		const gapTolerance = Math.min(Math.max(GAP_RATIO * (bounds.w + bounds.h), gapMin), gapMax)
		if (gap > gapTolerance) continue

		// For gaps beyond the touch range, the pen must be moving toward the
		// closure point at release: a genuine undershoot ends approaching the
		// earlier path, while a stroke drawing away from a (nearly) completed
		// loop ends receding from it. Tiny gaps are already touching — no
		// direction evidence needed (release wobble would only add noise).
		if (gap > gapMin) {
			const back = pts[Math.max(0, n - 1 - APPROACH_LOOKBACK)]
			if (Vec.Dist(end, closurePoint) > Vec.Dist(back, closurePoint) + step) continue
		}

		// Winding is measured on a coarser resampling that scales with the loop's
		// size: jittery input can swing fine-grained segment directions past ±180°
		// and misfold the turning sum, while the coarse pass keeps corners but
		// low-passes the noise.
		const windingStep = Math.max(2 * step, (bounds.w + bounds.h) / 12)
		if (Math.abs(signedTurning(resamplePoints(drawn, windingStep))) < WINDING_MIN) continue

		best = { polygon: [...drawn, closurePoint.clone()], area }
	}

	return best?.polygon ?? null
}

/**
 * Total signed turning of a polyline, in radians. Interior noise cancels (the
 * sum telescopes), so only the end directions carry noise — those are measured
 * over a two-step baseline to damp it. A full loop turns ±2π, a U-shape ±π.
 */
function signedTurning(pts: Vec[]): number {
	const n = pts.length
	if (n < 4) return 0
	const angles: number[] = [Math.atan2(pts[2].y - pts[0].y, pts[2].x - pts[0].x)]
	for (let i = 2; i < n - 2; i++) {
		angles.push(Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x))
	}
	angles.push(Math.atan2(pts[n - 1].y - pts[n - 3].y, pts[n - 1].x - pts[n - 3].x))

	let total = 0
	for (let i = 1; i < angles.length; i++) {
		let delta = angles[i] - angles[i - 1]
		if (delta > Math.PI) delta -= 2 * Math.PI
		else if (delta < -Math.PI) delta += 2 * Math.PI
		total += delta
	}
	return total
}
