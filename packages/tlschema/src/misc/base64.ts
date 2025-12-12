import { VecModel } from './geometry-types'

// =============================================================================
// Float16 encoding/decoding (fallback when Float16Array is not available)
// =============================================================================

// Shared typed array views for conversion (reused to avoid allocations)
const floatView = new Float32Array(1)
const int32View = new Int32Array(floatView.buffer)

/**
 * Encode a float32 value as a float16 (half-precision) value.
 * Returns the 16-bit representation as a number.
 */
function encodeFloat16(value: number): number {
	floatView[0] = value
	const x = int32View[0]

	let bits = (x >> 16) & 0x8000 // Sign bit
	let m = (x >> 12) & 0x07ff // Mantissa
	const e = (x >> 23) & 0xff // Exponent

	// Handle special cases
	if (e < 103) {
		// Too small, becomes zero
		return bits
	}

	if (e > 142) {
		// Infinity or NaN
		bits |= 0x7c00
		bits |= (e === 255 ? 0 : 1) && x & 0x007fffff
		return bits
	}

	if (e < 113) {
		// Denormalized number
		m |= 0x0800
		bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1)
		return bits
	}

	// Normalized number
	bits |= ((e - 112) << 10) | (m >> 1)
	bits += m & 1 // Rounding
	return bits
}

/**
 * Decode a float16 (half-precision) value to a float32.
 * Takes the 16-bit representation as a number.
 */
function decodeFloat16(bits: number): number {
	const sign = (bits & 0x8000) >> 15
	const exponent = (bits & 0x7c00) >> 10
	const fraction = bits & 0x03ff

	if (exponent === 0) {
		if (fraction === 0) {
			// Zero (positive or negative)
			return sign === 0 ? 0 : -0
		}
		// Denormalized number
		return (sign === 0 ? 1 : -1) * Math.pow(2, -14) * (fraction / 1024)
	}

	if (exponent === 31) {
		if (fraction === 0) {
			// Infinity
			return sign === 0 ? Infinity : -Infinity
		}
		// NaN
		return NaN
	}

	// Normalized number
	return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - 15) * (1 + fraction / 1024)
}

// =============================================================================
// Custom base64 encoding/decoding (way faster than btoa/atob)
// =============================================================================

const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

// Build reverse lookup table for decoding
const base64Lookup = new Uint8Array(128)
for (let i = 0; i < base64Chars.length; i++) {
	base64Lookup[base64Chars.charCodeAt(i)] = i
}

function customBase64Encode(bytes: Uint8Array): string {
	let result = ''
	const len = bytes.length

	for (let i = 0; i < len; i += 3) {
		const b1 = bytes[i]
		const b2 = i + 1 < len ? bytes[i + 1] : 0
		const b3 = i + 2 < len ? bytes[i + 2] : 0

		result += base64Chars[b1 >> 2]
		result += base64Chars[((b1 & 3) << 4) | (b2 >> 4)]
		result += i + 1 < len ? base64Chars[((b2 & 15) << 2) | (b3 >> 6)] : '='
		result += i + 2 < len ? base64Chars[b3 & 63] : '='
	}

	return result
}

function customBase64Decode(base64: string): Uint8Array {
	// Calculate output length, accounting for padding
	const len = base64.length
	let padding = 0
	if (base64[len - 1] === '=') padding++
	if (base64[len - 2] === '=') padding++

	const outputLen = (len * 3) / 4 - padding
	const bytes = new Uint8Array(outputLen)

	let byteIndex = 0
	for (let i = 0; i < len; i += 4) {
		const c1 = base64Lookup[base64.charCodeAt(i)]
		const c2 = base64Lookup[base64.charCodeAt(i + 1)]
		const c3 = base64Lookup[base64.charCodeAt(i + 2)]
		const c4 = base64Lookup[base64.charCodeAt(i + 3)]

		bytes[byteIndex++] = (c1 << 2) | (c2 >> 4)
		if (byteIndex < outputLen) bytes[byteIndex++] = ((c2 & 15) << 4) | (c3 >> 2)
		if (byteIndex < outputLen) bytes[byteIndex++] = ((c3 & 3) << 6) | c4
	}

	return bytes
}

// =============================================================================
// Implementation selection
// =============================================================================

const hasNativeSupport =
	'fromBase64' in Uint8Array &&
	typeof (Uint8Array as any).fromBase64 === 'function' &&
	'toBase64' in Uint8Array &&
	typeof (Uint8Array as any).toBase64 === 'function' &&
	typeof Float16Array !== 'undefined'

// =============================================================================
// Custom implementation (custom Float16 + custom base64, no btoa/atob)
// =============================================================================

export function customVecsToBase64(vecs: VecModel[]): string {
	if (vecs.length === 0) {
		return ''
	}

	const uint16Array = new Uint16Array(vecs.length * 3)

	for (let i = 0; i < vecs.length; i++) {
		const vec = vecs[i]
		const offset = i * 3
		uint16Array[offset] = encodeFloat16(vec.x)
		uint16Array[offset + 1] = encodeFloat16(vec.y)
		uint16Array[offset + 2] = encodeFloat16(vec.z ?? 0.5)
	}

	const bytes = new Uint8Array(uint16Array.buffer, uint16Array.byteOffset, uint16Array.byteLength)
	return customBase64Encode(bytes)
}

export function customBase64ToVecs(base64: string): VecModel[] {
	if (base64 === '') {
		return []
	}

	const bytes = customBase64Decode(base64)

	// Need to copy to aligned buffer for Uint16Array view
	const alignedBuffer = new ArrayBuffer(bytes.length)
	new Uint8Array(alignedBuffer).set(bytes)
	const uint16Array = new Uint16Array(alignedBuffer)

	const vecs: VecModel[] = []
	for (let i = 0; i < uint16Array.length; i += 3) {
		vecs.push({
			x: decodeFloat16(uint16Array[i]),
			y: decodeFloat16(uint16Array[i + 1]),
			z: decodeFloat16(uint16Array[i + 2]),
		})
	}

	return vecs
}

// =============================================================================
// OldSchool implementation (custom Float16 + btoa/atob)
// =============================================================================

export function oldSchoolVecsToBase64(vecs: VecModel[]): string {
	if (vecs.length === 0) {
		return ''
	}

	// Each vec has x, y, z (3 float16 values = 6 bytes)
	const uint16Array = new Uint16Array(vecs.length * 3)

	for (let i = 0; i < vecs.length; i++) {
		const vec = vecs[i]
		const offset = i * 3
		uint16Array[offset] = encodeFloat16(vec.x)
		uint16Array[offset + 1] = encodeFloat16(vec.y)
		uint16Array[offset + 2] = encodeFloat16(vec.z ?? 0.5)
	}

	// Convert Uint16Array to Uint8Array for base64 encoding
	const bytes = new Uint8Array(uint16Array.buffer, uint16Array.byteOffset, uint16Array.byteLength)
	let binary = ''
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i])
	}
	return btoa(binary)
}

export function oldSchoolBase64ToVecs(base64: string): VecModel[] {
	if (base64 === '') {
		return []
	}

	const byteString = atob(base64)
	const bytes = Uint8Array.from(byteString, (char) => char.charCodeAt(0))

	// Create Uint16Array view of the bytes
	const uint16Array = new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2)

	const vecs: VecModel[] = []
	for (let i = 0; i < uint16Array.length; i += 3) {
		vecs.push({
			x: decodeFloat16(uint16Array[i]),
			y: decodeFloat16(uint16Array[i + 1]),
			z: decodeFloat16(uint16Array[i + 2]),
		})
	}

	return vecs
}

export function nativeVecsToBase64(vecs: VecModel[]): string {
	if (vecs.length === 0) {
		return ''
	}

	const float16Array = new Float16Array(vecs.length * 3)
	for (let i = 0; i < vecs.length; i++) {
		const vec = vecs[i]
		const offset = i * 3
		float16Array[offset] = vec.x
		float16Array[offset + 1] = vec.y
		float16Array[offset + 2] = vec.z ?? 0.5
	}

	return (new Uint8Array(float16Array.buffer) as any).toBase64()
}

export function nativeBase64ToVecs(base64: string): VecModel[] {
	if (base64 === '') {
		return []
	}

	const bytes = (Uint8Array as any).fromBase64(base64)
	const float16Array = new Float16Array(bytes.buffer)
	const vecs: VecModel[] = []
	for (let i = 0; i < float16Array.length; i += 3) {
		vecs.push({
			x: float16Array[i],
			y: float16Array[i + 1],
			z: float16Array[i + 2],
		})
	}
	return vecs
}

// =============================================================================
// Public API: vecsToBase64 and base64ToVecs
// =============================================================================

/**
 * Convert an array of vectors to a base64-encoded string.
 * Uses Float16 encoding for compact storage (6 bytes per point).
 *
 * @public
 */
export const vecsToBase64 = hasNativeSupport ? nativeVecsToBase64 : customVecsToBase64

/**
 * Convert a base64-encoded string back to an array of vectors.
 * Decodes Float16 values from the compact storage format.
 *
 * @public
 */
export const base64ToVecs = hasNativeSupport ? nativeBase64ToVecs : customBase64ToVecs
