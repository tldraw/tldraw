import { TLDrawShapeSegment, VecModel, lerp } from '@tldraw/editor'

export const interpolateSegments = (
	startSegments: TLDrawShapeSegment[],
	endSegments: TLDrawShapeSegment[],
	progress: number
): TLDrawShapeSegment[] => {
	const startPoints: VecModel[] = []
	const endPoints: VecModel[] = []

	// Extract all points from startSegments and endSegments
	startSegments.forEach((segment) => startPoints.push(...segment.points))
	endSegments.forEach((segment) => endPoints.push(...segment.points))

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
	return [
		{
			type: 'free',
			points: interpolatedPoints,
		},
	]
}

export function interpolateDiscrete<T, K extends keyof T>(
	start: { props: T },
	end: { props: T },
	prop: K,
	progress: number
): T[K] {
	if (progress < 0.5) {
		return start.props[prop]
	}
	return end.props[prop]
}

export function interpolateText<T extends { props: { text: string } }>(
	start: T,
	end: T,
	progress: number
): string {
	if (!start.props.text && end.props.text) {
		// If there isn't text in the start shape, and there is in the end shape,
		// then we can stream it in
		const endTextLength = end.props.text.length
		const textToShowLength = Math.floor(endTextLength * progress)
		return end.props.text.slice(0, textToShowLength)
	}
	// otherwise return the end text if we're halfway through the animation
	return progress > 0.5 ? start.props.text : end.props.text
}
