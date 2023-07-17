import { VecLike } from '../primitives/Vec2d'
import { average, precise } from '../primitives/utils'

/**
 * Turn an array of points into a path of quadradic curves.
 *
 * @param points - The points returned from perfect-freehand
 * @param closed - Whether the stroke is closed
 *
 * @public
 */
export function getSvgPathFromPoints(points: VecLike[], closed = true): string {
	const len = points.length

	if (len < 2) {
		return ''
	}

	let a = points[0]
	let b = points[1]

	if (len === 2) {
		// If only two points, just draw a line
		return `M${precise(a)}L${precise(b)}`
	}

	let result = ''

	for (let i = 2, max = len - 1; i < max; i++) {
		a = points[i]
		b = points[i + 1]
		result += average(a, b)
	}

	if (closed) {
		// If closed, draw a curve from the last point to the first
		return `M${average(points[0], points[1])}Q${precise(points[1])}${average(
			points[1],
			points[2]
		)}T${result}${average(points[len - 1], points[0])}${average(points[0], points[1])}Z`
	} else {
		// If not closed, draw a curve starting at the first point and
		// ending at the midpoint of the last and second-last point, then
		// complete the curve with a line segment to the last point.
		return `M${precise(points[0])}Q${precise(points[1])}${average(points[1], points[2])}${
			points.length > 3 ? 'T' : ''
		}${result}L${precise(points[len - 1])}`
	}
}
