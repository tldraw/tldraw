import {
	EASINGS,
	PI,
	SIN,
	TLDefaultDashStyle,
	TLDrawShape,
	TLDrawShapeSegment,
	Vec,
	b64Vecs,
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
	const settings = forceSolid
		? shapeProps.isPen
			? solidRealPressureSettings
			: solidSettings
		: shapeProps.dash === 'draw'
			? shapeProps.isPen
				? realPressureSettings
				: simulatePressureSettings
			: solidSettings
	return { ...settings(strokeWidth), last }
}

/** @public */
export function getPointsFromDrawSegment(
	segment: TLDrawShapeSegment,
	scaleX: number,
	scaleY: number,
	points: Vec[] = []
) {
	const _points = b64Vecs.decodePoints(segment.path, segment.dim)

	// Apply scale factors (used for lazy resize and flipping)
	if (scaleX !== 1 || scaleY !== 1) {
		for (const point of _points) {
			point.x *= scaleX
			point.y *= scaleY
		}
	}

	if (segment.type === 'free' || _points.length < 2) {
		points.push(..._points.map(Vec.From))
	} else {
		// A B <interpolated points> D
		const A = Vec.From(_points[0])
		const D = Vec.From(_points[1])
		const dist = Vec.Dist(D, A)
		if (dist === 0) {
			points.push(A)
		} else {
			const uni = Vec.Tan(D, A)
			const nudgeDist = Math.min(1, Math.floor(dist / 4))
			const B = Vec.Add(A, Vec.Mul(uni, nudgeDist))
			const C = Vec.Add(D, Vec.Mul(uni, -nudgeDist))
			const interpolatedPointsCount = Math.max(4, Math.floor(dist / 16))
			points.push(A, ...Vec.PointsBetween(B, C, interpolatedPointsCount, EASINGS.easeInOutCubic), D)
		}
	}

	return points
}

/** @public */
export function getPointsFromDrawSegments(segments: TLDrawShapeSegment[], scaleX = 1, scaleY = 1) {
	const points: Vec[] = []

	for (const segment of segments) {
		getPointsFromDrawSegment(segment, scaleX, scaleY, points)
	}

	return points
}

export function getDrawShapeStrokeDashArray(
	shape: TLDrawShape,
	strokeWidth: number,
	dotAdjustment: number
) {
	switch (shape.props.dash) {
		case 'dotted':
			return `${dotAdjustment} ${strokeWidth * 2}`
		case 'dashed':
			return `${strokeWidth * 2} ${strokeWidth * 2}`
		default:
			return 'none'
	}
}
