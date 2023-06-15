import { StrokePoint, toDomPrecision, Vec2d, VecLike } from '@tldraw/primitives'

/** @internal */
export function getPointerInfo(e: React.PointerEvent | PointerEvent, container: HTMLElement) {
	;(e as any).isKilled = true

	const { top, left } = container.getBoundingClientRect()

	return {
		point: {
			x: e.clientX - left,
			y: e.clientY - top,
			z: e.pressure,
		},
		shiftKey: e.shiftKey,
		altKey: e.altKey,
		ctrlKey: e.metaKey || e.ctrlKey,
		pointerId: e.pointerId,
		button: e.button,
		isPen: e.pointerType === 'pen',
	}
}

function precise(A: VecLike) {
	return `${toDomPrecision(A.x)},${toDomPrecision(A.y)} `
}

function average(A: VecLike, B: VecLike) {
	return `${toDomPrecision((A.x + B.x) / 2)},${toDomPrecision((A.y + B.y) / 2)} `
}

/**
 * Turn an array of points into a path of quadradic curves.
 *
 * @param points - The points returned from perfect-freehand
 * @param closed - Whether the stroke is closed
 * @public
 */
export function getSvgPathFromStroke(points: Vec2d[], closed = true): string {
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

/**
 * Turn an array of stroke points into a path of quadradic curves.
 *
 * @param points - The stroke points returned from perfect-freehand
 * @param closed - Whether the shape is closed
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
