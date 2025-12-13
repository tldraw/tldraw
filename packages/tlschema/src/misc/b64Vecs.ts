import { VecModel } from './geometry-types'

// Each point = 3 Float16s = 6 bytes = 8 base64 chars
const POINT_B64_LENGTH = 8

// O(1) lookup table for base64 decoding (maps char code -> 6-bit value)
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64_LOOKUP = new Uint8Array(128)
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

/**
 * Convert a Uint16Array (containing Float16 bits) to base64.
 * Processes bytes in groups of 3 to produce 4 base64 characters.
 *
 * @internal
 */
function uint16ArrayToBase64(uint16Array: Uint16Array): string {
	const uint8Array = new Uint8Array(
		uint16Array.buffer,
		uint16Array.byteOffset,
		uint16Array.byteLength
	)
	let result = ''

	// Process bytes in groups of 3 -> 4 base64 chars
	for (let i = 0; i < uint8Array.length; i += 3) {
		const byte1 = uint8Array[i]
		const byte2 = uint8Array[i + 1] // Always exists for our use case (multiple of 6 bytes)
		const byte3 = uint8Array[i + 2]

		const bitmap = (byte1 << 16) | (byte2 << 8) | byte3
		result +=
			BASE64_CHARS[(bitmap >> 18) & 63] +
			BASE64_CHARS[(bitmap >> 12) & 63] +
			BASE64_CHARS[(bitmap >> 6) & 63] +
			BASE64_CHARS[bitmap & 63]
	}

	return result
}

/**
 * Convert a base64 string to Uint16Array containing Float16 bits.
 * The base64 string must have a length that is a multiple of 4.
 *
 * @param base64 - The base64-encoded string to decode
 * @returns A Uint16Array containing the decoded Float16 bit values
 * @public
 */
function base64ToUint16Array(base64: string): Uint16Array {
	// Calculate exact number of bytes (4 base64 chars = 3 bytes)
	const numBytes = Math.floor((base64.length * 3) / 4)
	const bytes = new Uint8Array(numBytes)
	let byteIndex = 0

	// Process in groups of 4 base64 characters
	for (let i = 0; i < base64.length; i += 4) {
		const c0 = B64_LOOKUP[base64.charCodeAt(i)]
		const c1 = B64_LOOKUP[base64.charCodeAt(i + 1)]
		const c2 = B64_LOOKUP[base64.charCodeAt(i + 2)]
		const c3 = B64_LOOKUP[base64.charCodeAt(i + 3)]

		const bitmap = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3

		bytes[byteIndex++] = (bitmap >> 16) & 255
		bytes[byteIndex++] = (bitmap >> 8) & 255
		bytes[byteIndex++] = bitmap & 255
	}

	return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2)
}

/**
 * Convert Float16 bits to a number using optimized lookup tables.
 * Handles normal numbers, subnormal numbers, zero, infinity, and NaN.
 *
 * @param bits - The 16-bit Float16 value to decode
 * @returns The decoded number value
 */
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

/**
 * Convert a number to Float16 bits.
 * Handles normal numbers, subnormal numbers, zero, infinity, and NaN.
 *
 * @param value - The number to encode as Float16
 * @returns The 16-bit Float16 representation of the number
 * @internal
 */
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
 * Utilities for encoding and decoding points using base64 and Float16 encoding.
 * Provides functions for converting between VecModel arrays and compact base64 strings,
 * as well as individual point encoding/decoding operations.
 *
 * @public
 */
export class b64Vecs {
	/**
	 * Encode a single point (x, y, z) to 8 base64 characters.
	 * Each coordinate is encoded as a Float16 value, resulting in 6 bytes total.
	 *
	 * @param x - The x coordinate
	 * @param y - The y coordinate
	 * @param z - The z coordinate
	 * @returns An 8-character base64 string representing the point
	 */
	static encodePoint(x: number, y: number, z: number): string {
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

	/**
	 * Convert an array of VecModels to a base64 string for compact storage.
	 * Uses Float16 encoding for each coordinate (x, y, z). If a point's z value is
	 * undefined, it defaults to 0.5.
	 *
	 * @param points - An array of VecModel objects to encode
	 * @returns A base64-encoded string containing all points
	 */
	static encodePoints(points: VecModel[]): string {
		const uint16s = new Uint16Array(points.length * 3)
		for (let i = 0; i < points.length; i++) {
			const p = points[i]
			uint16s[i * 3] = numberToFloat16Bits(p.x)
			uint16s[i * 3 + 1] = numberToFloat16Bits(p.y)
			uint16s[i * 3 + 2] = numberToFloat16Bits(p.z ?? 0.5)
		}
		return uint16ArrayToBase64(uint16s)
	}

	/**
	 * Convert a base64 string back to an array of VecModels.
	 * Decodes Float16-encoded coordinates (x, y, z) from the base64 string.
	 *
	 * @param base64 - The base64-encoded string containing point data
	 * @returns An array of VecModel objects decoded from the string
	 */
	static decodePoints(base64: string): VecModel[] {
		const uint16s = base64ToUint16Array(base64)
		const result: VecModel[] = []
		for (let i = 0; i < uint16s.length; i += 3) {
			result.push({
				x: float16BitsToNumber(uint16s[i]),
				y: float16BitsToNumber(uint16s[i + 1]),
				z: float16BitsToNumber(uint16s[i + 2]),
			})
		}
		return result
	}

	/**
	 * Decode a single point (8 base64 chars) starting at the given offset.
	 * Each point is encoded as 3 Float16 values (x, y, z) in 8 base64 characters.
	 *
	 * @param b64Points - The base64-encoded string containing point data
	 * @param charOffset - The character offset where the point starts (must be a multiple of 8)
	 * @returns A VecModel object with x, y, and z coordinates
	 * @internal
	 */
	static decodePointAt(b64Points: string, charOffset: number): VecModel {
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

		return {
			x: float16BitsToNumber(xBits),
			y: float16BitsToNumber(yBits),
			z: float16BitsToNumber(zBits),
		}
	}

	/**
	 * Get the first point from a base64-encoded string of points.
	 *
	 * @param b64Points - The base64-encoded string containing point data
	 * @returns The first point as a VecModel, or null if the string is too short
	 * @public
	 */
	static decodeFirstPoint(b64Points: string): VecModel | null {
		if (b64Points.length < POINT_B64_LENGTH) return null
		return b64Vecs.decodePointAt(b64Points, 0)
	}

	/**
	 * Get the last point from a base64-encoded string of points.
	 *
	 * @param b64Points - The base64-encoded string containing point data
	 * @returns The last point as a VecModel, or null if the string is too short
	 */
	static decodeLastPoint(b64Points: string): VecModel | null {
		if (b64Points.length < POINT_B64_LENGTH) return null
		return b64Vecs.decodePointAt(b64Points, b64Points.length - POINT_B64_LENGTH)
	}
}
