import { average, precise, Vec, VecLike } from '@tldraw/editor'
import { StrokePoint } from './types'

/**
 * Sample a quadratic Bezier curve at parameter t.
 */
function sampleQuadraticBezier(p0: VecLike, p1: VecLike, p2: VecLike, t: number): Vec {
	const mt = 1 - t
	return new Vec(
		mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
		mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
	)
}

/**
 * Get the number of samples for a curve segment based on its length.
 */
function getSamplesForCurve(p0: VecLike, p1: VecLike, p2: VecLike): number {
	// Approximate curve length using control polygon
	const chordLength = Vec.Dist(p0, p2)
	const controlLength = Vec.Dist(p0, p1) + Vec.Dist(p1, p2)
	const approxLength = (chordLength + controlLength) / 2
	// One sample per ~8 pixels, minimum 2
	return Math.max(2, Math.ceil(approxLength / 8))
}

/**
 * Turn an array of stroke points into an array of smoothly sampled points
 * by sampling along the quadratic Bezier curves.
 *
 * @param points - The stroke points returned from perfect-freehand
 * @param closed - Whether the shape is closed
 *
 * @public
 */
export function getSmoothedStrokePoints(points: StrokePoint[], closed = false): Vec[] {
	const len = points.length

	if (len < 2) {
		return points.map((p) => Vec.From(p.point))
	}

	if (len === 2) {
		return [Vec.From(points[0].point), Vec.From(points[1].point)]
	}

	const result: Vec[] = []

	// Helper to average two points
	const avg = (a: VecLike, b: VecLike) => new Vec((a.x + b.x) / 2, (a.y + b.y) / 2)

	if (closed) {
		// Closed path: start at midpoint of first two points
		const start = avg(points[0].point, points[1].point)
		result.push(start)

		// First curve: Q from start, control=points[1], end=mid(points[1], points[2])
		let prevControl = Vec.From(points[1].point)
		let prevEnd = avg(points[1].point, points[2].point)
		const samples = getSamplesForCurve(start, prevControl, prevEnd)
		for (let t = 1; t <= samples; t++) {
			result.push(sampleQuadraticBezier(start, prevControl, prevEnd, t / samples))
		}

		// T curves through the middle points
		for (let i = 2; i < len - 1; i++) {
			const curStart = prevEnd
			// Reflect previous control point about current start to get new control
			const curControl = Vec.Sub(curStart, prevControl).add(curStart)
			const curEnd = avg(points[i].point, points[i + 1].point)

			const segSamples = getSamplesForCurve(curStart, curControl, curEnd)
			for (let t = 1; t <= segSamples; t++) {
				result.push(sampleQuadraticBezier(curStart, curControl, curEnd, t / segSamples))
			}

			prevControl = curControl
			prevEnd = curEnd
		}

		// Curve back to close: to mid(last, first), then to start
		{
			const curStart = prevEnd
			const curControl = Vec.Sub(curStart, prevControl).add(curStart)
			const curEnd = avg(points[len - 1].point, points[0].point)

			const segSamples = getSamplesForCurve(curStart, curControl, curEnd)
			for (let t = 1; t <= segSamples; t++) {
				result.push(sampleQuadraticBezier(curStart, curControl, curEnd, t / segSamples))
			}

			prevControl = curControl
			prevEnd = curEnd
		}

		// Final curve back to start
		{
			const curStart = prevEnd
			const curControl = Vec.Sub(curStart, prevControl).add(curStart)
			const curEnd = start

			const segSamples = getSamplesForCurve(curStart, curControl, curEnd)
			for (let t = 1; t < segSamples; t++) {
				// Don't include final point (it's the start)
				result.push(sampleQuadraticBezier(curStart, curControl, curEnd, t / segSamples))
			}
		}
	} else {
		// Open path: start at first point
		const start = Vec.From(points[0].point)
		result.push(start)

		// First curve: Q from start, control=points[1], end=mid(points[1], points[2])
		let prevControl = Vec.From(points[1].point)
		let prevEnd = avg(points[1].point, points[2].point)
		const samples = getSamplesForCurve(start, prevControl, prevEnd)
		for (let t = 1; t <= samples; t++) {
			result.push(sampleQuadraticBezier(start, prevControl, prevEnd, t / samples))
		}

		// T curves through the middle points
		for (let i = 2; i < len - 1; i++) {
			const curStart = prevEnd
			// Reflect previous control point about current start to get new control
			const curControl = Vec.Sub(curStart, prevControl).add(curStart)
			const curEnd = avg(points[i].point, points[i + 1].point)

			const segSamples = getSamplesForCurve(curStart, curControl, curEnd)
			for (let t = 1; t <= segSamples; t++) {
				result.push(sampleQuadraticBezier(curStart, curControl, curEnd, t / segSamples))
			}

			prevControl = curControl
			prevEnd = curEnd
		}

		// Final line segment to last point
		result.push(Vec.From(points[len - 1].point))
	}

	return result
}

/**
 * Turn an array of stroke points into a path of quadradic curves.
 *
 * @param points - The stroke points returned from perfect-freehand
 * @param closed - Whether the shape is closed
 *
 * @public
 */
export function getSvgPathFromStrokePoints(points: StrokePoint[], closed = false): string {
	const len = points.length

	if (len < 2) {
		return ''
	}

	let a = points[0].point
	let b = points[1].point

	if (len === 2) {
		return `M${precise(a)}L${precise(b)}`
	}

	let result = ''

	for (let i = 2, max = len - 1; i < max; i++) {
		a = points[i].point
		b = points[i + 1].point
		result += average(a, b)
	}

	if (closed) {
		// If closed, draw a curve from the last point to the first
		return `M${average(points[0].point, points[1].point)}Q${precise(points[1].point)}${average(
			points[1].point,
			points[2].point
		)}T${result}${average(points[len - 1].point, points[0].point)}${average(
			points[0].point,
			points[1].point
		)}Z`
	} else {
		// If not closed, draw a curve starting at the first point and
		// ending at the midpoint of the last and second-last point, then
		// complete the curve with a line segment to the last point.
		return `M${precise(points[0].point)}Q${precise(points[1].point)}${average(
			points[1].point,
			points[2].point
		)}${points.length > 3 ? 'T' : ''}${result}L${precise(points[len - 1].point)}`
	}
}
