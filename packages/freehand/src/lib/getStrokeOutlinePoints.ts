import { Vec } from '../vendor'
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

/**
 * Drop track points that lie within `tol` of the segment between their kept neighbors. The
 * outline tracks are dense on gentle curves and straight runs where the quadratic smoothing
 * used for rendering needs far fewer points; this keeps the simplified polyline within `tol`
 * of the original one.
 */
function simplifyTrack(pts: Vec[], tol: number): Vec[] {
	if (pts.length <= 2 || tol <= 0) return pts
	const tol2 = tol * tol
	const out: Vec[] = [pts[0]]
	let anchor = 0
	const lastIdx = pts.length - 1
	while (anchor < lastIdx) {
		let best = anchor + 1
		const maxJ = anchor + SIMPLIFY_WINDOW > lastIdx ? lastIdx : anchor + SIMPLIFY_WINDOW
		const a = pts[anchor]
		outer: for (let j = anchor + 2; j <= maxJ; j++) {
			const c = pts[j]
			const acx = c.x - a.x
			const acy = c.y - a.y
			const l2 = acx * acx + acy * acy
			for (let k = anchor + 1; k < j; k++) {
				const b = pts[k]
				let t = l2 === 0 ? 0 : ((b.x - a.x) * acx + (b.y - a.y) * acy) / l2
				t = t < 0 ? 0 : t > 1 ? 1 : t
				const ex = b.x - (a.x + acx * t)
				const ey = b.y - (a.y + acy * t)
				if (ex * ex + ey * ey > tol2) break outer
			}
			best = j
		}
		out.push(pts[best])
		anchor = best
	}
	return out
}

/**
 * @internal
 */
export function getStrokeOutlineTracks(
	strokePoints: StrokePoint[],
	options: StrokeOptions = {}
): { left: Vec[]; right: Vec[] } {
	const { size = 16, smoothing = 0.5 } = options

	// We can't do anything with an empty array or a stroke with negative size.
	if (strokePoints.length === 0 || size <= 0) {
		return { left: [], right: [] }
	}

	const firstStrokePoint = strokePoints[0]
	const lastStrokePoint = strokePoints[strokePoints.length - 1]

	// The total length of the line
	const totalLength = lastStrokePoint.runningLength

	// The minimum allowed distance between points (squared)
	const minDistance = Math.pow(size * smoothing, 2)

	// Our collected left and right points
	const leftPts: Vec[] = []
	const rightPts: Vec[] = []

	// Previous vector
	let prevVecX = strokePoints[0].vector.x
	let prevVecY = strokePoints[0].vector.y

	// Previous left and right points
	let plx = strokePoints[0].point.x
	let ply = strokePoints[0].point.y
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

	let strokePoint: StrokePoint

	for (let i = 0; i < strokePoints.length; i++) {
		strokePoint = strokePoints[i]
		const point = strokePoint.point
		const vecX = strokePoint.vector.x
		const vecY = strokePoint.vector.y

		/*
      Handle sharp corners

      Find the difference (dot product) between the current and next vector.
      If the next vector is at more than a right angle to the current vector,
      draw a cap at the current point.
    */

		const prevDpr = vecX * prevVecX + vecY * prevVecY
		const nextVector = (i < strokePoints.length - 1 ? strokePoints[i + 1] : strokePoints[i]).vector
		const nextDpr = i < strokePoints.length - 1 ? nextVector.x * vecX + nextVector.y * vecY : 1

		const isPointSharpCorner = prevDpr < 0 && !isPrevPointSharpCorner
		const isNextPointSharpCorner = nextDpr < 0.2

		if (isPointSharpCorner || isNextPointSharpCorner) {
			// It's a sharp corner. Draw a rounded cap and move on to the next point
			// Considering saving these and drawing them later? So that we can avoid
			// crossing future points.

			if (
				nextDpr > HARD_CORNER_DPR &&
				totalLength - strokePoint.runningLength > strokePoint.radius
			) {
				// Draw a "soft" corner
				const offsetX = prevVecX * strokePoint.radius
				const offsetY = prevVecY * strokePoint.radius
				const cpr = prevVecX * nextVector.y - prevVecY * nextVector.x

				if (cpr < 0) {
					tlx = point.x + offsetX
					tly = point.y + offsetY
					trx = point.x - offsetX
					trY = point.y - offsetY
				} else {
					tlx = point.x - offsetX
					tly = point.y - offsetY
					trx = point.x + offsetX
					trY = point.y + offsetY
				}

				leftPts.push(new Vec(tlx, tly))
				rightPts.push(new Vec(trx, trY))
			} else {
				// Draw a "sharp" corner: rotate around the input point
				const inputX = strokePoint.input.x
				const inputY = strokePoint.input.y
				// start = input - per(prevVector) * radius
				const dx = -prevVecY * strokePoint.radius
				const dy = prevVecX * strokePoint.radius

				for (let step = 1 / MAX_ROUNDED_CORNER_STEPS, t = 0; t < 1; t += step) {
					let angle = FIXED_PI * t
					let s = Math.sin(angle)
					let c = Math.cos(angle)
					tlx = inputX + (dx * c - dy * s)
					tly = inputY + (dx * s + dy * c)
					leftPts.push(new Vec(tlx, tly))

					angle = FIXED_PI + FIXED_PI * -t
					s = Math.sin(angle)
					c = Math.cos(angle)
					trx = inputX + (dx * c - dy * s)
					trY = inputY + (dx * s + dy * c)
					rightPts.push(new Vec(trx, trY))
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

		if (strokePoint === firstStrokePoint || strokePoint === lastStrokePoint) {
			// offset = per(vector) * radius
			const offsetX = vecY * strokePoint.radius
			const offsetY = -vecX * strokePoint.radius
			leftPts.push(new Vec(point.x - offsetX, point.y - offsetY))
			rightPts.push(new Vec(point.x + offsetX, point.y + offsetY))

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

		// offset = lerp(nextVector, vector, nextDpr).per() * radius
		const lerpedX = nextVector.x + (vecX - nextVector.x) * nextDpr
		const lerpedY = nextVector.y + (vecY - nextVector.y) * nextDpr
		const offsetX = lerpedY * strokePoint.radius
		const offsetY = -lerpedX * strokePoint.radius

		tlx = point.x - offsetX
		tly = point.y - offsetY

		if (i <= 1 || (plx - tlx) ** 2 + (ply - tly) ** 2 > minDistance) {
			leftPts.push(new Vec(tlx, tly))
			plx = tlx
			ply = tly
		}

		trx = point.x + offsetX
		trY = point.y + offsetY

		if (i <= 1 || (prx - trx) ** 2 + (pry - trY) ** 2 > minDistance) {
			rightPts.push(new Vec(trx, trY))
			prx = trx
			pry = trY
		}

		// Set variables for next iteration
		prevVecX = vecX
		prevVecY = vecY
	}

	/*
    Return the points in the correct winding order: begin on the left side, then
    continue around the end cap, then come back along the right side, and finally
    complete the start cap.
  */

	const tolerance = size * TRACK_TOLERANCE_RATIO

	return {
		left: simplifyTrack(leftPts, tolerance),
		right: simplifyTrack(rightPts, tolerance),
	}
}

/** Pick a step count for a polygonal arc so its chord error stays within `tol`. */
function arcSteps(radius: number, sweep: number, tol: number, min: number, max: number) {
	if (radius <= tol) return min
	const maxAngle = 2 * Math.acos(1 - tol / radius)
	const steps = Math.ceil(sweep / maxAngle)
	return steps < min ? min : steps > max ? max : steps
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
	const { size = 16, start = {}, end = {}, last: isComplete = false } = options

	const { cap: capStart = true } = start
	const { cap: capEnd = true } = end

	// We can't do anything with an empty array or a stroke with negative size.
	if (strokePoints.length === 0 || size <= 0) {
		return []
	}

	const firstStrokePoint = strokePoints[0]
	const lastStrokePoint = strokePoints[strokePoints.length - 1]

	// The total length of the line
	const totalLength = lastStrokePoint.runningLength

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

	// The minimum allowed distance between points (squared)
	// Our collected left and right points
	const { left: leftPts, right: rightPts } = getStrokeOutlineTracks(strokePoints, options)

	// Chord tolerance for the polygonal caps below: caps don't need a fixed number of segments,
	// they need enough segments that the polygon is indistinguishable from the arc.
	const capTolerance = Math.max(0.05, size * 0.02)

	/*
    Drawing caps

    Now that we have our points on either side of the line, we need to
    draw caps at the start and end. Tapered lines don't have caps, but
    may have dots for very short lines.
  */

	const firstPoint = firstStrokePoint.point

	const lastPoint =
		strokePoints.length > 1
			? strokePoints[strokePoints.length - 1].point
			: Vec.AddXY(firstStrokePoint.point, 1, 1)

	/*
    Draw a dot for very short or completed strokes

    If the line is too short to gather left or right points and if the line is
    not tapered on either side, draw a dot. If the line is tapered, then only
    draw a dot if the line is both very short and complete. If we draw a dot,
    we can just return those points.
  */

	if (strokePoints.length === 1) {
		if (!(taperStart || taperEnd) || isComplete) {
			const start = Vec.Add(
				firstPoint,
				Vec.Sub(firstPoint, lastPoint).uni().per().mul(-firstStrokePoint.radius)
			)
			const dotPts: Vec[] = []
			const steps = arcSteps(
				firstStrokePoint.radius,
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
	if (taperStart || (taperEnd && strokePoints.length === 1)) {
		// The start point is tapered, noop
	} else if (capStart) {
		// Draw the round cap - rotate the right point around the start point to the left point
		const steps = arcSteps(firstStrokePoint.radius, FIXED_PI, capTolerance, 4, 8)
		for (let step = 1 / steps, t = step; t <= 1; t += step) {
			const pt = Vec.RotWith(rightPts[0], firstPoint, FIXED_PI * t)
			startCap.push(pt)
		}
	} else {
		// Draw the flat cap - add a point to the left and right of the start point
		const cornersVector = Vec.Sub(leftPts[0], rightPts[0])
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
	const direction = lastStrokePoint.vector.clone().per().neg()

	if (taperEnd || (taperStart && strokePoints.length === 1)) {
		// Tapered end - push the last point to the line
		endCap.push(lastPoint)
	} else if (capEnd) {
		// Draw the round end cap
		const start = Vec.Add(lastPoint, Vec.Mul(direction, lastStrokePoint.radius))
		const steps = arcSteps(
			lastStrokePoint.radius,
			FIXED_PI * 3,
			capTolerance,
			MIN_CAP_STEPS,
			MAX_CAP_STEPS
		)
		for (let step = 1 / steps, t = step; t < 1; t += step) {
			endCap.push(Vec.RotWith(start, lastPoint, FIXED_PI * 3 * t))
		}
	} else {
		// Draw the flat end cap
		endCap.push(
			Vec.Add(lastPoint, Vec.Mul(direction, lastStrokePoint.radius)),
			Vec.Add(lastPoint, Vec.Mul(direction, lastStrokePoint.radius * 0.99)),
			Vec.Sub(lastPoint, Vec.Mul(direction, lastStrokePoint.radius * 0.99)),
			Vec.Sub(lastPoint, Vec.Mul(direction, lastStrokePoint.radius))
		)
	}

	/*
    Return the points in the correct winding order: begin on the left side, then
    continue around the end cap, then come back along the right side, and finally
    complete the start cap.
  */

	return leftPts.concat(endCap, rightPts.reverse(), startCap)
}
