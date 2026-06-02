/** Example copy — keep in sync with `packages/tldraw/src/test/helpers/nestedClipMask.ts`. */
import { intersectLineSegmentLineSegment, VecLike } from '@tldraw/editor'

/**
 * Pre-fix `intersectPolygonPolygon`: Sutherland–Hodgman against finite clip edges
 * (segment–segment) instead of half-planes. Produces the diagonal clip in nested frames.
 */

const EPSILON = 1e-10

function isInsideClipHalfPlane(
	point: VecLike,
	edgeStart: VecLike,
	edgeEnd: VecLike,
	precision = EPSILON
): boolean {
	const cross =
		(edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) -
		(edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x)
	return cross >= -precision
}

function clipByEdge(subject: VecLike[], edgeStart: VecLike, edgeEnd: VecLike): VecLike[] {
	const output: VecLike[] = []
	const n = subject.length
	if (n === 0) return output

	for (let i = 0; i < n; i++) {
		const current = subject[i]
		const previous = subject[(i + n - 1) % n]
		const currentInside = isInsideClipHalfPlane(current, edgeStart, edgeEnd)
		const previousInside = isInsideClipHalfPlane(previous, edgeStart, edgeEnd)

		if (currentInside) {
			if (!previousInside) {
				const hit = intersectLineSegmentLineSegment(previous, current, edgeStart, edgeEnd)
				if (hit) output.push(hit)
			}
			output.push(current)
		} else if (previousInside) {
			const hit = intersectLineSegmentLineSegment(previous, current, edgeStart, edgeEnd)
			if (hit) output.push(hit)
		}
	}

	return output
}

function clipByConvexWindow(subject: VecLike[], window: VecLike[]): VecLike[] {
	let output = subject
	for (let i = 0; i < window.length; i++) {
		output = clipByEdge(output, window[i], window[(i + 1) % window.length])
		if (output.length === 0) return []
	}
	return output
}

export function legacySegmentShIntersect(a: VecLike[], b: VecLike[]): VecLike[] | null {
	if (a.length < 3 || b.length < 3) return null

	const clipped = clipByConvexWindow(a, b)
	if (clipped.length >= 3) return clipped

	const flipped = clipByConvexWindow(b, a)
	return flipped.length >= 3 ? flipped : null
}
