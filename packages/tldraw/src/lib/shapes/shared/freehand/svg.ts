import { average, precise } from '@tldraw/editor'
import { StrokePoint } from './types'

/**
 * Turn an array of stroke points into a path of quadradic curves.
 *
 * @param points - The stroke points returned from perfect-freehand
 * @param closed - Whether the shape is closed
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
