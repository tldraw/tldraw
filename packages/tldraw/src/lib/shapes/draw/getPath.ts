import {
	EASINGS,
	PI,
	SIN,
	TLDefaultDashStyle,
	TLDrawShape,
	TLDrawShapeSegment,
	Vec,
	VecModel,
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

// Most-recent decoded path. Drawing extends the same path on every pointer
// move; this lets us decode only the new suffix rather than re-decoding the
// entire stroke. Consumers MUST treat the returned array as read-only.
let _decodeCache: { path: string; points: VecModel[] } | null = null

function decodePointsCached(path: string): VecModel[] {
	if (path === '') return []
	const cache = _decodeCache
	if (cache !== null) {
		if (cache.path === path) return cache.points
		if (path.length > cache.path.length && path.startsWith(cache.path)) {
			b64Vecs.appendDecodedSuffix(cache.points, cache.path, path)
			_decodeCache = { path, points: cache.points }
			return cache.points
		}
	}
	const points = b64Vecs.decodePoints(path)
	_decodeCache = { path, points }
	return points
}

/** @public */
export function getPointsFromDrawSegment(
	segment: TLDrawShapeSegment,
	scaleX: number,
	scaleY: number,
	points: Vec[] = []
) {
	const _points = decodePointsCached(segment.path)
	const needScale = scaleX !== 1 || scaleY !== 1

	if (segment.type === 'free' || _points.length < 2) {
		if (needScale) {
			for (let i = 0; i < _points.length; i++) {
				const p = _points[i]
				points.push(new Vec(p.x * scaleX, p.y * scaleY, p.z))
			}
		} else {
			for (let i = 0; i < _points.length; i++) {
				points.push(Vec.From(_points[i]))
			}
		}
	} else {
		// A B <interpolated points> D
		const p0 = _points[0]
		const p1 = _points[1]
		const A = needScale ? new Vec(p0.x * scaleX, p0.y * scaleY, p0.z) : Vec.From(p0)
		const D = needScale ? new Vec(p1.x * scaleX, p1.y * scaleY, p1.z) : Vec.From(p1)
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
	return {
		draw: 'none',
		solid: `none`,
		dotted: `${dotAdjustment} ${strokeWidth * 2}`,
		dashed: `${strokeWidth * 2} ${strokeWidth * 2}`,
		none: `none`,
	}[shape.props.dash]
}
