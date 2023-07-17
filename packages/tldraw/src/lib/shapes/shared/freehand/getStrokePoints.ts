import { Vec2d, VecLike } from '@tldraw/editor'
import type { StrokeOptions, StrokePoint } from './types'

const MIN_START_PRESSURE = 0.025
const MIN_END_PRESSURE = 0.01

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
	let pts = rawInputPoints.map(Vec2d.From)

	let pointsRemovedFromNearEnd = 0

	if (!simulatePressure) {
		// Strip low pressure points from the start of the array.
		let pt = pts[0]
		while (pt) {
			if (pt.z >= MIN_START_PRESSURE) break
			pts.shift()
			pt = pts[0]
		}
	}

	if (!simulatePressure) {
		// Strip low pressure points from the end of the array.
		let pt = pts[pts.length - 1]
		while (pt) {
			if (pt.z >= MIN_END_PRESSURE) break
			pts.pop()
			pt = pts[pts.length - 1]
		}
	}

	if (pts.length === 0)
		return [
			{
				point: Vec2d.From(rawInputPoints[0]),
				input: Vec2d.From(rawInputPoints[0]),
				pressure: simulatePressure ? 0.5 : 0.15,
				vector: new Vec2d(1, 1),
				distance: 0,
				runningLength: 0,
				radius: 1,
			},
		]

	// Strip points that are too close to the first point.
	let pt = pts[1]
	while (pt) {
		if (Vec2d.Dist(pt, pts[0]) > size / 3) break
		pts[0].z = Math.max(pts[0].z, pt.z) // Use maximum pressure
		pts.splice(1, 1)
		pt = pts[1]
	}

	// Strip points that are too close to the last point.
	const last = pts.pop()!
	pt = pts[pts.length - 1]
	while (pt) {
		if (Vec2d.Dist(pt, last) > size / 3) break
		pts.pop()
		pt = pts[pts.length - 1]
		pointsRemovedFromNearEnd++
	}
	pts.push(last)

	const isComplete =
		options.last ||
		!options.simulatePressure ||
		(pts.length > 1 && Vec2d.Dist(pts[pts.length - 1], pts[pts.length - 2]) < size) ||
		pointsRemovedFromNearEnd > 0

	// Add extra points between the two, to help avoid "dash" lines
	// for strokes with tapered start and ends. Don't mutate the
	// input array!
	if (pts.length === 2 && options.simulatePressure) {
		const last = pts[1]
		pts = pts.slice(0, -1)
		for (let i = 1; i < 5; i++) {
			const next = Vec2d.Lrp(pts[0], last, i / 4)
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
			vector: new Vec2d(1, 1),
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
	let point: Vec2d, distance: number

	if (isComplete && streamline > 0) {
		pts.push(pts[pts.length - 1].clone())
	}

	for (let i = 1, n = pts.length; i < n; i++) {
		point =
			!t || (options.last && i === n - 1) ? pts[i].clone() : pts[i].clone().lrp(prev.point, 1 - t)

		// If the new point is the same as the previous point, skip ahead.
		if (prev.point.equals(point)) continue

		// How far is the new point from the previous point?
		distance = Vec2d.Dist(point, prev.point)

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
			// The vector from the current point to the previous point
			vector: Vec2d.Sub(prev.point, point).uni(),
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

	// Set the vector of the first point to be the same as the second point.
	if (strokePoints[1]?.vector) {
		strokePoints[0].vector = strokePoints[1].vector.clone()
	}

	if (totalLength < 1) {
		const maxPressureAmongPoints = Math.max(0.5, ...strokePoints.map((s) => s.pressure))
		strokePoints.forEach((s) => (s.pressure = maxPressureAmongPoints))
	}

	return strokePoints
}
