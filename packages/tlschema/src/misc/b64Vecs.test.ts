import { describe, expect, it } from 'vitest'
import {
	b64Vecs,
	fallbackBase64ToUint8Array,
	fallbackUint8ArrayToBase64,
	float16BitsToNumber,
	numberToFloat16Bits,
} from './b64Vecs'
import { VecModel } from './geometry-types'

const hasNativeFloat16 = typeof (DataView.prototype as any).getFloat16 === 'function'

describe('legacy Float16 delta encoding (migrations only)', () => {
	describe('precision advantage over legacy encoding', () => {
		/**
		 * Float16 has 10 mantissa bits, so at value ~10000 the step size is 8.
		 * This means Float16 can only represent: ..., 9984, 9992, 10000, 10008, 10016, ...
		 * Values like 10001, 10002, 10003 all round to 10000.
		 *
		 * Legacy encoding stores absolute coordinates as Float16, losing small deltas.
		 * Delta encoding stores the first point as Float32 (exact) and subsequent
		 * points as Float16 deltas. Since deltas like 1, 2, 3 are perfectly
		 * representable in Float16, precision is preserved.
		 */

		it('preserves small deltas that legacy encoding loses', () => {
			const points: VecModel[] = [
				{ x: 10000, y: 10000, z: 0.5 },
				{ x: 10001, y: 10001, z: 0.5 },
				{ x: 10002, y: 10002, z: 0.5 },
			]

			// Legacy encoding: all points collapse to ~10000 due to Float16 precision limits
			const legacyEncoded = b64Vecs._legacyEncodePoints(points)
			const legacyDecoded = b64Vecs._legacyDecodePoints(legacyEncoded)

			// Legacy encoding loses the deltas - all three x values become the same
			// (or very close, depending on rounding)
			const legacyDelta1 = Math.abs(legacyDecoded[1].x - legacyDecoded[0].x)

			// Delta encoding: preserves the small deltas
			const deltaEncoded = b64Vecs._legacyDeltaEncodePoints(points)
			const deltaDecoded = b64Vecs._legacyDeltaDecodePoints(deltaEncoded)

			const deltaDelta1 = Math.abs(deltaDecoded[1].x - deltaDecoded[0].x)
			const deltaDelta2 = Math.abs(deltaDecoded[2].x - deltaDecoded[1].x)

			// Legacy encoding loses the 1-unit deltas (they become 0 or 8)
			expect(legacyDelta1).not.toBeCloseTo(1, 0) // Legacy fails to preserve delta of 1

			// Delta encoding preserves the 1-unit deltas exactly
			expect(deltaDelta1).toBeCloseTo(1, 5) // Delta encoding preserves it
			expect(deltaDelta2).toBeCloseTo(1, 5)

			// Verify absolute positions are correct with delta encoding
			expect(deltaDecoded[0].x).toBe(10000)
			expect(deltaDecoded[1].x).toBe(10001)
			expect(deltaDecoded[2].x).toBe(10002)
		})

		it('maintains relative distances that legacy encoding destroys', () => {
			// A realistic draw stroke: user draws near coordinate 50000
			// with small movements of 0.5-2 pixels between points
			const points: VecModel[] = [
				{ x: 50000, y: 50000, z: 0.5 },
				{ x: 50000.5, y: 50001, z: 0.5 },
				{ x: 50001.5, y: 50002.5, z: 0.5 },
				{ x: 50003, y: 50004, z: 0.5 },
			]

			// At 50000, Float16 step size is 32 (2^15 range, so 2^(15-10) = 32)
			// All these points collapse to 49984 or 50016 in legacy encoding

			const legacyDecoded = b64Vecs._legacyDecodePoints(b64Vecs._legacyEncodePoints(points))
			const deltaDecoded = b64Vecs._legacyDeltaDecodePoints(
				b64Vecs._legacyDeltaEncodePoints(points)
			)

			// Calculate total path length for each encoding
			let legacyLength = 0
			let deltaLength = 0
			for (let i = 1; i < points.length; i++) {
				legacyLength += Math.hypot(
					legacyDecoded[i].x - legacyDecoded[i - 1].x,
					legacyDecoded[i].y - legacyDecoded[i - 1].y
				)
				deltaLength += Math.hypot(
					deltaDecoded[i].x - deltaDecoded[i - 1].x,
					deltaDecoded[i].y - deltaDecoded[i - 1].y
				)
			}

			// Original path length
			let originalLength = 0
			for (let i = 1; i < points.length; i++) {
				originalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
			}

			// Legacy encoding destroys the path - length is way off
			expect(Math.abs(legacyLength - originalLength)).toBeGreaterThan(1)

			// Delta encoding preserves the path length accurately
			expect(deltaLength).toBeCloseTo(originalLength, 1)
		})

		it('Float32 anchor provides exact precision for first point', () => {
			// Test that Float32 is actually being used for the first point
			// Float32 has 23 mantissa bits, so it can represent these exactly
			const preciseValue = 123456.789
			const points: VecModel[] = [{ x: preciseValue, y: preciseValue, z: 0.5 }]

			const encoded = b64Vecs._legacyDeltaEncodePoints(points)
			const decoded = b64Vecs._legacyDeltaDecodePoints(encoded)

			// Float32 should preserve ~7 significant digits
			expect(decoded[0].x).toBeCloseTo(preciseValue, 2)
			expect(decoded[0].y).toBeCloseTo(preciseValue, 2)

			// Legacy Float16 would mangle this value significantly
			const legacyDecoded = b64Vecs._legacyDecodePoints(b64Vecs._legacyEncodePoints(points))
			const legacyError = Math.abs(legacyDecoded[0].x - preciseValue)
			const deltaError = Math.abs(decoded[0].x - preciseValue)

			// Delta encoding should have much smaller error than legacy
			expect(deltaError).toBeLessThan(legacyError)
		})
	})

	describe('delta encoding format', () => {
		it('uses correct byte sizes: 12 bytes for first point, 6 bytes per delta', () => {
			// Single point: 3 Float32s = 12 bytes = 16 base64 chars
			const onePoint = b64Vecs._legacyDeltaEncodePoints([{ x: 0, y: 0, z: 0.5 }])
			expect(onePoint.length).toBe(16)

			// Two points: 12 bytes + 6 bytes = 18 bytes = 24 base64 chars
			const twoPoints = b64Vecs._legacyDeltaEncodePoints([
				{ x: 0, y: 0, z: 0.5 },
				{ x: 1, y: 1, z: 0.5 },
			])
			expect(twoPoints.length).toBe(24)

			// Three points: 12 bytes + 6 bytes + 6 bytes = 24 bytes = 32 base64 chars
			const threePoints = b64Vecs._legacyDeltaEncodePoints([
				{ x: 0, y: 0, z: 0.5 },
				{ x: 1, y: 1, z: 0.5 },
				{ x: 2, y: 2, z: 0.5 },
			])
			expect(threePoints.length).toBe(32)
		})

		it('empty array produces empty string', () => {
			expect(b64Vecs._legacyDeltaEncodePoints([])).toBe('')
			expect(b64Vecs._legacyDeltaDecodePoints('')).toEqual([])
		})

		it('defaults z to 0.5 when undefined', () => {
			const points: VecModel[] = [
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
			]
			const decoded = b64Vecs._legacyDeltaDecodePoints(b64Vecs._legacyDeltaEncodePoints(points))

			expect(decoded[0].z).toBe(0.5)
			expect(decoded[1].z).toBe(0.5)
		})
	})

	describe('round-trip correctness', () => {
		it('preserves typical draw stroke data', () => {
			// Simulate a real freehand stroke with small movements
			const points: VecModel[] = [
				{ x: 100, y: 100, z: 0.5 },
				{ x: 102, y: 101, z: 0.52 },
				{ x: 105, y: 103, z: 0.55 },
				{ x: 109, y: 106, z: 0.58 },
				{ x: 114, y: 110, z: 0.6 },
			]

			const decoded = b64Vecs._legacyDeltaDecodePoints(b64Vecs._legacyDeltaEncodePoints(points))

			expect(decoded).toHaveLength(points.length)
			for (let i = 0; i < points.length; i++) {
				expect(decoded[i].x).toBeCloseTo(points[i].x, 2)
				expect(decoded[i].y).toBeCloseTo(points[i].y, 2)
				expect(decoded[i].z).toBeCloseTo(points[i].z!, 2)
			}
		})

		it('handles negative coordinates', () => {
			const points: VecModel[] = [
				{ x: -100, y: -200, z: 0.5 },
				{ x: -99, y: -198, z: 0.5 },
			]

			const decoded = b64Vecs._legacyDeltaDecodePoints(b64Vecs._legacyDeltaEncodePoints(points))

			expect(decoded[0].x).toBe(-100)
			expect(decoded[0].y).toBe(-200)
			expect(decoded[1].x).toBeCloseTo(-99, 2)
			expect(decoded[1].y).toBeCloseTo(-198, 2)
		})

		it('handles zero deltas', () => {
			const points: VecModel[] = [
				{ x: 100, y: 100, z: 0.5 },
				{ x: 100, y: 100, z: 0.5 }, // Same point
				{ x: 100, y: 100, z: 0.5 }, // Same point again
			]

			const decoded = b64Vecs._legacyDeltaDecodePoints(b64Vecs._legacyDeltaEncodePoints(points))

			expect(decoded[0]).toEqual({ x: 100, y: 100, z: 0.5 })
			expect(decoded[1]).toEqual({ x: 100, y: 100, z: 0.5 })
			expect(decoded[2]).toEqual({ x: 100, y: 100, z: 0.5 })
		})
	})
})

describe('native/fallback interoperability', () => {
	describe('base64 encoding/decoding', () => {
		it('fallback encode produces valid base64 that fallback decode can read', () => {
			const bytes = new Uint8Array([0, 127, 255, 1, 128, 254])
			const encoded = fallbackUint8ArrayToBase64(bytes)
			const decoded = fallbackBase64ToUint8Array(encoded)

			expect(decoded).toEqual(bytes)
		})

		it('fallback produces identical output to standard base64', () => {
			// Test with various byte patterns
			const testCases = [
				new Uint8Array([0, 0, 0]),
				new Uint8Array([255, 255, 255]),
				new Uint8Array([0, 127, 255]),
				new Uint8Array([1, 2, 3, 4, 5, 6]), // 6 bytes = 8 chars
				new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), // 12 bytes = 16 chars (one delta point)
			]

			for (const bytes of testCases) {
				const fallbackEncoded = fallbackUint8ArrayToBase64(bytes)

				// Verify it's valid base64 by decoding and re-encoding
				const decoded = fallbackBase64ToUint8Array(fallbackEncoded)
				expect(decoded).toEqual(bytes)

				// Verify it only uses valid base64 characters
				expect(fallbackEncoded).toMatch(/^[A-Za-z0-9+/]*$/)
			}
		})

		it('fallback decode handles all valid base64 characters', () => {
			// Base64 alphabet: A-Z, a-z, 0-9, +, /
			// "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/" encodes specific bytes
			const allChars = 'AAAA' // Simple test - decodes to [0, 0, 0]
			const decoded = fallbackBase64ToUint8Array(allChars)
			expect(decoded).toEqual(new Uint8Array([0, 0, 0]))

			// Test with different character ranges
			const mixedChars = 'QUJD' // "ABC" in base64
			const mixedDecoded = fallbackBase64ToUint8Array(mixedChars)
			expect(mixedDecoded.length).toBe(3)
		})

		it('cross-decodes: production encode → fallback decode works', () => {
			const points: VecModel[] = [
				{ x: 100, y: 200, z: 0.5 },
				{ x: 105, y: 210, z: 0.6 },
			]

			// Encode with production (may use native)
			const productionEncoded = b64Vecs._legacyDeltaEncodePoints(points)

			// Decode with fallback
			const bytes = fallbackBase64ToUint8Array(productionEncoded)
			expect(bytes.length).toBe(18) // 12 bytes (first point) + 6 bytes (delta)

			// Verify the bytes decode to correct values
			const dataView = new DataView(bytes.buffer)
			expect(dataView.getFloat32(0, true)).toBe(100)
			expect(dataView.getFloat32(4, true)).toBe(200)
		})

		it('cross-encodes: fallback encode → production decode works', () => {
			// Create bytes manually
			const bytes = new Uint8Array(18) // One Float32 point + one Float16 delta
			const dataView = new DataView(bytes.buffer)
			dataView.setFloat32(0, 50, true)
			dataView.setFloat32(4, 75, true)
			dataView.setFloat32(8, 0.5, true)
			// Delta point (small values work well with Float16)
			dataView.setUint16(12, numberToFloat16Bits(5), true)
			dataView.setUint16(14, numberToFloat16Bits(10), true)
			dataView.setUint16(16, numberToFloat16Bits(0.1), true)

			// Encode with fallback
			const fallbackEncoded = fallbackUint8ArrayToBase64(bytes)

			// Decode with production
			const decoded = b64Vecs._legacyDeltaDecodePoints(fallbackEncoded)

			expect(decoded).toHaveLength(2)
			expect(decoded[0].x).toBe(50)
			expect(decoded[0].y).toBe(75)
			expect(decoded[1].x).toBeCloseTo(55, 2)
			expect(decoded[1].y).toBeCloseTo(85, 2)
		})
	})

	describe('Float16 encoding/decoding', () => {
		it('fallback Float16 round-trips correctly for normal values', () => {
			const testValues = [0, 1, -1, 0.5, -0.5, 100, -100, 1000, 0.001, 65504, -65504]

			for (const value of testValues) {
				const bits = numberToFloat16Bits(value)
				const decoded = float16BitsToNumber(bits)
				expect(decoded).toBeCloseTo(value, 2)
			}
		})

		it('fallback Float16 handles special values', () => {
			// Zero
			expect(numberToFloat16Bits(0)).toBe(0)
			expect(float16BitsToNumber(0)).toBe(0)

			// Negative zero
			expect(numberToFloat16Bits(-0)).toBe(0x8000)

			// Infinity
			expect(float16BitsToNumber(0x7c00)).toBe(Infinity)
			expect(float16BitsToNumber(0xfc00)).toBe(-Infinity)

			// NaN
			expect(Number.isNaN(float16BitsToNumber(0x7e00))).toBe(true)
		})

		it('fallback Float16 handles overflow to infinity', () => {
			// Values > 65504 should overflow to infinity
			const bits = numberToFloat16Bits(100000)
			expect(float16BitsToNumber(bits)).toBe(Infinity)
		})

		it('fallback Float16 matches native when available', () => {
			if (!hasNativeFloat16) {
				// Skip if native not available - can't compare
				return
			}

			const testValues = [0, 1, -1, 0.5, 100, 1000, 0.001]

			for (const value of testValues) {
				// Create a DataView to use native Float16
				const buffer = new ArrayBuffer(2)
				const view = new DataView(buffer)
				;(view as any).setFloat16(0, value, true)
				const nativeBits = view.getUint16(0, true)

				const fallbackBits = numberToFloat16Bits(value)

				// Bits should match exactly
				expect(fallbackBits).toBe(nativeBits)
			}
		})
	})

	describe('full encode/decode interop', () => {
		it('points encoded with production can be decoded after re-encoding through fallback', () => {
			const original: VecModel[] = [
				{ x: 100, y: 200, z: 0.5 },
				{ x: 102, y: 203, z: 0.55 },
				{ x: 105, y: 208, z: 0.6 },
			]

			// Encode with production
			const encoded = b64Vecs._legacyDeltaEncodePoints(original)

			// Convert through fallback (decode then encode)
			const bytes = fallbackBase64ToUint8Array(encoded)
			const reEncoded = fallbackUint8ArrayToBase64(bytes)

			// Should produce identical string
			expect(reEncoded).toBe(encoded)

			// And decode back to same points
			const decoded = b64Vecs._legacyDeltaDecodePoints(reEncoded)
			expect(decoded).toHaveLength(original.length)
			for (let i = 0; i < original.length; i++) {
				expect(decoded[i].x).toBeCloseTo(original[i].x, 2)
				expect(decoded[i].y).toBeCloseTo(original[i].y, 2)
			}
		})
	})
})

describe('b64Vecs legacy encoding', () => {
	it('uses 8 base64 chars per point (6 bytes = 3 Float16s)', () => {
		const onePoint = b64Vecs._legacyEncodePoints([{ x: 0, y: 0, z: 0.5 }])
		expect(onePoint.length).toBe(8)

		const twoPoints = b64Vecs._legacyEncodePoints([
			{ x: 0, y: 0, z: 0.5 },
			{ x: 1, y: 1, z: 0.5 },
		])
		expect(twoPoints.length).toBe(16)
	})

	it('round-trips correctly for small values', () => {
		const points: VecModel[] = [
			{ x: 0, y: 0, z: 0.5 },
			{ x: 10, y: 20, z: 0.6 },
		]

		const decoded = b64Vecs._legacyDecodePoints(b64Vecs._legacyEncodePoints(points))

		expect(decoded[0].x).toBeCloseTo(0, 2)
		expect(decoded[1].x).toBeCloseTo(10, 2)
		expect(decoded[1].y).toBeCloseTo(20, 2)
	})

	it('loses precision at large values due to Float16 limitations', () => {
		// At 10000, Float16 step size is 8
		// Values 10000, 10001, 10002, 10003, 10004 all encode to the same Float16 value
		const points: VecModel[] = [
			{ x: 10000, y: 0, z: 0.5 },
			{ x: 10001, y: 0, z: 0.5 },
			{ x: 10002, y: 0, z: 0.5 },
			{ x: 10003, y: 0, z: 0.5 },
		]

		const decoded = b64Vecs._legacyDecodePoints(b64Vecs._legacyEncodePoints(points))

		// All four distinct x values collapse to the same value (or very close)
		const uniqueXValues = new Set(decoded.map((p) => Math.round(p.x)))
		expect(uniqueXValues.size).toBeLessThanOrEqual(2) // Should collapse to 1-2 values, not 4
	})
})

describe('padding-aware fallback base64', () => {
	it('matches Node Buffer for every trailing-byte remainder', () => {
		for (let len = 0; len < 32; len++) {
			const bytes = new Uint8Array(len)
			for (let i = 0; i < len; i++) bytes[i] = (i * 37 + 11) & 0xff
			expect(fallbackUint8ArrayToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
			expect(fallbackBase64ToUint8Array(fallbackUint8ArrayToBase64(bytes))).toEqual(bytes)
		}
	})

	it('round-trips 2D buffer lengths (8 + 4(n-1) bytes)', () => {
		for (const n of [1, 2, 3, 4, 5]) {
			const len = 8 + (n - 1) * 4
			const bytes = new Uint8Array(len)
			for (let i = 0; i < len; i++) bytes[i] = (i * 53 + 7) & 0xff
			expect(fallbackBase64ToUint8Array(fallbackUint8ArrayToBase64(bytes))).toEqual(bytes)
		}
	})
})

describe('legacy Float16 delta encoding, 2D', () => {
	it('round-trips x and y and supplies z = 0.5', () => {
		const points: VecModel[] = [
			{ x: 1000, y: 2000, z: 0.5 },
			{ x: 1013, y: 2008, z: 0.5 },
		]
		const decoded = b64Vecs._legacyDeltaDecodePoints(b64Vecs._legacyDeltaEncodePoints(points, 2), 2)
		expect(decoded).toEqual(points)
	})
})

// A deterministic freehand-like stroke on the draw tool's 0.01 grid.
function makeStroke(n: number, seed = 1): VecModel[] {
	let s = seed
	const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1
	const points: VecModel[] = []
	let x = 0
	let y = 0
	let vx = 2
	let vy = 1
	let z = 0.5
	for (let i = 0; i < n; i++) {
		points.push({
			x: Math.round(x * 100) / 100,
			y: Math.round(y * 100) / 100,
			z: Math.round(z * 100) / 100,
		})
		vx += rand() * 0.15
		vy += rand() * 0.15
		x += vx
		y += vy
		z = Math.min(1.25, Math.max(0, z + rand() * 0.05))
	}
	return points
}

describe('b64Vecs path encoding', () => {
	it('round-trips points on the 0.01 grid exactly, in 3D and 2D', () => {
		const points = makeStroke(500)
		expect(b64Vecs.decodePoints(b64Vecs.encodePoints(points))).toEqual(points)
		expect(b64Vecs.decodePoints(b64Vecs.encodePoints(points, 2), 2)).toEqual(
			points.map((p) => ({ ...p, z: 0.5 }))
		)
	})

	it('does not drift along long strokes, unlike the legacy delta format', () => {
		const points = makeStroke(600).map((p) => ({
			x: Math.round((p.x + 5000) * 100) / 100,
			y: Math.round((p.y - 5000) * 100) / 100,
			z: p.z,
		}))
		const last = points[points.length - 1]

		expect(b64Vecs.decodeLastPoint(b64Vecs.encodePoints(points))).toEqual(last)

		const legacyLast = b64Vecs
			._legacyDeltaDecodePoints(b64Vecs._legacyDeltaEncodePoints(points))
			.at(-1)!
		expect(Math.abs(legacyLast.x - last.x) + Math.abs(legacyLast.y - last.y)).toBeGreaterThan(0.005)
	})

	it('is less than half the size of the legacy delta format for a freehand stroke', () => {
		const points = makeStroke(300)
		const size = b64Vecs.encodePoints(points).length
		expect(size).toBeLessThan(b64Vecs._legacyDeltaEncodePoints(points).length / 2)
	})

	it('rounds off-grid values to the nearest 0.01', () => {
		const decoded = b64Vecs.decodePoints(
			b64Vecs.encodePoints([
				{ x: 1.234, y: -5.678, z: 0.333 },
				{ x: 1.236, y: -5.672, z: 0.337 },
			])
		)
		expect(decoded).toEqual([
			{ x: 1.23, y: -5.68, z: 0.33 },
			{ x: 1.24, y: -5.67, z: 0.34 },
		])
	})

	it('handles coordinates far beyond 32-bit residuals', () => {
		const points: VecModel[] = [
			{ x: 1e11, y: -1e11, z: 0.5 },
			{ x: -1e11, y: 1e11, z: 0.5 },
			{ x: 123456789.01, y: -0.01, z: 1.25 },
		]
		expect(b64Vecs.decodePoints(b64Vecs.encodePoints(points))).toEqual(points)
	})

	it('clamps values past the safe range instead of corrupting the stroke', () => {
		const huge = 2 ** 49 / 100
		const decoded = b64Vecs.decodePoints(
			b64Vecs.encodePoints([
				{ x: 0, y: 0, z: 0.5 },
				{ x: 1e300, y: -45035996273705, z: 0.5 },
				{ x: 1, y: 2, z: 0.3 },
			])
		)
		expect(decoded).toEqual([
			{ x: 0, y: 0, z: 0.5 },
			{ x: huge, y: -huge, z: 0.5 },
			{ x: 1, y: 2, z: 0.3 },
		])
	})

	it('stores non-finite values as 0 so they do not corrupt later points', () => {
		const decoded = b64Vecs.decodePoints(
			b64Vecs.encodePoints([
				{ x: 0, y: 0, z: 0.5 },
				{ x: NaN, y: Infinity, z: 0.5 },
				{ x: 3, y: 4, z: 0.5 },
			])
		)
		expect(decoded).toEqual([
			{ x: 0, y: 0, z: 0.5 },
			{ x: 0, y: 0, z: 0.5 },
			{ x: 3, y: 4, z: 0.5 },
		])
	})

	it('defaults a missing z to 0.5', () => {
		expect(b64Vecs.decodePoints(b64Vecs.encodePoints([{ x: 1, y: 2 }]))).toEqual([
			{ x: 1, y: 2, z: 0.5 },
		])
	})

	it('encodes empty input as an empty string', () => {
		expect(b64Vecs.encodePoints([])).toBe('')
		expect(b64Vecs.decodePoints('')).toEqual([])
		expect(b64Vecs.decodeFirstPoint('')).toBeNull()
		expect(b64Vecs.decodeLastPoint('')).toBeNull()
	})

	it('is append-only: a prefix of the points encodes to a prefix of the path', () => {
		const points = makeStroke(50)
		const full = b64Vecs.encodePoints(points)
		for (let n = 1; n < points.length; n++) {
			expect(full.startsWith(b64Vecs.encodePoints(points.slice(0, n)))).toBe(true)
		}
	})

	it('only uses base64 alphabet characters', () => {
		expect(b64Vecs.encodePoints(makeStroke(200))).toMatch(/^[A-Za-z0-9+/]*$/)
	})

	it('decodeFirstPoint and decodeLastPoint match decodePoints, in 3D and 2D', () => {
		const points = makeStroke(40)
		for (const dim of [2, 3] as const) {
			const path = b64Vecs.encodePoints(points, dim)
			const all = b64Vecs.decodePoints(path, dim)
			expect(b64Vecs.decodeFirstPoint(path, dim)).toEqual(all[0])
			expect(b64Vecs.decodeLastPoint(path, dim)).toEqual(all[all.length - 1])
		}
	})

	it('decodeFirstPoint returns null for a truncated point', () => {
		const path = b64Vecs.encodePoints([{ x: 1000, y: 1000, z: 0.5 }])
		expect(b64Vecs.decodeFirstPoint(path.slice(0, -1))).toBeNull()
	})

	it('2D helpers match dim = 2 routing', () => {
		const points = makeStroke(10)
		const path = b64Vecs.encodePoints(points, 2)
		expect(b64Vecs.encodePoints2D(points)).toBe(path)
		expect(b64Vecs.decodePoints2D(path)).toEqual(b64Vecs.decodePoints(path, 2))
		expect(b64Vecs.decodeFirstPoint2D(path)).toEqual(b64Vecs.decodeFirstPoint(path, 2))
		expect(b64Vecs.decodeLastPoint2D(path)).toEqual(b64Vecs.decodeLastPoint(path, 2))
	})
})

describe('isSinglePoint', () => {
	const mk = (n: number, dim?: 2 | 3) =>
		b64Vecs.encodePoints(
			Array.from({ length: n }, (_, i) => ({ x: i * 1000, y: i * 1000, z: 0.5 })),
			dim
		)

	it('is true only for zero or one point, across 2D and 3D', () => {
		for (const dim of [2, 3] as const) {
			expect(b64Vecs.isSinglePoint('', dim)).toBe(true)
			expect(b64Vecs.isSinglePoint(mk(1, dim), dim)).toBe(true)
			expect(b64Vecs.isSinglePoint(mk(2, dim), dim)).toBe(false)
			expect(b64Vecs.isSinglePoint(mk(3, dim), dim)).toBe(false)
		}
	})

	it('counts values, not characters', () => {
		// One far-away 3D point takes more characters than two nearby 2D points.
		const farDot = b64Vecs.encodePoints([{ x: 99999, y: 99999, z: 0.5 }])
		const nearPair = b64Vecs.encodePoints(
			[
				{ x: 0, y: 0, z: 0.5 },
				{ x: 0.01, y: 0, z: 0.5 },
			],
			2
		)
		expect(farDot.length).toBeGreaterThan(nearPair.length)
		expect(b64Vecs.isSinglePoint(farDot, 3)).toBe(true)
		expect(b64Vecs.isSinglePoint(nearPair, 2)).toBe(false)
	})

	it('defaults to 3D when dim is omitted', () => {
		expect(b64Vecs.isSinglePoint(mk(1), undefined)).toBe(true)
		expect(b64Vecs.isSinglePoint(mk(2), undefined)).toBe(false)
	})
})
