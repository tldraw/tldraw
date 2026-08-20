import { TLDrawShapeSegment, VecModel, b64Vecs, lerp } from '@tldraw/editor'

/** @public */
export function interpolateSegments(
	startSegments: TLDrawShapeSegment[],
	endSegments: TLDrawShapeSegment[],
	progress: number
): TLDrawShapeSegment[] {
	// Extract all points from startSegments and endSegments
	const startPoints = startSegments.flatMap((segment) =>
		b64Vecs.decodePoints(segment.path, segment.dim)
	)
	const endPoints = endSegments.flatMap((segment) =>
		b64Vecs.decodePoints(segment.path, segment.dim)
	)

	// Pad the shorter array by repeating its last point so both have the same length
	const maxLength = Math.max(startPoints.length, endPoints.length)
	const interpolatedPoints: VecModel[] = []
	for (let i = 0; i < maxLength; i++) {
		const start = startPoints[i] || startPoints[startPoints.length - 1]
		const end = endPoints[i] || endPoints[endPoints.length - 1]
		interpolatedPoints.push({
			x: lerp(start.x, end.x, progress),
			y: lerp(start.y, end.y, progress),
			z: start.z !== undefined && end.z !== undefined ? lerp(start.z, end.z, progress) : 0.5,
		})
	}

	// Return all interpolated points in a single segment
	return [
		{
			type: 'free',
			path: b64Vecs.encodePoints(interpolatedPoints),
		},
	]
}
