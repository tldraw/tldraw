import {
	EASINGS,
	PI,
	SIN,
	TLDefaultDashStyle,
	TLDrawShape,
	TLDrawShapeSegment,
	Vec,
	base64ToFloat16Array,
	modulate,
} from '@tldraw/editor'
import { StrokeOptions } from '../shared/freehand/types'

// Re-export all b64 helpers for backwards compatibility
export {
	appendPointToB64,
	createB64FromPoints,
	createB64FromSinglePoint,
	createSegmentFromPoints,
	createSegmentFromTwoPoints,
	getDistanceBetweenB64Points,
	getDistanceFromLastPoint,
	getFirstPointFromB64,
	getLastPointFromB64,
	getPointAtIndexFromB64,
	replaceLastPointInB64,
} from './b64-helpers'

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

/** @internal */
export function b64PointsToVecs(b64Points: string) {
	const points = base64ToFloat16Array(b64Points)
	const result: Vec[] = []
	for (let i = 0; i < points.length; i += 3) {
		result.push(new Vec(points[i], points[i + 1], points[i + 2]))
	}
	return result
}

/** @public */
export function getPointsFromDrawSegment(
	segment: TLDrawShapeSegment,
	scaleX = 1,
	scaleY = 1,
	points: Vec[] = []
) {
	const _points = b64PointsToVecs(segment.points)

	// Apply scale factors (used for lazy resize and flipping)
	if (scaleX !== 1 || scaleY !== 1) {
		for (const point of _points) {
			point.x *= scaleX
			point.y *= scaleY
		}
	}

	if (segment.type === 'free' || _points.length < 2 * 8) {
		points.push(..._points.map(Vec.Cast))
	} else {
		const pointsToInterpolate = Math.max(4, Math.floor(Vec.Dist(_points[0], _points[1]) / 16))
		points.push(...Vec.PointsBetween(_points[0], _points[1], pointsToInterpolate))
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

/** @internal */
export function forEachMutablePoint(
	cb: (point: Vec, prevPoint: Vec | null) => void,
	segments: TLDrawShapeSegment[]
) {
	const vec = new Vec()
	const prevVec = new Vec()
	for (let j = 0; j < segments.length; j++) {
		const segment = segments[j]
		const points = base64ToFloat16Array(segment.points)
		for (let i = 0; i < points.length; i += 3) {
			vec.x = points[i]
			vec.y = points[i + 1]
			vec.z = points[i + 2]
			cb(vec, j === 0 && i === 0 ? null : prevVec)
			prevVec.setTo(vec)
		}
	}
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
