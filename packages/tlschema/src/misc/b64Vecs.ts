import { VecModel } from './geometry-types'

// Pressure value supplied when decoding non-pressure (2D) paths
const DEFAULT_PRESSURE = 0.5

/** Draw segment path encoded with 2 dimensions, XY — the constant pressure Z is dropped. @public */
export const DIM_2D = 2
/** Draw segment path encoded with 3 dimensions, XYZ. @public */
export const DIM_3D = 3

// O(1) lookup table for base64 decoding (maps char code -> 6-bit value)
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64_LOOKUP = new Uint8Array(128)
for (let i = 0; i < 64; i++) {
	B64_LOOKUP[BASE64_CHARS.charCodeAt(i)] = i
}

// Mask for one base64 sextet: the low 6 bits select an index into BASE64_CHARS (0–63).
const SIX_BIT_MASK = 0x3f
// '=' padding character, appended on encode so the output length is a multiple of 4.
const PADDING_CHAR_CODE = '='.charCodeAt(0)

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

function nativeGetFloat16(dataView: DataView, offset: number): number {
	return (dataView as any).getFloat16(offset, true)
}
function fallbackGetFloat16(dataView: DataView, offset: number): number {
	return float16BitsToNumber(dataView.getUint16(offset, true))
}

const getFloat16 =
	typeof (DataView.prototype as any).getFloat16 === 'function'
		? nativeGetFloat16
		: fallbackGetFloat16

function nativeSetFloat16(dataView: DataView, offset: number, value: number): void {
	;(dataView as any).setFloat16(offset, value, true)
}
function fallbackSetFloat16(dataView: DataView, offset: number, value: number): void {
	dataView.setUint16(offset, numberToFloat16Bits(value), true)
}

const setFloat16 =
	typeof (DataView.prototype as any).setFloat16 === 'function'
		? nativeSetFloat16
		: fallbackSetFloat16

function nativeBase64ToUint8Array(base64: string): Uint8Array {
	return Uint8Array.fromBase64(base64)
}

/** @internal */
export function fallbackBase64ToUint8Array(base64: string): Uint8Array {
	// Strip up to 2 '=' padding characters to determine the real byte count.
	// The 2D point layout (8 + 4(n-1) bytes) is not a multiple of 3, so encoded
	// paths can carry padding the original multiple-of-3-only decoder couldn't read.
	const paddedLength = base64.length
	let padding = 0
	if (paddedLength > 0 && base64.charCodeAt(paddedLength - 1) === PADDING_CHAR_CODE) {
		padding++
		if (paddedLength > 1 && base64.charCodeAt(paddedLength - 2) === PADDING_CHAR_CODE) {
			padding++
		}
	}
	const numBytes = Math.floor((paddedLength * 3) / 4) - padding
	const bytes = new Uint8Array(numBytes)
	let byteIndex = 0

	// The reverse of encoding: each 4 chars are 4 six-bit values that pack back into
	// one 24-bit number, which we then read out as 3 bytes (& 255 keeps one byte).
	const fullGroups = Math.floor((paddedLength - padding) / 4) * 4
	for (let i = 0; i < fullGroups; i += 4) {
		const c0 = B64_LOOKUP[base64.charCodeAt(i)]
		const c1 = B64_LOOKUP[base64.charCodeAt(i + 1)]
		const c2 = B64_LOOKUP[base64.charCodeAt(i + 2)]
		const c3 = B64_LOOKUP[base64.charCodeAt(i + 3)]

		const bitmap = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3

		bytes[byteIndex++] = (bitmap >> 16) & 255 // top byte (bits 23–16)
		bytes[byteIndex++] = (bitmap >> 8) & 255 // middle byte (bits 15–8)
		bytes[byteIndex++] = bitmap & 255 // bottom byte (bits 7–0)
	}

	// Final group when padded: 3 valid chars -> 2 bytes, 2 valid chars -> 1 byte.
	if (padding === 1) {
		const c0 = B64_LOOKUP[base64.charCodeAt(fullGroups)]
		const c1 = B64_LOOKUP[base64.charCodeAt(fullGroups + 1)]
		const c2 = B64_LOOKUP[base64.charCodeAt(fullGroups + 2)]
		const bitmap = (c0 << 18) | (c1 << 12) | (c2 << 6)
		bytes[byteIndex++] = (bitmap >> 16) & 255
		bytes[byteIndex++] = (bitmap >> 8) & 255
	} else if (padding === 2) {
		const c0 = B64_LOOKUP[base64.charCodeAt(fullGroups)]
		const c1 = B64_LOOKUP[base64.charCodeAt(fullGroups + 1)]
		const bitmap = (c0 << 18) | (c1 << 12)
		bytes[byteIndex++] = (bitmap >> 16) & 255
	}

	return bytes
}

function nativeUint8ArrayToBase64(uint8Array: Uint8Array): string {
	return uint8Array.toBase64()
}

/** @internal */
export function fallbackUint8ArrayToBase64(uint8Array: Uint8Array): string {
	const len = uint8Array.length
	const fullGroups = Math.floor(len / 3) * 3
	let result = ''

	// base64 represents 3 bytes (24 bits) as 4 characters of 6 bits each. For each
	// group of 3 bytes we pack them into one 24-bit number, then read it back out as
	// four 6-bit slices and use each slice (a value 0–63) to index into the 64-char
	// alphabet. `>> n` shifts the wanted slice down to the bottom; SIX_BIT_MASK then
	// discards everything above those 6 bits.
	for (let i = 0; i < fullGroups; i += 3) {
		const byte1 = uint8Array[i]
		const byte2 = uint8Array[i + 1]
		const byte3 = uint8Array[i + 2]

		const bitmap = (byte1 << 16) | (byte2 << 8) | byte3
		result +=
			BASE64_CHARS[(bitmap >> 18) & SIX_BIT_MASK] + // bits 23–18 (top sextet)
			BASE64_CHARS[(bitmap >> 12) & SIX_BIT_MASK] + // bits 17–12
			BASE64_CHARS[(bitmap >> 6) & SIX_BIT_MASK] + // bits 11–6
			BASE64_CHARS[bitmap & SIX_BIT_MASK] // bits 5–0 (bottom sextet)
	}

	// A trailing 1 or 2 bytes can't fill a whole 4-char group, so we emit only the
	// chars their bits cover and pad the rest with '=' to keep the length a multiple
	// of 4. Standard base64 — matches the native API and Node's Buffer, so a path
	// encoded by the fallback round-trips on a runtime that decodes with the native one.
	const remaining = len - fullGroups
	if (remaining === 1) {
		// 8 bits → 2 sextets (the 2nd only partly filled), then "=="
		const bitmap = uint8Array[fullGroups] << 16
		result +=
			BASE64_CHARS[(bitmap >> 18) & SIX_BIT_MASK] +
			BASE64_CHARS[(bitmap >> 12) & SIX_BIT_MASK] +
			'=='
	} else if (remaining === 2) {
		// 16 bits → 3 sextets (the 3rd only partly filled), then "="
		const bitmap = (uint8Array[fullGroups] << 16) | (uint8Array[fullGroups + 1] << 8)
		result +=
			BASE64_CHARS[(bitmap >> 18) & SIX_BIT_MASK] +
			BASE64_CHARS[(bitmap >> 12) & SIX_BIT_MASK] +
			BASE64_CHARS[(bitmap >> 6) & SIX_BIT_MASK] +
			'='
	}

	return result
}

/**
 * Convert a Uint8Array to base64.
 * Processes bytes in groups of 3 to produce 4 base64 characters.
 *
 * @internal
 */
const uint8ArrayToBase64 =
	typeof Uint8Array.prototype.toBase64 === 'function'
		? nativeUint8ArrayToBase64
		: fallbackUint8ArrayToBase64

/**
 * Convert a base64 string to Uint8Array.
 *
 * @internal
 */
const base64ToUint8Array =
	typeof Uint8Array.fromBase64 === 'function'
		? nativeBase64ToUint8Array
		: fallbackBase64ToUint8Array

/**
 * Convert Float16 bits to a number using optimized lookup tables.
 * Handles normal numbers, subnormal numbers, zero, infinity, and NaN.
 *
 * @param bits - The 16-bit Float16 value to decode
 * @returns The decoded number value
 * @internal
 */
export function float16BitsToNumber(bits: number): number {
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

/**
 * Convert a number to Float16 bits.
 * Handles normal numbers, subnormal numbers, zero, infinity, and NaN.
 *
 * @param value - The number to encode as Float16
 * @returns The 16-bit Float16 representation of the number
 * @internal
 */
export function numberToFloat16Bits(value: number): number {
	if (value === 0) return Object.is(value, -0) ? 0x8000 : 0
	if (!Number.isFinite(value)) {
		if (Number.isNaN(value)) return 0x7e00
		return value > 0 ? 0x7c00 : 0xfc00
	}

	const sign = value < 0 ? 1 : 0
	value = Math.abs(value)

	// Find exponent and mantissa
	const exp = Math.floor(Math.log2(value))
	let expBiased = exp + 15

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
	let frac = Math.round(mantissa * 1024)

	// Handle rounding overflow: if frac rounds to 1024, increment exponent
	if (frac >= 1024) {
		frac = 0
		expBiased++
		if (expBiased >= 31) {
			// Overflow to infinity
			return (sign << 15) | 0x7c00
		}
	}

	return (sign << 15) | (expBiased << 10) | frac
}

/**
/*
 * Path format (draw shape version PredictiveEncoding and later)
 *
 * Every coordinate is snapped to a fixed grid of 1/100 unit, which the draw tool
 * already records on (Vec.toFixed), so its input round-trips exactly. Each point is
 * predicted from the last two (constant velocity), and only the prediction error
 * is stored:
 *
 *   residual[i] = (q[i] - q[i-1]) - (q[i-1] - q[i-2])     with q[-1] = q[-2] = 0
 *
 * so the first residual is the first point's absolute value and the second is a
 * plain delta. Residuals are interleaved per point (x, y[, z]), zigzag-mapped to
 * unsigned, and written as little-endian varints straight into the base64
 * alphabet: each char carries 5 value bits plus a continue bit (32). Freehand
 * residuals are mostly < 16, so one char per value is the common case.
 *
 * There is no header or length. A path is append-only: adding a point appends
 * chars and never rewrites earlier ones. Decoding reads values until the string ends.
 *
 * Compared to the Float16 delta format this replaced, paths are ~half the size
 * and don't accumulate error along the stroke, since quantizing happens before
 * differencing.
 */

const GRID = 100
const CONTINUE_BIT = 32
const VALUE_BITS = 31
// A zigzag of a 53-bit integer needs at most 11 five-bit chars.
const MAX_CHARS_PER_POINT = 33

const RESIDUAL_CHAR_CODES = new Uint8Array(64)
for (let i = 0; i < 64; i++) RESIDUAL_CHAR_CODES[i] = BASE64_CHARS.charCodeAt(i)

let encodeBuffer = new Uint8Array(1024)
let encodeLength = 0

// Non-finite input would otherwise poison every later point through the running sums.
function quantize(value: number): number {
	return Number.isFinite(value) ? Math.round(value * GRID) : 0
}

function writeResidual(n: number): void {
	let v = n >= 0 ? n * 2 : -n * 2 - 1
	while (v >= CONTINUE_BIT) {
		// `& VALUE_BITS` is exact past 2^31: ToInt32 keeps the low bits of any safe integer.
		encodeBuffer[encodeLength++] = RESIDUAL_CHAR_CODES[(v & VALUE_BITS) | CONTINUE_BIT]
		v = v < 0x80000000 ? v >>> 5 : Math.floor(v / 32)
	}
	encodeBuffer[encodeLength++] = RESIDUAL_CHAR_CODES[v]
}

const latin1Decoder = typeof TextDecoder === 'function' ? new TextDecoder('latin1') : null

function takeEncodedString(): string {
	const chars = encodeBuffer.subarray(0, encodeLength)
	if (latin1Decoder) return latin1Decoder.decode(chars)
	let result = ''
	for (let i = 0; i < chars.length; i += 8192) {
		result += String.fromCharCode.apply(null, chars.subarray(i, i + 8192) as unknown as number[])
	}
	return result
}

function encodeResidualPath(points: VecModel[], dim: 2 | 3): string {
	if (points.length === 0) return ''
	encodeLength = 0

	let x = 0
	let y = 0
	let z = 0
	let dx = 0
	let dy = 0
	let dz = 0
	for (let i = 0; i < points.length; i++) {
		if (encodeLength + MAX_CHARS_PER_POINT > encodeBuffer.length) {
			const grown = new Uint8Array(encodeBuffer.length * 2)
			grown.set(encodeBuffer)
			encodeBuffer = grown
		}
		const p = points[i]
		const nx = quantize(p.x)
		const ny = quantize(p.y)
		writeResidual(nx - x - dx)
		writeResidual(ny - y - dy)
		dx = nx - x
		dy = ny - y
		x = nx
		y = ny
		if (dim === DIM_3D) {
			const nz = quantize(p.z ?? DEFAULT_PRESSURE)
			writeResidual(nz - z - dz)
			dz = nz - z
			z = nz
		}
	}

	return takeEncodedString()
}

// Decoder cursor, shared so readResidual can return a plain number.
let readIndex = 0

// Reading past the end yields 0 and leaves readIndex > path.length, which callers
// use to detect a truncated point.
function readResidual(path: string): number {
	let char = B64_LOOKUP[path.charCodeAt(readIndex++)]
	let v = char & VALUE_BITS
	let scale = CONTINUE_BIT
	while (char & CONTINUE_BIT) {
		char = B64_LOOKUP[path.charCodeAt(readIndex++)]
		v += (char & VALUE_BITS) * scale
		scale *= CONTINUE_BIT
	}
	return v % 2 === 0 ? v / 2 : -(v + 1) / 2
}

function decodeResidualPath(path: string, dim: 2 | 3, lastOnly: boolean): VecModel[] {
	const result: VecModel[] = []
	const length = path.length
	readIndex = 0

	let x = 0
	let y = 0
	let z = dim === DIM_3D ? 0 : DEFAULT_PRESSURE * GRID
	let dx = 0
	let dy = 0
	let dz = 0
	while (readIndex < length) {
		dx += readResidual(path)
		dy += readResidual(path)
		x += dx
		y += dy
		if (dim === DIM_3D) {
			dz += readResidual(path)
			z += dz
		}
		if (!lastOnly) result.push({ x: x / GRID, y: y / GRID, z: z / GRID })
	}
	if (lastOnly && length > 0) result.push({ x: x / GRID, y: y / GRID, z: z / GRID })
	return result
}

function legacyDeltaEncodePoints3D(points: VecModel[]): string {
	if (points.length === 0) return ''

	// First point: 3 Float32s = 12 bytes
	// Remaining points: 3 Float16s each = 6 bytes each
	const firstPointBytes = 12
	const deltaBytes = (points.length - 1) * 6
	const totalBytes = firstPointBytes + deltaBytes

	const buffer = new Uint8Array(totalBytes)
	const dataView = new DataView(buffer.buffer)

	// First point is stored as Float32 for full precision
	const first = points[0]
	dataView.setFloat32(0, first.x, true) // little-endian
	dataView.setFloat32(4, first.y, true)
	dataView.setFloat32(8, first.z ?? 0.5, true)

	// Subsequent points are Float16 deltas from the previous point
	let prevX = first.x
	let prevY = first.y
	let prevZ = first.z ?? 0.5

	for (let i = 1; i < points.length; i++) {
		const p = points[i]
		const z = p.z ?? 0.5

		const offset = firstPointBytes + (i - 1) * 6
		setFloat16(dataView, offset, p.x - prevX)
		setFloat16(dataView, offset + 2, p.y - prevY)
		setFloat16(dataView, offset + 4, z - prevZ)

		prevX = p.x
		prevY = p.y
		prevZ = z
	}

	return uint8ArrayToBase64(buffer)
}

function legacyDeltaDecodePoints3D(base64: string): VecModel[] {
	if (base64.length === 0) return []

	const bytes = base64ToUint8Array(base64)
	const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	const result: VecModel[] = []

	// First point is Float32 (12 bytes)
	let x = dataView.getFloat32(0, true)
	let y = dataView.getFloat32(4, true)
	let z = dataView.getFloat32(8, true)
	result.push({ x, y, z })

	// Subsequent points are Float16 deltas - accumulate to get absolute positions
	const firstPointBytes = 12
	for (let offset = firstPointBytes; offset < bytes.length; offset += 6) {
		x += getFloat16(dataView, offset)
		y += getFloat16(dataView, offset + 2)
		z += getFloat16(dataView, offset + 4)
		result.push({ x, y, z })
	}

	return result
}

function legacyDeltaEncodePoints2D(points: VecModel[]): string {
	if (points.length === 0) return ''

	const firstPointBytes = 8
	const deltaBytes = (points.length - 1) * 4
	const buffer = new Uint8Array(firstPointBytes + deltaBytes)
	const dataView = new DataView(buffer.buffer)

	const first = points[0]
	dataView.setFloat32(0, first.x, true)
	dataView.setFloat32(4, first.y, true)

	let prevX = first.x
	let prevY = first.y

	for (let i = 1; i < points.length; i++) {
		const p = points[i]
		const offset = firstPointBytes + (i - 1) * 4
		setFloat16(dataView, offset, p.x - prevX)
		setFloat16(dataView, offset + 2, p.y - prevY)
		prevX = p.x
		prevY = p.y
	}

	return uint8ArrayToBase64(buffer)
}

function legacyDeltaDecodePoints2D(base64: string): VecModel[] {
	if (base64.length === 0) return []

	const bytes = base64ToUint8Array(base64)
	const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	const result: VecModel[] = []

	let x = dataView.getFloat32(0, true)
	let y = dataView.getFloat32(4, true)
	result.push({ x, y, z: DEFAULT_PRESSURE })

	const firstPointBytes = 8
	for (let offset = firstPointBytes; offset < bytes.length; offset += 4) {
		x += getFloat16(dataView, offset)
		y += getFloat16(dataView, offset + 2)
		result.push({ x, y, z: DEFAULT_PRESSURE })
	}

	return result
}

/**
 * Utilities for encoding and decoding draw and highlight segment paths. Paths are
 * compact base64-alphabet strings: points snapped to a 1/100 unit grid, stored as
 * prediction residuals. See the format notes in `b64Vecs.ts`.
 *
 * @public
 */
export class b64Vecs {
	/**
	 * Encode a single point (x, y, z) to 8 base64 characters using legacy Float16 encoding.
	 * Each coordinate is encoded as a Float16 value, resulting in 6 bytes total.
	 *
	 * @param x - The x coordinate
	 * @param y - The y coordinate
	 * @param z - The z coordinate
	 * @returns An 8-character base64 string representing the point
	 * @internal
	 */
	static _legacyEncodePoint(x: number, y: number, z: number): string {
		const buffer = new Uint8Array(6)
		const dataView = new DataView(buffer.buffer)

		setFloat16(dataView, 0, x)
		setFloat16(dataView, 2, y)
		setFloat16(dataView, 4, z)

		return uint8ArrayToBase64(buffer)
	}

	/**
	 * Convert an array of VecModels to a base64 string using legacy Float16 encoding.
	 * Uses Float16 encoding for each coordinate (x, y, z). If a point's z value is
	 * undefined, it defaults to 0.5.
	 *
	 * @param points - An array of VecModel objects to encode
	 * @returns A base64-encoded string containing all points
	 * @internal Used only for migrations from legacy format
	 */
	static _legacyEncodePoints(points: VecModel[]): string {
		if (points.length === 0) return ''

		// 3 Float16s per point = 6 bytes per point
		const buffer = new Uint8Array(points.length * 6)
		const dataView = new DataView(buffer.buffer)

		for (let i = 0; i < points.length; i++) {
			const p = points[i]
			const offset = i * 6
			setFloat16(dataView, offset, p.x)
			setFloat16(dataView, offset + 2, p.y)
			setFloat16(dataView, offset + 4, p.z ?? 0.5)
		}

		return uint8ArrayToBase64(buffer)
	}

	/**
	 * Convert a legacy base64 string back to an array of VecModels.
	 * Decodes Float16-encoded coordinates (x, y, z) from the base64 string.
	 *
	 * @param base64 - The base64-encoded string containing point data
	 * @returns An array of VecModel objects decoded from the string
	 * @internal Used only for migrations from legacy format
	 */
	static _legacyDecodePoints(base64: string): VecModel[] {
		const bytes = base64ToUint8Array(base64)
		const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
		const result: VecModel[] = []
		for (let offset = 0; offset < bytes.length; offset += 6) {
			result.push({
				x: getFloat16(dataView, offset),
				y: getFloat16(dataView, offset + 2),
				z: getFloat16(dataView, offset + 4),
			})
		}
		return result
	}

	/**
	 * Encode points in the Float16 delta format used by draw and highlight shapes from
	 * the Base64 migration up to PredictiveEncoding: a Float32 first point, then Float16
	 * deltas. Each delta is taken from the original previous point, so decoding error
	 * accumulates along the stroke.
	 *
	 * @param points - The points to encode
	 * @param dim - `2` drops z, `3` (default) keeps it
	 * @internal Used only by migrations
	 */
	static _legacyDeltaEncodePoints(points: VecModel[], dim?: 2 | 3): string {
		return dim === DIM_2D ? legacyDeltaEncodePoints2D(points) : legacyDeltaEncodePoints3D(points)
	}

	/**
	 * Decode a path written by {@link b64Vecs._legacyDeltaEncodePoints}.
	 *
	 * @param base64 - The legacy delta path
	 * @param dim - `2` supplies z = 0.5, `3` (default) reads z
	 * @internal Used only by migrations
	 */
	static _legacyDeltaDecodePoints(base64: string, dim?: 2 | 3): VecModel[] {
		return dim === DIM_2D ? legacyDeltaDecodePoints2D(base64) : legacyDeltaDecodePoints3D(base64)
	}

	/**
	 * Encode points as a segment path. Coordinates are rounded to the nearest 1/100
	 * unit; non-finite values are stored as 0.
	 *
	 * @param points - An array of VecModel objects to encode
	 * @param dim - `2` drops z (pressure), `3` (default) keeps it; a missing z encodes as 0.5
	 * @returns The encoded path
	 * @public
	 */
	static encodePoints(points: VecModel[], dim?: 2 | 3): string {
		return encodeResidualPath(points, dim === DIM_2D ? DIM_2D : DIM_3D)
	}

	/**
	 * Decode a segment path back to absolute points.
	 *
	 * @param path - A path written by {@link b64Vecs.encodePoints}
	 * @param dim - The dimension the path was encoded with; `2` supplies z = 0.5
	 * @returns The decoded points
	 * @public
	 */
	static decodePoints(path: string, dim?: 2 | 3): VecModel[] {
		return decodeResidualPath(path, dim === DIM_2D ? DIM_2D : DIM_3D, false)
	}

	/**
	 * Get the first point of a segment path without decoding the rest.
	 *
	 * @param path - A path written by {@link b64Vecs.encodePoints}
	 * @param dim - The dimension the path was encoded with; `2` supplies z = 0.5
	 * @returns The first point, or null if the path holds no complete point
	 * @public
	 */
	static decodeFirstPoint(path: string, dim?: 2 | 3): VecModel | null {
		if (path.length === 0) return null
		readIndex = 0
		const x = readResidual(path)
		const y = readResidual(path)
		const z = dim === DIM_2D ? DEFAULT_PRESSURE * GRID : readResidual(path)
		if (readIndex > path.length) return null
		return { x: x / GRID, y: y / GRID, z: z / GRID }
	}

	/**
	 * Get the last point of a segment path. Reads the whole path but allocates only
	 * the result.
	 *
	 * @param path - A path written by {@link b64Vecs.encodePoints}
	 * @param dim - The dimension the path was encoded with; `2` supplies z = 0.5
	 * @returns The last point, or null if the path is empty
	 * @public
	 */
	static decodeLastPoint(path: string, dim?: 2 | 3): VecModel | null {
		return decodeResidualPath(path, dim === DIM_2D ? DIM_2D : DIM_3D, true)[0] ?? null
	}

	/**
	 * Encode points as a 2D segment path. Same as `encodePoints(points, 2)`.
	 *
	 * @param points - The points to encode (z is discarded)
	 * @returns The encoded path
	 * @public
	 */
	static encodePoints2D(points: VecModel[]): string {
		return encodeResidualPath(points, DIM_2D)
	}

	/**
	 * Decode a 2D segment path. Same as `decodePoints(path, 2)`.
	 *
	 * @param path - A 2D path written by {@link b64Vecs.encodePoints}
	 * @returns The decoded points, each with z = 0.5
	 * @public
	 */
	static decodePoints2D(path: string): VecModel[] {
		return decodeResidualPath(path, DIM_2D, false)
	}

	/**
	 * Get the first point of a 2D segment path. Same as `decodeFirstPoint(path, 2)`.
	 *
	 * @param path - A 2D path written by {@link b64Vecs.encodePoints}
	 * @returns The first point with z = 0.5, or null if the path holds no complete point
	 * @public
	 */
	static decodeFirstPoint2D(path: string): VecModel | null {
		return b64Vecs.decodeFirstPoint(path, DIM_2D)
	}

	/**
	 * Get the last point of a 2D segment path. Same as `decodeLastPoint(path, 2)`.
	 *
	 * @param path - A 2D path written by {@link b64Vecs.encodePoints}
	 * @returns The last point with z = 0.5, or null if the path is empty
	 * @public
	 */
	static decodeLastPoint2D(path: string): VecModel | null {
		return b64Vecs.decodeLastPoint(path, DIM_2D)
	}

	/**
	 * Whether a path holds at most one point (a "dot"). Counts value terminators
	 * and stops after the second point starts, so it is cheap enough for the
	 * render path.
	 *
	 * @param path - A path written by {@link b64Vecs.encodePoints}
	 * @param dim - The dimension the path was encoded with
	 * @returns true if the path encodes zero or one points
	 * @public
	 */
	static isSinglePoint(path: string, dim?: 2 | 3): boolean {
		const valuesPerPoint = dim === DIM_2D ? DIM_2D : DIM_3D
		let values = 0
		for (let i = 0; i < path.length; i++) {
			if ((B64_LOOKUP[path.charCodeAt(i)] & CONTINUE_BIT) === 0 && ++values > valuesPerPoint) {
				return false
			}
		}
		return true
	}
}
