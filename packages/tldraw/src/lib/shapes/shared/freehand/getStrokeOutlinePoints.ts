import { Vec, VecLike } from '@tldraw/editor'
import {
	loadSrcFromStrokePoints,
	srcCount,
	srcInputX,
	srcInputY,
	srcIsCap,
	srcRadius,
	srcRunningLength,
	srcX,
	srcY,
	srcZ,
} from './core'
import type { StrokeOptions, StrokePoint } from './types'

const { PI } = Math

// Browser strokes seem to be off if PI is regular, a tiny offset seems to fix it
const FIXED_PI = PI + 0.0001

// How far the simplified outline tracks may deviate from the raw tracks, as a fraction of the
// stroke size. Well below visible thresholds: the parity harness shows sub-0.1px differences at
// default stroke sizes.
const TRACK_TOLERANCE_RATIO = 0.05

// The maximum number of intermediate points the track simplifier may drop per kept segment.
const SIMPLIFY_WINDOW = 8

// How many steps to take when rounding a corner
const MIN_ROUNDED_CORNER_STEPS = 8
const MAX_ROUNDED_CORNER_STEPS = 13

// How many steps to take when rounding a corner
const MIN_CAP_STEPS = 8
const MAX_CAP_STEPS = 29

// Dot product threshold for identifying a hard corner
const HARD_CORNER_DPR = -0.62

// ---------------------------------------------------------------------------------
// Track buffers: the left and right outline tracks, written by `buildTracks` and read
// either by svgInk's path writer or materialized into Vecs by the public functions.
// Reusable and non-reentrant, like the pipeline buffers in core.ts.
// ---------------------------------------------------------------------------------

let trackCapacity = 1024
export let trackLeftX = new Float64Array(trackCapacity)
export let trackLeftY = new Float64Array(trackCapacity)
export let trackRightX = new Float64Array(trackCapacity)
export let trackRightY = new Float64Array(trackCapacity)
export let trackLeftCount = 0
export let trackRightCount = 0

// Tracks grow while being written (corners append a variable number of points), so unlike
// the other buffers a grow here must copy the points written so far.
function growTracks() {
	trackCapacity *= 2
	const nlx = new Float64Array(trackCapacity)
	nlx.set(trackLeftX)
	trackLeftX = nlx
	const nly = new Float64Array(trackCapacity)
	nly.set(trackLeftY)
	trackLeftY = nly
	const nrx = new Float64Array(trackCapacity)
	nrx.set(trackRightX)
	trackRightX = nrx
	const nry = new Float64Array(trackCapacity)
	nry.set(trackRightY)
	trackRightY = nry
}

/**
 * Drop track points that lie within tolderance (`tol`) of the segment between their kept neighbors.
 * The outline tracks are dense on gentle curves and straight runs where the quadratic smoothing
 * used for rendering needs far fewer points; this keeps the simplified polyline within `tol` of
 * the original one. Works in place: kept points are compacted toward the front of the arrays.
 *
 * @param xs - The x coordinates of the track to simplify
 * @param ys - The y coordinates of the track to simplify
 * @param len - The number of points in the track
 * @param tol - The tolerance
 *
 * @returns The number of points in the simplified track.
 */
function simplifyTrack(xs: Float64Array, ys: Float64Array, len: number, tol: number): number {
	if (len <= 2 || tol <= 0) return len
	const tol2 = tol * tol
	let out = 1
	let anchor = 0
	const lastIdx = len - 1
	while (anchor < lastIdx) {
		let best = anchor + 1
		const maxJ = anchor + SIMPLIFY_WINDOW > lastIdx ? lastIdx : anchor + SIMPLIFY_WINDOW
		const ax = xs[anchor]
		const ay = ys[anchor]
		outer: for (let j = anchor + 2; j <= maxJ; j++) {
			const acx = xs[j] - ax
			const acy = ys[j] - ay
			const l2 = acx * acx + acy * acy
			for (let k = anchor + 1; k < j; k++) {
				let t = l2 === 0 ? 0 : ((xs[k] - ax) * acx + (ys[k] - ay) * acy) / l2
				t = t < 0 ? 0 : t > 1 ? 1 : t
				const ex = xs[k] - (ax + acx * t)
				const ey = ys[k] - (ay + acy * t)
				if (ex * ex + ey * ey > tol2) break outer
			}
			best = j
		}
		// Compaction never overtakes the read cursor: the `out`th kept index is always >= out.
		xs[out] = xs[best]
		ys[out] = ys[best]
		out++
		anchor = best
	}
	return out
}

/**
 * Build the left and right outline tracks for the stroke points currently loaded in the
 * track-source buffers, into the track buffers. This is the array core of
 * `getStrokeOutlineTracks`.
 *
 * `hasAnchor`/`anchorX`/`anchorY` carry the original predecessor of point 1 when the
 * caller has cut or altered the sequence in front of it (svgInk's elbow partitions): the
 * second point's vector is derived from the anchor rather than from point 0, preserving
 * the direction it had in the uncut stroke. It only applies when there are more than two
 * points; two-point sequences derive both vectors from each other.
 *
 * @internal
 */
export function buildTracks(
	options: StrokeOptions,
	hasAnchor: boolean,
	anchorX: number,
	anchorY: number
): void {
	const { size = 16, smoothing = 0.5 } = options

	let lc = 0
	let rc = 0
	trackLeftCount = 0
	trackRightCount = 0

	const n = srcCount

	// We can't do anything with an empty array or a stroke with negative size.
	if (n === 0 || size <= 0) return

	// Local captures of the source buffers, hoisting the binding reads out of the loop.
	// The track buffers can grow mid-loop, so those are re-captured after growth.
	const sx = srcX
	const sy = srcY
	const six = srcInputX
	const siy = srcInputY
	const sr = srcRadius
	const srl = srcRunningLength
	const scap = srcIsCap
	let lxs = trackLeftX
	let lys = trackLeftY
	let rxs = trackRightX
	let rys = trackRightY

	// The total length of the line
	const totalLength = srl[n - 1]

	// The minimum allowed distance between points (squared)
	const minDistance = Math.pow(size * smoothing, 2)

	// Stroke point vectors are derived on the fly from consecutive points: a point's vector is
	// the unit vector pointing back at its predecessor (matching what getStrokePoints used to
	// store). The first point shares the second point's vector; a lone point keeps the legacy
	// unnormalized (1, 1).
	let curVecX = 1
	let curVecY = 1
	if (n > 1) {
		const dx = sx[0] - sx[1]
		const dy = sy[0] - sy[1]
		const l = (dx * dx + dy * dy) ** 0.5
		if (l === 0) {
			curVecX = dx
			curVecY = dy
		} else {
			curVecX = dx / l
			curVecY = dy / l
		}
	}

	// Previous vector
	let prevVecX = curVecX
	let prevVecY = curVecY

	// Previous left and right points
	let plx = sx[0]
	let ply = sy[0]
	let prx = plx
	let pry = ply

	// Temporary left and right points
	let tlx = plx
	let tly = ply
	let trx = prx
	let trY = pry

	// Keep track of whether the previous point is a sharp corner
	// ... so that we don't detect the same corner twice
	let isPrevPointSharpCorner = false

	/*
    Find the outline's left and right points

    Iterating through the points and populate the rightPts and leftPts arrays,
    skipping the first and last pointsm, which will get caps later on.
  */

	for (let i = 0; i < n; i++) {
		const pointX = sx[i]
		const pointY = sy[i]
		const radius = sr[i]
		const vecX = curVecX
		const vecY = curVecY

		// Derive the next point's vector (the last point reuses its own), and advance the
		// running vector so the next iteration picks it up regardless of `continue`s below.
		let nextVecX = vecX
		let nextVecY = vecY
		if (i < n - 1) {
			const fromX = i === 0 && n > 2 && hasAnchor ? anchorX : pointX
			const fromY = i === 0 && n > 2 && hasAnchor ? anchorY : pointY
			const dx = fromX - sx[i + 1]
			const dy = fromY - sy[i + 1]
			const l = (dx * dx + dy * dy) ** 0.5
			if (l === 0) {
				nextVecX = dx
				nextVecY = dy
			} else {
				nextVecX = dx / l
				nextVecY = dy / l
			}
		}
		curVecX = nextVecX
		curVecY = nextVecY

		// Make sure a corner's worth of points will fit on each side.
		if (
			lc + MAX_ROUNDED_CORNER_STEPS + 1 > trackCapacity ||
			rc + MAX_ROUNDED_CORNER_STEPS + 1 > trackCapacity
		) {
			growTracks()
			lxs = trackLeftX
			lys = trackLeftY
			rxs = trackRightX
			rys = trackRightY
		}

		/*
      Handle sharp corners

      Find the difference (dot product) between the current and next vector.
      If the next vector is at more than a right angle to the current vector,
      draw a cap at the current point.
    */

		const prevDpr = vecX * prevVecX + vecY * prevVecY
		const nextDpr = i < n - 1 ? nextVecX * vecX + nextVecY * vecY : 1

		const isPointSharpCorner = prevDpr < 0 && !isPrevPointSharpCorner
		const isNextPointSharpCorner = nextDpr < 0.2

		if (isPointSharpCorner || isNextPointSharpCorner) {
			// It's a sharp corner. Draw a rounded cap and move on to the next point
			// Considering saving these and drawing them later? So that we can avoid
			// crossing future points.

			if (nextDpr > HARD_CORNER_DPR && totalLength - srl[i] > radius) {
				// Draw a "soft" corner
				const offsetX = prevVecX * radius
				const offsetY = prevVecY * radius
				const cpr = prevVecX * nextVecY - prevVecY * nextVecX

				if (cpr < 0) {
					tlx = pointX + offsetX
					tly = pointY + offsetY
					trx = pointX - offsetX
					trY = pointY - offsetY
				} else {
					tlx = pointX - offsetX
					tly = pointY - offsetY
					trx = pointX + offsetX
					trY = pointY + offsetY
				}

				lxs[lc] = tlx
				lys[lc] = tly
				lc++
				rxs[rc] = trx
				rys[rc] = trY
				rc++
			} else {
				// Draw a "sharp" corner: rotate around the input point
				const inX = six[i]
				const inY = siy[i]
				// The arm swept around the point starts perpendicular to the
				// incoming direction, one radius long.
				const dx = -prevVecY * radius
				const dy = prevVecX * radius

				for (let step = 1 / MAX_ROUNDED_CORNER_STEPS, t = 0; t < 1; t += step) {
					let angle = FIXED_PI * t
					let s = Math.sin(angle)
					let c = Math.cos(angle)
					tlx = inX + (dx * c - dy * s)
					tly = inY + (dx * s + dy * c)
					lxs[lc] = tlx
					lys[lc] = tly
					lc++

					angle = FIXED_PI + FIXED_PI * -t
					s = Math.sin(angle)
					c = Math.cos(angle)
					trx = inX + (dx * c - dy * s)
					trY = inY + (dx * s + dy * c)
					rxs[rc] = trx
					rys[rc] = trY
					rc++
				}
			}

			plx = tlx
			ply = tly
			prx = trx
			pry = trY

			if (isNextPointSharpCorner) {
				isPrevPointSharpCorner = true
			}

			continue
		}

		isPrevPointSharpCorner = false

		if (scap[i]) {
			// Project one radius to each side, perpendicular to the direction of travel.
			const offsetX = vecY * radius
			const offsetY = -vecX * radius
			lxs[lc] = pointX - offsetX
			lys[lc] = pointY - offsetY
			lc++
			rxs[rc] = pointX + offsetX
			rys[rc] = pointY + offsetY
			rc++

			continue
		}

		/*
      Add regular points

      Project points to either side of the current point, using the
      calculated size as a distance. If a point's distance to the
      previous point on that side greater than the minimum distance
      (or if the corner is kinda sharp), add the points to the side's
      points array.
    */

		// Project one radius to each side, perpendicular to the direction of
		// travel. The direction blends the current and next vectors, leaning
		// into the next vector as the upcoming turn sharpens.
		const lerpedX = nextVecX + (vecX - nextVecX) * nextDpr
		const lerpedY = nextVecY + (vecY - nextVecY) * nextDpr
		const offsetX = lerpedY * radius
		const offsetY = -lerpedX * radius

		tlx = pointX - offsetX
		tly = pointY - offsetY

		if (i <= 1 || (plx - tlx) ** 2 + (ply - tly) ** 2 > minDistance) {
			lxs[lc] = tlx
			lys[lc] = tly
			lc++
			plx = tlx
			ply = tly
		}

		trx = pointX + offsetX
		trY = pointY + offsetY

		if (i <= 1 || (prx - trx) ** 2 + (pry - trY) ** 2 > minDistance) {
			rxs[rc] = trx
			rys[rc] = trY
			rc++
			prx = trx
			pry = trY
		}

		// Set variables for next iteration
		prevVecX = vecX
		prevVecY = vecY
	}

	const tolerance = size * TRACK_TOLERANCE_RATIO

	trackLeftCount = simplifyTrack(trackLeftX, trackLeftY, lc, tolerance)
	trackRightCount = simplifyTrack(trackRightX, trackRightY, rc, tolerance)
}

/**
 * @internal
 *
 * `vectorAnchor` is the original predecessor of `strokePoints[1]` when the caller has cut or
 * altered the sequence in front of it (svgInk's elbow partitions): the second point's vector is
 * derived from the anchor rather than from `strokePoints[0]`, preserving the direction it had in
 * the uncut stroke. It only applies when there are more than two points; two-point sequences
 * derive both vectors from each other.
 */
export function getStrokeOutlineTracks(
	strokePoints: StrokePoint[],
	options: StrokeOptions = {},
	vectorAnchor?: VecLike
): { left: Vec[]; right: Vec[] } {
	loadSrcFromStrokePoints(strokePoints)
	buildTracks(
		options,
		!!vectorAnchor,
		vectorAnchor ? vectorAnchor.x : 0,
		vectorAnchor ? vectorAnchor.y : 0
	)

	const lxs = trackLeftX
	const lys = trackLeftY
	const rxs = trackRightX
	const rys = trackRightY
	const left: Vec[] = new Array(trackLeftCount)
	for (let i = 0; i < trackLeftCount; i++) {
		left[i] = new Vec(lxs[i], lys[i])
	}
	const right: Vec[] = new Array(trackRightCount)
	for (let i = 0; i < trackRightCount; i++) {
		right[i] = new Vec(rxs[i], rys[i])
	}
	return { left, right }
}

/** Pick a step count for a polygonal arc so its chord error stays within `tol`. */
function arcSteps(radius: number, sweep: number, tol: number, min: number, max: number) {
	if (radius <= tol) return min
	const maxAngle = 2 * Math.acos(1 - tol / radius)
	const steps = Math.ceil(sweep / maxAngle)
	return steps < min ? min : steps > max ? max : steps
}

/**
 * Build the full outline (tracks plus caps) for the stroke points currently loaded in the
 * track-source buffers. This is the shared core of `getStrokeOutlinePoints` and
 * `getStroke`.
 *
 * @internal
 */
export function outlineFromSrc(options: StrokeOptions = {}): Vec[] {
	const { size = 16, start = {}, end = {}, last: isComplete = false } = options

	const { cap: capStart = true } = start
	const { cap: capEnd = true } = end

	const n = srcCount

	// We can't do anything with an empty array or a stroke with negative size.
	if (n === 0 || size <= 0) {
		return []
	}

	// The total length of the line
	const totalLength = srcRunningLength[n - 1]

	const taperStart =
		start.taper === false
			? 0
			: start.taper === true
				? Math.max(size, totalLength)
				: (start.taper as number)

	const taperEnd =
		end.taper === false
			? 0
			: end.taper === true
				? Math.max(size, totalLength)
				: (end.taper as number)

	// Our collected left and right points
	buildTracks(options, false, 0, 0)

	// Chord tolerance for the polygonal caps below: caps don't need a fixed number of segments,
	// they need enough segments that the polygon is indistinguishable from the arc.
	const capTolerance = Math.max(0.05, size * 0.02)

	const firstRadius = srcRadius[0]
	const firstPoint = new Vec(srcX[0], srcY[0], srcZ[0])

	const lastPoint =
		n > 1 ? new Vec(srcX[n - 1], srcY[n - 1], srcZ[n - 1]) : Vec.AddXY(firstPoint, 1, 1)

	/*
    Draw a dot for very short or completed strokes

    If the line is too short to gather left or right points and if the line is
    not tapered on either side, draw a dot. If the line is tapered, then only
    draw a dot if the line is both very short and complete. If we draw a dot,
    we can just return those points.
  */

	if (n === 1) {
		if (!(taperStart || taperEnd) || isComplete) {
			const start = Vec.Add(
				firstPoint,
				Vec.Sub(firstPoint, lastPoint).uni().per().mul(-firstRadius)
			)
			const dotPts: Vec[] = []
			const steps = arcSteps(
				firstRadius,
				FIXED_PI * 2,
				capTolerance,
				MIN_ROUNDED_CORNER_STEPS,
				MAX_ROUNDED_CORNER_STEPS
			)
			for (let step = 1 / steps, t = step; t <= 1; t += step) {
				dotPts.push(Vec.RotWith(start, firstPoint, FIXED_PI * 2 * t))
			}
			return dotPts
		}
	}

	/*
    Draw a start cap

    Unless the line has a tapered start, or unless the line has a tapered end
    and the line is very short, draw a start cap around the first point. Use
    the distance between the second left and right point for the cap's radius.
    Finally remove the first left and right points. :psyduck:
  */

	const startCap: Vec[] = []
	if (taperStart || (taperEnd && n === 1)) {
		// The start point is tapered, noop
	} else if (capStart) {
		// Draw the round cap - rotate the right point around the start point to the left point
		const firstRight = new Vec(trackRightX[0], trackRightY[0])
		const steps = arcSteps(firstRadius, FIXED_PI, capTolerance, 4, 8)
		for (let step = 1 / steps, t = step; t <= 1; t += step) {
			const pt = Vec.RotWith(firstRight, firstPoint, FIXED_PI * t)
			startCap.push(pt)
		}
	} else {
		// Draw the flat cap - add a point to the left and right of the start point
		const cornersVector = new Vec(trackLeftX[0] - trackRightX[0], trackLeftY[0] - trackRightY[0])
		const offsetA = Vec.Mul(cornersVector, 0.5)
		const offsetB = Vec.Mul(cornersVector, 0.51)

		startCap.push(
			Vec.Sub(firstPoint, offsetA),
			Vec.Sub(firstPoint, offsetB),
			Vec.Add(firstPoint, offsetB),
			Vec.Add(firstPoint, offsetA)
		)
	}

	/*
    Draw an end cap

    If the line does not have a tapered end, and unless the line has a tapered
    start and the line is very short, draw a cap around the last point. Finally,
    remove the last left and right points. Otherwise, add the last point. Note
    that This cap is a full-turn-and-a-half: this prevents incorrect caps on
    sharp end turns.
  */

	const endCap: Vec[] = []
	const lastRadius = srcRadius[n - 1]

	// The exit vector at the last point points back at its predecessor,
	// normalized; a lone point keeps the legacy (1, 1). The cap then starts
	// perpendicular to that vector.
	let lastVecX = 1
	let lastVecY = 1
	if (n > 1) {
		const dx = srcX[n - 2] - srcX[n - 1]
		const dy = srcY[n - 2] - srcY[n - 1]
		const l = (dx * dx + dy * dy) ** 0.5
		if (l === 0) {
			lastVecX = dx
			lastVecY = dy
		} else {
			lastVecX = dx / l
			lastVecY = dy / l
		}
	}
	const direction = new Vec(-lastVecY, lastVecX)

	if (taperEnd || (taperStart && n === 1)) {
		// Tapered end - push the last point to the line
		endCap.push(lastPoint)
	} else if (capEnd) {
		// Draw the round end cap
		const start = Vec.Add(lastPoint, Vec.Mul(direction, lastRadius))
		const steps = arcSteps(lastRadius, FIXED_PI * 3, capTolerance, MIN_CAP_STEPS, MAX_CAP_STEPS)
		for (let step = 1 / steps, t = step; t < 1; t += step) {
			endCap.push(Vec.RotWith(start, lastPoint, FIXED_PI * 3 * t))
		}
	} else {
		// Draw the flat end cap
		endCap.push(
			Vec.Add(lastPoint, Vec.Mul(direction, lastRadius)),
			Vec.Add(lastPoint, Vec.Mul(direction, lastRadius * 0.99)),
			Vec.Sub(lastPoint, Vec.Mul(direction, lastRadius * 0.99)),
			Vec.Sub(lastPoint, Vec.Mul(direction, lastRadius))
		)
	}

	/*
    Return the points in the correct winding order: begin on the left side, then
    continue around the end cap, then come back along the right side, and finally
    complete the start cap.
  */

	const lxs = trackLeftX
	const lys = trackLeftY
	const rxs = trackRightX
	const rys = trackRightY
	const leftPts: Vec[] = new Array(trackLeftCount)
	for (let i = 0; i < trackLeftCount; i++) {
		leftPts[i] = new Vec(lxs[i], lys[i])
	}
	const rightPtsReversed: Vec[] = new Array(trackRightCount)
	for (let i = 0; i < trackRightCount; i++) {
		rightPtsReversed[i] = new Vec(rxs[trackRightCount - 1 - i], rys[trackRightCount - 1 - i])
	}

	return leftPts.concat(endCap, rightPtsReversed, startCap)
}

/**
 * ## getStrokeOutlinePoints
 *
 * Get an array of points (as `[x, y]`) representing the outline of a stroke.
 *
 * @param points - An array of StrokePoints as returned from `getStrokePoints`.
 * @param options - An object with options.
 * @public
 */
export function getStrokeOutlinePoints(
	strokePoints: StrokePoint[],
	options: StrokeOptions = {}
): Vec[] {
	loadSrcFromStrokePoints(strokePoints)
	return outlineFromSrc(options)
}
