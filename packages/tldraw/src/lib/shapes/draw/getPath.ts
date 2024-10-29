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
		if (segment.type === 'free' || segment.points.length < 2) {
			points.push(...segment.points.map(Vec.Cast))
		} else {
			const pointsToInterpolate = Math.max(
				4,
				Math.floor(Vec.Dist(segment.points[0], segment.points[1]) / 16)
			)
			points.push(...Vec.PointsBetween(segment.points[0], segment.points[1], pointsToInterpolate))
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
