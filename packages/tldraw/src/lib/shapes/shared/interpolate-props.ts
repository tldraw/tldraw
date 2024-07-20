import { TLDrawShapeSegment, VecModel, lerp } from '@tldraw/editor'

export const interpolateSegments = (
	startSegments: TLDrawShapeSegment[],
	endSegments: TLDrawShapeSegment[],
	progress: number
): TLDrawShapeSegment[] => {
	const interpolatedSegments: TLDrawShapeSegment[] = []

	const maxLength = Math.max(startSegments.length, endSegments.length)

	for (let i = 0; i < maxLength; i++) {
		const startSegment = startSegments[i] || startSegments[startSegments.length - 1]
		const endSegment = endSegments[i] || endSegments[endSegments.length - 1]

		const startPoints = startSegment.points
		const endPoints = endSegment.points

		const pointsToUseStart: VecModel[] = []
		const pointsToUseEnd: VecModel[] = []

		if (startPoints.length > endPoints.length) {
			for (let j = 0; j < startPoints.length; j++) {
				pointsToUseStart.push(startPoints[j])
				pointsToUseEnd.push(endPoints[j] ? endPoints[j] : endPoints[endPoints.length - 1])
			}
		} else if (endPoints.length > startPoints.length) {
			for (let j = 0; j < endPoints.length; j++) {
				pointsToUseEnd.push(endPoints[j])
				pointsToUseStart.push(startPoints[j] ? startPoints[j] : startPoints[startPoints.length - 1])
			}
		} else if (startPoints.length === endPoints.length) {
			pointsToUseStart.push(...startPoints)
			pointsToUseEnd.push(...endPoints)
		}

		const interpolatedPoints = pointsToUseStart.map((point, k) => {
			// check if z is defined, if not default to 0.5
			let z = 0.5
			if (pointsToUseEnd[k].z && point.z) {
				z = lerp(point.z, pointsToUseEnd[k].z as number, progress)
			}
			return {
				x: lerp(point.x, pointsToUseEnd[k].x, progress),
				y: lerp(point.y, pointsToUseEnd[k].y, progress),
				z,
			}
		})
		interpolatedSegments.push({
			type: progress > 0.5 ? endSegment.type : startSegment.type,
			points: interpolatedPoints,
		})
	}

	return interpolatedSegments
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

export function interpolateText<T extends { props: { text?: string } }>(
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
	// Otherwise, just return the start text (or an empty string if it's undefined)
	return start.props.text || ''
}
