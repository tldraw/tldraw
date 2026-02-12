/**
 * Standalone point encoding for tldraw v4 draw shape segments.
 * Replicates @tldraw/tlschema's b64Vecs.encodePoints() without workspace deps.
 *
 * Format: first point as 3×Float32 (12 bytes), subsequent points as 3×Float16 deltas (6 bytes each).
 */

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function uint8ArrayToBase64(bytes: Uint8Array): string {
	let result = ''
	for (let i = 0; i < bytes.length; i += 3) {
		const byte1 = bytes[i]
		const byte2 = bytes[i + 1]
		const byte3 = bytes[i + 2]
		const bitmap = (byte1 << 16) | (byte2 << 8) | byte3
		result +=
			BASE64_CHARS[(bitmap >> 18) & 63] +
			BASE64_CHARS[(bitmap >> 12) & 63] +
			BASE64_CHARS[(bitmap >> 6) & 63] +
			BASE64_CHARS[bitmap & 63]
	}
	return result
}

function numberToFloat16Bits(value: number): number {
	if (value === 0) return Object.is(value, -0) ? 0x8000 : 0
	if (!Number.isFinite(value)) {
		if (Number.isNaN(value)) return 0x7e00
		return value > 0 ? 0x7c00 : 0xfc00
	}

	const sign = value < 0 ? 1 : 0
	value = Math.abs(value)

	const exp = Math.floor(Math.log2(value))
	let expBiased = exp + 15

	if (expBiased >= 31) return (sign << 15) | 0x7c00
	if (expBiased <= 0) {
		const frac = Math.round(value * Math.pow(2, 14) * 1024)
		return (sign << 15) | (frac & 0x3ff)
	}

	const mantissa = value / Math.pow(2, exp) - 1
	let frac = Math.round(mantissa * 1024)
	if (frac >= 1024) {
		frac = 0
		expBiased++
		if (expBiased >= 31) return (sign << 15) | 0x7c00
	}
	return (sign << 15) | (expBiased << 10) | frac
}

function setFloat16(dv: DataView, offset: number, value: number): void {
	dv.setUint16(offset, numberToFloat16Bits(value), true)
}

interface Point {
	x: number
	y: number
	z?: number
}

/** Encode points to a delta-encoded base64 path string (tldraw v4 format). */
export function encodePoints(points: Point[]): string {
	if (points.length === 0) return ''

	const firstPointBytes = 12
	const deltaBytes = (points.length - 1) * 6
	const buffer = new Uint8Array(firstPointBytes + deltaBytes)
	const dv = new DataView(buffer.buffer)

	const first = points[0]
	dv.setFloat32(0, first.x, true)
	dv.setFloat32(4, first.y, true)
	dv.setFloat32(8, first.z ?? 0.5, true)

	let prevX = first.x
	let prevY = first.y
	let prevZ = first.z ?? 0.5

	for (let i = 1; i < points.length; i++) {
		const p = points[i]
		const z = p.z ?? 0.5
		const offset = firstPointBytes + (i - 1) * 6
		setFloat16(dv, offset, p.x - prevX)
		setFloat16(dv, offset + 2, p.y - prevY)
		setFloat16(dv, offset + 4, z - prevZ)
		prevX = p.x
		prevY = p.y
		prevZ = z
	}

	return uint8ArrayToBase64(buffer)
}
