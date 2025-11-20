import {
	EASINGS,
	PI,
	SIN,
	TLDefaultDashStyle,
	TLDrawShape,
	TLDrawShapeSegment,
	Vec,
	modulate,
} from '@tldraw/editor'
import { StrokeOptions } from '../shared/freehand/types'

const PEN_EASING = (t: number) => t * 0.65 + SIN((t * PI) / 2) * 0.35

const simulatePressureSettings = (strokeWidth: number): StrokeOptions => {
	return {
		size: strokeWidth,
		thinning: 0.5,
		streamline: modulate(strokeWidth, [9, 16], [0.64, 0.74], true), // 0.62 + ((1 + strokeWidth) / 8) * 0.06,
		smoothing: 0.62,
		easing: EASINGS.easeOutSine,
		simulatePressure: true,
	}
}

const realPressureSettings = (strokeWidth: number): StrokeOptions => {
	return {
		size: 1 + strokeWidth * 1.2,
		thinning: 0.62,
		streamline: 0.62,
		smoothing: 0.62,
		simulatePressure: false,
		easing: PEN_EASING,
	}
}

const solidSettings = (strokeWidth: number): StrokeOptions => {
	return {
		size: strokeWidth,
		thinning: 0,
		streamline: modulate(strokeWidth, [9, 16], [0.64, 0.74], true), // 0.62 + ((1 + strokeWidth) / 8) * 0.06,
		smoothing: 0.62,
		simulatePressure: false,
		easing: EASINGS.linear,
	}
}

const solidRealPressureSettings = (strokeWidth: number): StrokeOptions => {
	return {
		size: strokeWidth,
		thinning: 0,
		streamline: 0.62,
		smoothing: 0.62,
		simulatePressure: false,
		easing: EASINGS.linear,
	}
}

export function getHighlightFreehandSettings({
	strokeWidth,
	showAsComplete,
}: {
	strokeWidth: number
	showAsComplete: boolean
}): StrokeOptions {
	return {
		size: 1 + strokeWidth,
		thinning: 0,
		streamline: 0.5,
		smoothing: 0.5,
		simulatePressure: false,
		easing: EASINGS.easeOutSine,
		last: showAsComplete,
	}
}

export function getFreehandOptions(
	shapeProps: { dash: TLDefaultDashStyle; isPen: boolean; isComplete: boolean },
	strokeWidth: number,
	forceComplete: boolean,
	forceSolid: boolean
): StrokeOptions {
	const last = shapeProps.isComplete || forceComplete

	if (forceSolid) {
		if (shapeProps.isPen) {
			return { ...solidRealPressureSettings(strokeWidth), last }
		} else {
			return { ...solidSettings(strokeWidth), last }
		}
	}

	if (shapeProps.dash === 'draw') {
		if (shapeProps.isPen) {
			return { ...realPressureSettings(strokeWidth), last }
		} else {
			return { ...simulatePressureSettings(strokeWidth), last }
		}
	}

	return { ...solidSettings(strokeWidth), last }
}

export function getPointsFromSegments(segments: TLDrawShapeSegment[]) {
	const points: Vec[] = []

	for (const segment of segments) {
		const isPen = segment.firstPoint.z !== undefined

		// Reconstruct points from firstPoint + deltas
		const reconstructedPoints: Vec[] = []

		// Start with the first point
		reconstructedPoints.push(Vec.Cast(segment.firstPoint))

		// Reconstruct remaining points from deltas
		if (isPen) {
			// Pen format: [dx, dy, dz, dx, dy, dz, ...]
			let px = segment.firstPoint.x
			let py = segment.firstPoint.y
			let pz = segment.firstPoint.z ?? 0.5

			for (let i = 0; i < segment.points.length; i += 3) {
				const dx = segment.points[i] / 10
				const dy = segment.points[i + 1] / 10
				const dz = segment.points[i + 2] / 10
				px += dx
				py += dy
				pz += dz
				reconstructedPoints.push(new Vec(px, py, pz))
			}
		} else {
			// Non-pen format: [dx, dy, dx, dy, ...]
			let px = segment.firstPoint.x
			let py = segment.firstPoint.y

			for (let i = 0; i < segment.points.length; i += 2) {
				const dx = segment.points[i] / 10
				const dy = segment.points[i + 1] / 10
				px += dx
				py += dy
				reconstructedPoints.push(new Vec(px, py))
			}
		}

		if (segment.type === 'free' || reconstructedPoints.length < 2) {
			points.push(...reconstructedPoints)
		} else {
			// For straight segments, interpolate between first and last point
			const firstPoint = reconstructedPoints[0]
			const lastPoint = reconstructedPoints[reconstructedPoints.length - 1]
			const pointsToInterpolate = Math.max(4, Math.floor(Vec.Dist(firstPoint, lastPoint) / 16))
			points.push(...Vec.PointsBetween(firstPoint, lastPoint, pointsToInterpolate))
		}
	}

	return points
}

export function getDrawShapeStrokeDashArray(
	shape: TLDrawShape,
	strokeWidth: number,
	dotAdjustment: number
) {
	return {
		draw: 'none',
		solid: `none`,
		dotted: `${dotAdjustment} ${strokeWidth * 2}`,
		dashed: `${strokeWidth * 2} ${strokeWidth * 2}`,
	}[shape.props.dash]
}
