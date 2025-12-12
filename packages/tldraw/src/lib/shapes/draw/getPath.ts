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

// Helper functions for working with base64 point strings

// Each point = 3 Float16s = 6 bytes = 8 base64 chars
const POINT_B64_LENGTH = 8

// O(1) lookup table for base64 decoding (maps char code -> 6-bit value)
const B64_LOOKUP = new Uint8Array(128)
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (let i = 0; i < 64; i++) {
	B64_LOOKUP[BASE64_CHARS.charCodeAt(i)] = i
}

// Precomputed powers of 2 for Float16 exponents (exp - 15, so indices 0-30 map to 2^-15 to 2^15)
const POW2 = new Float64Array(31)
for (let i = 0; i < 31; i++) {
	POW2[i] = Math.pow(2, i - 15)
}
const POW2_SUBNORMAL = Math.pow(2, -14) / 1024 // For subnormal numbers

// Precomputed mantissa values: 1 + frac/1024 for all 1024 possible frac values
// Avoids division in hot path
const MANTISSA = new Float64Array(1024)
for (let i = 0; i < 1024; i++) {
	MANTISSA[i] = 1 + i / 1024
}

/** Decode a single point (8 base64 chars) starting at the given offset */
function decodePointAt(b64Points: string, charOffset: number): Vec {
	// Decode 8 base64 chars -> 6 bytes -> 3 Float16s using O(1) lookup
	const c0 = B64_LOOKUP[b64Points.charCodeAt(charOffset)]
	const c1 = B64_LOOKUP[b64Points.charCodeAt(charOffset + 1)]
	const c2 = B64_LOOKUP[b64Points.charCodeAt(charOffset + 2)]
	const c3 = B64_LOOKUP[b64Points.charCodeAt(charOffset + 3)]
	const c4 = B64_LOOKUP[b64Points.charCodeAt(charOffset + 4)]
	const c5 = B64_LOOKUP[b64Points.charCodeAt(charOffset + 5)]
	const c6 = B64_LOOKUP[b64Points.charCodeAt(charOffset + 6)]
	const c7 = B64_LOOKUP[b64Points.charCodeAt(charOffset + 7)]

	// 4 base64 chars -> 24 bits -> 3 bytes
	const bitmap1 = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3
	const bitmap2 = (c4 << 18) | (c5 << 12) | (c6 << 6) | c7

	// Extract Float16 bits directly (little-endian byte order)
	// bitmap1 = [byte0:8][byte1:8][byte2:8], bitmap2 = [byte3:8][byte4:8][byte5:8]
	// xBits = byte0 | (byte1 << 8), yBits = byte2 | (byte3 << 8), zBits = byte4 | (byte5 << 8)
	const xBits = ((bitmap1 >> 16) & 0xff) | (bitmap1 & 0xff00)
	const yBits = (bitmap1 & 0xff) | ((bitmap2 >> 8) & 0xff00)
	const zBits = ((bitmap2 >> 8) & 0xff) | ((bitmap2 << 8) & 0xff00)

	return new Vec(float16BitsToNumber(xBits), float16BitsToNumber(yBits), float16BitsToNumber(zBits))
}

/** Convert Float16 bits to a number - optimized with lookup tables */
function float16BitsToNumber(bits: number): number {
	const sign = bits >> 15
	const exp = (bits >> 10) & 0x1f
	const frac = bits & 0x3ff

	if (exp === 0) {
		// Subnormal or zero - rare case
		return sign ? -frac * POW2_SUBNORMAL : frac * POW2_SUBNORMAL
	}
	if (exp === 31) {
		// Infinity or NaN - very rare
		return frac ? NaN : sign ? -Infinity : Infinity
	}
	// Normal case - two table lookups, one multiply, no division
	const magnitude = POW2[exp] * MANTISSA[frac]
	return sign ? -magnitude : magnitude
}

/** Convert a number to Float16 bits */
function numberToFloat16Bits(value: number): number {
	if (value === 0) return Object.is(value, -0) ? 0x8000 : 0
	if (!Number.isFinite(value)) {
		if (Number.isNaN(value)) return 0x7e00
		return value > 0 ? 0x7c00 : 0xfc00
	}

	const sign = value < 0 ? 1 : 0
	value = Math.abs(value)

	// Find exponent and mantissa
	const exp = Math.floor(Math.log2(value))
	const expBiased = exp + 15

	if (expBiased >= 31) {
		// Overflow to infinity
		return (sign << 15) | 0x7c00
	}
	if (expBiased <= 0) {
		// Subnormal or underflow
		const frac = Math.round(value * Math.pow(2, 14) * 1024)
		return (sign << 15) | (frac & 0x3ff)
	}

	// Normal number
	const mantissa = value / Math.pow(2, exp) - 1
	const frac = Math.round(mantissa * 1024)
	return (sign << 15) | (expBiased << 10) | (frac & 0x3ff)
}

/** Encode a single point (x, y, z) to 8 base64 chars */
function encodePoint(x: number, y: number, z: number): string {
	const xBits = numberToFloat16Bits(x)
	const yBits = numberToFloat16Bits(y)
	const zBits = numberToFloat16Bits(z)

	// Convert Float16 bits to 6 bytes (little-endian)
	const b0 = xBits & 0xff
	const b1 = (xBits >> 8) & 0xff
	const b2 = yBits & 0xff
	const b3 = (yBits >> 8) & 0xff
	const b4 = zBits & 0xff
	const b5 = (zBits >> 8) & 0xff

	// Convert 6 bytes to 8 base64 chars
	const bitmap1 = (b0 << 16) | (b1 << 8) | b2
	const bitmap2 = (b3 << 16) | (b4 << 8) | b5

	return (
		BASE64_CHARS[(bitmap1 >> 18) & 0x3f] +
		BASE64_CHARS[(bitmap1 >> 12) & 0x3f] +
		BASE64_CHARS[(bitmap1 >> 6) & 0x3f] +
		BASE64_CHARS[bitmap1 & 0x3f] +
		BASE64_CHARS[(bitmap2 >> 18) & 0x3f] +
		BASE64_CHARS[(bitmap2 >> 12) & 0x3f] +
		BASE64_CHARS[(bitmap2 >> 6) & 0x3f] +
		BASE64_CHARS[bitmap2 & 0x3f]
	)
}

export function getLastPointFromB64(b64Points: string): Vec | null {
	if (b64Points.length < POINT_B64_LENGTH) return null
	return decodePointAt(b64Points, b64Points.length - POINT_B64_LENGTH)
}

export function getFirstPointFromB64(b64Points: string): Vec | null {
	if (b64Points.length < POINT_B64_LENGTH) return null
	return decodePointAt(b64Points, 0)
}

export function getPointAtIndexFromB64(b64Points: string, index: number): Vec | null {
	const charOffset = index * POINT_B64_LENGTH
	if (charOffset < 0 || charOffset + POINT_B64_LENGTH > b64Points.length) return null
	return decodePointAt(b64Points, charOffset)
}

/** @internal */
export function createB64FromPoints(points: VecLike[]): string {
	const flatPoints = points.flatMap((p) => [p.x, p.y, p.z ?? 0.5])
	return float16ArrayToBase64(new Float16Array(flatPoints))
}

/** @internal */
export function createB64FromSinglePoint(point: VecLike): string {
	return encodePoint(point.x, point.y, point.z ?? 0.5)
}

/** @internal */
export function appendPointToB64(b64Points: string, newPoint: VecLike): string {
	// O(1) string concatenation instead of O(n) decode-modify-encode
	return b64Points + encodePoint(newPoint.x, newPoint.y, newPoint.z ?? 0.5)
}

/** @internal */
export function replaceLastPointInB64(b64Points: string, newPoint: VecLike): string {
	// O(1) slice + concat instead of O(n) decode-modify-encode
	if (b64Points.length < POINT_B64_LENGTH) {
		return encodePoint(newPoint.x, newPoint.y, newPoint.z ?? 0.5)
	}
	return (
		b64Points.slice(0, -POINT_B64_LENGTH) + encodePoint(newPoint.x, newPoint.y, newPoint.z ?? 0.5)
	)
}

/** @internal */
export function getDistanceBetweenB64Points(b64Points1: string, b64Points2: string): number {
	const point1 = getLastPointFromB64(b64Points1)
	const point2 = getFirstPointFromB64(b64Points2)
	if (!point1 || !point2) return 0
	return Vec.Dist(point1, point2)
}

/** @internal */
export function getDistanceFromLastPoint(b64Points: string, point: VecLike): number {
	const lastPoint = getLastPointFromB64(b64Points)
	if (!lastPoint) return 0
	return Vec.Dist(lastPoint, point)
}

/** @internal */
export function createSegmentFromPoints(
	type: 'free' | 'straight',
	points: VecLike[]
): TLDrawShapeSegment {
	return {
		type,
		points: createB64FromPoints(points),
	}
}

/** @internal */
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
