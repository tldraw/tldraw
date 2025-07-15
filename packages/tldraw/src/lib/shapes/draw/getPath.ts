import {
	EASINGS,
	PI,
	SIN,
	TLDefaultDashStyle,
	TLDrawShape,
	TLDrawShapeSegment,
	Vec,
	VecLike,
	base64ToFloat16Array,
	float16ArrayToBase64,
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

export function b64PointsToVecs(b64Points: string) {
	const points = base64ToFloat16Array(b64Points)
	const result: Vec[] = []
	for (let i = 0; i < points.length; i += 3) {
		const x = points[i]
		const y = points[i + 1]
		const z = points[i + 2]
		result.push(Vec.Cast({ x, y, z }))
	}
	return result
}

export function getPointsFromSegments(segments: TLDrawShapeSegment[]) {
	const points: Vec[] = []

	for (const segment of segments) {
		const _points = b64PointsToVecs(segment.points)

		if (segment.type === 'free' || _points.length < 2 * 8) {
			points.push(..._points.map(Vec.Cast))
		} else {
			const pointsToInterpolate = Math.max(4, Math.floor(Vec.Dist(_points[0], _points[1]) / 16))
			points.push(...Vec.PointsBetween(_points[0], _points[1], pointsToInterpolate))
		}
	}

	return points
}

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

// Helper functions for working with base64 point strings

export function getLastPointFromB64(b64Points: string): Vec | null {
	const points = b64PointsToVecs(b64Points)
	return points.length > 0 ? points[points.length - 1] : null
}

export function getFirstPointFromB64(b64Points: string): Vec | null {
	const points = b64PointsToVecs(b64Points)
	return points.length > 0 ? points[0] : null
}

export function getPointAtIndexFromB64(b64Points: string, index: number): Vec | null {
	const points = b64PointsToVecs(b64Points)
	return index >= 0 && index < points.length ? points[index] : null
}

export function createB64FromPoints(points: VecLike[]): string {
	const flatPoints = points.flatMap((p) => [p.x, p.y, p.z ?? 0.5])
	return float16ArrayToBase64(new Float16Array(flatPoints))
}

export function createB64FromSinglePoint(point: VecLike): string {
	return float16ArrayToBase64(new Float16Array([point.x, point.y, point.z ?? 0.5]))
}

export function appendPointToB64(b64Points: string, newPoint: VecLike): string {
	const existingPoints = b64PointsToVecs(b64Points)
	existingPoints.push(Vec.Cast(newPoint))
	return createB64FromPoints(existingPoints)
}

export function replaceLastPointInB64(b64Points: string, newPoint: VecLike): string {
	const points = b64PointsToVecs(b64Points)
	if (points.length === 0) return createB64FromSinglePoint(newPoint)
	points[points.length - 1] = Vec.Cast(newPoint)
	return createB64FromPoints(points)
}

export function getDistanceBetweenB64Points(b64Points1: string, b64Points2: string): number {
	const point1 = getLastPointFromB64(b64Points1)
	const point2 = getFirstPointFromB64(b64Points2)
	if (!point1 || !point2) return 0
	return Vec.Dist(point1, point2)
}

export function getDistanceFromLastPoint(b64Points: string, point: VecLike): number {
	const lastPoint = getLastPointFromB64(b64Points)
	if (!lastPoint) return 0
	return Vec.Dist(lastPoint, point)
}

export function createSegmentFromPoints(
	type: 'free' | 'straight',
	points: VecLike[]
): TLDrawShapeSegment {
	return {
		type,
		points: createB64FromPoints(points),
	}
}

export function createSegmentFromTwoPoints(
	type: 'free' | 'straight',
	point1: VecLike,
	point2: VecLike
): TLDrawShapeSegment {
	return {
		type,
		points: createB64FromPoints([point1, point2]),
	}
}
