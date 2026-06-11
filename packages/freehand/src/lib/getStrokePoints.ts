import { Vec, VecLike } from '../vendor'
import type { StrokeOptions, StrokePoint } from './types'

const MIN_PRESSURE = 0.025

/**
 * ## getStrokePoints
 *
 * Get an array of points as objects with an adjusted point, pressure, vector, distance, and
 * runningLength.
 *
 * @param points - An array of points (as `[x, y, pressure]` or `{x, y, pressure}`). Pressure is
 *   optional in both cases.
 * @param options - An object with options.
 * @public
 */
export function getStrokePoints(
	rawInputPoints: VecLike[],
	options: StrokeOptions = {}
): StrokePoint[] {
	const { streamline = 0.5, size = 16, simulatePressure = false } = options

	// If we don't have any points, return an empty array.
	if (rawInputPoints.length === 0) return []

	// Find the interpolation level between points.
	const t = 0.15 + (1 - streamline) * 0.85

	// Whatever the input is, make sure that the points are in number[][].
	let pts = rawInputPoints.map(Vec.From)

	let pointsRemovedFromNearEnd = 0

	if (!simulatePressure) {
		// Clamp any zero/near-zero pressure points to a minimum value.
		// Some pens or OSes report z=0 even while the pen is touching,
		// so we clamp rather than strip to avoid removing real input.
		for (const pt of pts) {
			if (pt.z < MIN_PRESSURE) {
				pt.z = MIN_PRESSURE
			}
		}
	}

	const minDist2 = (size / 3) ** 2

	// Strip points that are too close to the first point. Work with indices rather
	// than repeated splices so this stays linear when many points are stripped.
	const first = pts[0]
	let startIdx = 1
	while (startIdx < pts.length) {
		const pt = pts[startIdx]
		if (Vec.Dist2(pt, first) > minDist2) break
		first.z = Math.max(first.z, pt.z) // Use maximum pressure
		startIdx++
	}

	if (startIdx > 1) {
		const kept: Vec[] = [first]
		for (let i = startIdx; i < pts.length; i++) kept.push(pts[i])
		pts = kept
	}

	// Strip points that are too close to the last point.
	const last = pts.pop()!
	while (pts.length) {
		const pt = pts[pts.length - 1]
		if (Vec.Dist2(pt, last) > minDist2) break
		pts.pop()
		pointsRemovedFromNearEnd++
	}
	pts.push(last)

	const isComplete =
		options.last ||
		!options.simulatePressure ||
		(pts.length > 1 && Vec.Dist2(pts[pts.length - 1], pts[pts.length - 2]) < size ** 2) ||
		pointsRemovedFromNearEnd > 0

	// Add extra points between the two, to help avoid "dash" lines
	// for strokes with tapered start and ends. Don't mutate the
	// input array!
	if (pts.length === 2 && options.simulatePressure) {
		const last = pts[1]
		pts = pts.slice(0, -1)
		for (let i = 1; i < 5; i++) {
			const next = Vec.Lrp(pts[0], last, i / 4)
			next.z = ((pts[0].z + (last.z - pts[0].z)) * i) / 4
			pts.push(next)
		}
	}

	// The strokePoints array will hold the points for the stroke.
	// Start it out with the first point, which needs no adjustment.
	const strokePoints: StrokePoint[] = [
		{
			point: pts[0],
			input: pts[0],
			pressure: simulatePressure ? 0.5 : pts[0].z,
			distance: 0,
			runningLength: 0,
			radius: 1,
		},
	]

	// We use the totalLength to keep track of the total distance
	let totalLength = 0

	// We're set this to the latest point, so we can use it to calculate
	// the distance and vector of the next point.
	let prev = strokePoints[0]

	// Iterate through all of the points, creating StrokePoints.
	let point: Vec, distance: number

	if (isComplete && streamline > 0) {
		pts.push(pts[pts.length - 1].clone())
	}

	for (let i = 1, n = pts.length; i < n; i++) {
		point =
			!t || (options.last && i === n - 1) ? pts[i].clone() : pts[i].clone().lrp(prev.point, 1 - t)

		// If the new point is the same as the previous point, skip ahead.
		if (prev.point.equals(point)) continue

		// How far is the new point from the previous point?
		distance = Vec.Dist(point, prev.point)

		// Add this distance to the total "running length" of the line.
		totalLength += distance

		// At the start of the line, we wait until the new point is a
		// certain distance away from the original point, to avoid noise

		if (i < 4 && totalLength < size) {
			continue
		}

		// Create a new strokepoint (it will be the new "previous" one).
		prev = {
			input: pts[i],
			// The adjusted point
			point,
			// The input pressure (or .5 if not specified)
			pressure: simulatePressure ? 0.5 : pts[i].z,
			// The distance between the current point and the previous point
			distance,
			// The total distance so far
			runningLength: totalLength,
			// The stroke point's radius
			radius: 1,
		}

		// Push it to the strokePoints array.
		strokePoints.push(prev)
	}

	if (totalLength < 1) {
		const maxPressureAmongPoints = Math.max(0.5, ...strokePoints.map((s) => s.pressure))
		strokePoints.forEach((s) => (s.pressure = maxPressureAmongPoints))
	}

	return strokePoints
}
