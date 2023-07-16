import { Vec2d } from '@tldraw/editor'
import type { StrokeOptions, StrokePoint } from './types'

const { PI } = Math

// Browser strokes seem to be off if PI is regular, a tiny offset seems to fix it
const FIXED_PI = PI + 0.0001

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
): Vec2d[] {
	const { size = 16, smoothing = 0.5, start = {}, end = {}, last: isComplete = false } = options

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
	const minDistance = Math.pow(size * smoothing, 2)

	// Our collected left and right points
	const leftPts: Vec2d[] = []
	const rightPts: Vec2d[] = []

	// Previous vector
	let prevVector = strokePoints[0].vector

	// Previous left and right points
	let pl = strokePoints[0].point
	let pr = pl

	// Temporary left and right points
	let tl = pl
	let tr = pr

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
		const { point, vector } = strokePoints[i]

		/*
      Handle sharp corners

      Find the difference (dot product) between the current and next vector.
      If the next vector is at more than a right angle to the current vector,
      draw a cap at the current point.
    */

		const prevDpr = strokePoint.vector.dpr(prevVector)
		const nextVector = (i < strokePoints.length - 1 ? strokePoints[i + 1] : strokePoints[i]).vector
		const nextDpr = i < strokePoints.length - 1 ? nextVector.dpr(strokePoint.vector) : 1

		const isPointSharpCorner = prevDpr < 0 && !isPrevPointSharpCorner
		const isNextPointSharpCorner = nextDpr !== null && nextDpr < 0.2

		if (isPointSharpCorner || isNextPointSharpCorner) {
			// It's a sharp corner. Draw a rounded cap and move on to the next point
			// Considering saving these and drawing them later? So that we can avoid
			// crossing future points.

			if (nextDpr > -0.62 && totalLength - strokePoint.runningLength > strokePoint.radius) {
				// Draw a "soft" corner
				const offset = prevVector.clone().mul(strokePoint.radius)
				const cpr = prevVector.clone().cpr(nextVector)

				if (cpr < 0) {
					tl = Vec2d.Add(point, offset)
					tr = Vec2d.Sub(point, offset)
				} else {
					tl = Vec2d.Sub(point, offset)
					tr = Vec2d.Add(point, offset)
				}

				leftPts.push(tl)
				rightPts.push(tr)
			} else {
				// Draw a "sharp" corner
				const offset = prevVector.clone().mul(strokePoint.radius).per()
				const start = Vec2d.Sub(strokePoint.input, offset)

				for (let step = 1 / 13, t = 0; t < 1; t += step) {
					tl = Vec2d.RotWith(start, strokePoint.input, FIXED_PI * t)
					leftPts.push(tl)

					tr = Vec2d.RotWith(start, strokePoint.input, FIXED_PI + FIXED_PI * -t)
					rightPts.push(tr)
				}
			}

			pl = tl
			pr = tr

			if (isNextPointSharpCorner) {
				isPrevPointSharpCorner = true
			}

			continue
		}

		isPrevPointSharpCorner = false

		if (strokePoint === firstStrokePoint || strokePoint === lastStrokePoint) {
			const offset = Vec2d.Per(vector).mul(strokePoint.radius)
			leftPts.push(Vec2d.Sub(point, offset))
			rightPts.push(Vec2d.Add(point, offset))

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

		const offset = Vec2d.Lrp(nextVector, vector, nextDpr).per().mul(strokePoint.radius)

		tl = Vec2d.Sub(point, offset)

		if (i <= 1 || Vec2d.Dist2(pl, tl) > minDistance) {
			leftPts.push(tl)
			pl = tl
		}

		tr = Vec2d.Add(point, offset)

		if (i <= 1 || Vec2d.Dist2(pr, tr) > minDistance) {
			rightPts.push(tr)
			pr = tr
		}

		// Set variables for next iteration
		prevVector = vector

		continue
	}

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
			: Vec2d.AddXY(firstStrokePoint.point, 1, 1)

	/* 
    Draw a dot for very short or completed strokes
    
    If the line is too short to gather left or right points and if the line is
    not tapered on either side, draw a dot. If the line is tapered, then only
    draw a dot if the line is both very short and complete. If we draw a dot,
    we can just return those points.
  */

	if (strokePoints.length === 1) {
		if (!(taperStart || taperEnd) || isComplete) {
			const start = Vec2d.Add(
				firstPoint,
				Vec2d.Sub(firstPoint, lastPoint).uni().per().mul(-firstStrokePoint.radius)
			)
			const dotPts: Vec2d[] = []
			for (let step = 1 / 13, t = step; t <= 1; t += step) {
				dotPts.push(Vec2d.RotWith(start, firstPoint, FIXED_PI * 2 * t))
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

	const startCap: Vec2d[] = []
	if (taperStart || (taperEnd && strokePoints.length === 1)) {
		// The start point is tapered, noop
	} else if (capStart) {
		// Draw the round cap - add thirteen points rotating the right point around the start point to the left point
		for (let step = 1 / 8, t = step; t <= 1; t += step) {
			const pt = Vec2d.RotWith(rightPts[0], firstPoint, FIXED_PI * t)
			startCap.push(pt)
		}
	} else {
		// Draw the flat cap - add a point to the left and right of the start point
		const cornersVector = Vec2d.Sub(leftPts[0], rightPts[0])
		const offsetA = Vec2d.Mul(cornersVector, 0.5)
		const offsetB = Vec2d.Mul(cornersVector, 0.51)

		startCap.push(
			Vec2d.Sub(firstPoint, offsetA),
			Vec2d.Sub(firstPoint, offsetB),
			Vec2d.Add(firstPoint, offsetB),
			Vec2d.Add(firstPoint, offsetA)
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

	const endCap: Vec2d[] = []
	const direction = lastStrokePoint.vector.clone().per().neg()

	if (taperEnd || (taperStart && strokePoints.length === 1)) {
		// Tapered end - push the last point to the line
		endCap.push(lastPoint)
	} else if (capEnd) {
		// Draw the round end cap
		const start = Vec2d.Add(lastPoint, Vec2d.Mul(direction, lastStrokePoint.radius))
		for (let step = 1 / 29, t = step; t < 1; t += step) {
			endCap.push(Vec2d.RotWith(start, lastPoint, FIXED_PI * 3 * t))
		}
	} else {
		// Draw the flat end cap
		endCap.push(
			Vec2d.Add(lastPoint, Vec2d.Mul(direction, lastStrokePoint.radius)),
			Vec2d.Add(lastPoint, Vec2d.Mul(direction, lastStrokePoint.radius * 0.99)),
			Vec2d.Sub(lastPoint, Vec2d.Mul(direction, lastStrokePoint.radius * 0.99)),
			Vec2d.Sub(lastPoint, Vec2d.Mul(direction, lastStrokePoint.radius))
		)
	}

	/*
    Return the points in the correct winding order: begin on the left side, then 
    continue around the end cap, then come back along the right side, and finally 
    complete the start cap.
  */

	return leftPts.concat(endCap, rightPts.reverse(), startCap)
}
