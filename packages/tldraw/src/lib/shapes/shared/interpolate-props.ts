import { lerp, TLDrawShapeSegment, VecModel } from '@tldraw/editor'
import { getPointsFromSegments } from '../draw/getPath'

/** @public */
export const interpolateSegments = (
	startSegments: TLDrawShapeSegment[],
	endSegments: TLDrawShapeSegment[],
	progress: number
): TLDrawShapeSegment[] => {
	// Extract all points from startSegments and endSegments
	const startPoints = getPointsFromSegments(startSegments).map((v) => v.toJson())
	const endPoints = getPointsFromSegments(endSegments).map((v) => v.toJson())

	const maxLength = Math.max(startPoints.length, endPoints.length)
	const pointsToUseStart: VecModel[] = []
	const pointsToUseEnd: VecModel[] = []

	// Ensure both arrays have the same length
	for (let i = 0; i < maxLength; i++) {
		pointsToUseStart.push(startPoints[i] || startPoints[startPoints.length - 1])
		pointsToUseEnd.push(endPoints[i] || endPoints[endPoints.length - 1])
	}

	// Interpolate points
	const interpolatedPoints = pointsToUseStart.map((point, k) => {
		let z = 0.5
		if (pointsToUseEnd[k].z !== undefined && point.z !== undefined) {
			z = lerp(point.z, pointsToUseEnd[k].z as number, progress)
		}
		return {
			x: lerp(point.x, pointsToUseEnd[k].x, progress),
			y: lerp(point.y, pointsToUseEnd[k].y, progress),
			z,
		}
	})
	// Return all interpolated points in a single segment
	// Convert points back to segment format (firstPoint + deltas)
	if (interpolatedPoints.length === 0) {
		return [
			{
				type: 'free' as const,
				firstPoint: { x: 0, y: 0 },
				points: [],
			},
		]
	}

	const firstPoint = interpolatedPoints[0]
	const isPen = firstPoint.z !== undefined
	const deltas: number[] = []

	if (isPen) {
		let px = firstPoint.x
		let py = firstPoint.y
		let pz = firstPoint.z ?? 0.5

		for (let i = 1; i < interpolatedPoints.length; i++) {
			const point = interpolatedPoints[i]
			const dx = point.x - px
			const dy = point.y - py
			const dz = (point.z ?? 0.5) - pz
			deltas.push(Math.round(dx * 10))
			deltas.push(Math.round(dy * 10))
			deltas.push(Math.round(dz * 10))
			px += dx
			py += dy
			pz += dz
		}
	} else {
		let px = firstPoint.x
		let py = firstPoint.y

		for (let i = 1; i < interpolatedPoints.length; i++) {
			const point = interpolatedPoints[i]
			const dx = point.x - px
			const dy = point.y - py
			deltas.push(Math.round(dx * 10))
			deltas.push(Math.round(dy * 10))
			px += dx
			py += dy
		}
	}

	return [
		{
			type: 'free' as const,
			firstPoint: isPen
				? { x: firstPoint.x, y: firstPoint.y, z: firstPoint.z ?? 0.5 }
				: { x: firstPoint.x, y: firstPoint.y },
			points: deltas,
		},
	]
}
