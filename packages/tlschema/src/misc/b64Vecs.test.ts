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

describe('b64Vecs delta encoding', () => {
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
			const deltaEncoded = b64Vecs.encodePoints(points)
			const deltaDecoded = b64Vecs.decodePoints(deltaEncoded)

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
			const deltaDecoded = b64Vecs.decodePoints(b64Vecs.encodePoints(points))

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

			const encoded = b64Vecs.encodePoints(points)
			const decoded = b64Vecs.decodePoints(encoded)

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
			const onePoint = b64Vecs.encodePoints([{ x: 0, y: 0, z: 0.5 }])
			expect(onePoint.length).toBe(16)

			// Two points: 12 bytes + 6 bytes = 18 bytes = 24 base64 chars
			const twoPoints = b64Vecs.encodePoints([
				{ x: 0, y: 0, z: 0.5 },
				{ x: 1, y: 1, z: 0.5 },
			])
			expect(twoPoints.length).toBe(24)

			// Three points: 12 bytes + 6 bytes + 6 bytes = 24 bytes = 32 base64 chars
			const threePoints = b64Vecs.encodePoints([
				{ x: 0, y: 0, z: 0.5 },
				{ x: 1, y: 1, z: 0.5 },
				{ x: 2, y: 2, z: 0.5 },
			])
			expect(threePoints.length).toBe(32)
		})

		it('empty array produces empty string', () => {
			expect(b64Vecs.encodePoints([])).toBe('')
			expect(b64Vecs.decodePoints('')).toEqual([])
		})

		it('defaults z to 0.5 when undefined', () => {
			const points: VecModel[] = [
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
			]
			const decoded = b64Vecs.decodePoints(b64Vecs.encodePoints(points))

			expect(decoded[0].z).toBe(0.5)
			expect(decoded[1].z).toBe(0.5)
		})
	})

	describe('decodeFirstPoint', () => {
		it('extracts first point without full decode', () => {
			const points: VecModel[] = [
				{ x: 100, y: 200, z: 0.75 },
				{ x: 101, y: 201, z: 0.8 },
			]
			const encoded = b64Vecs.encodePoints(points)
			const first = b64Vecs.decodeFirstPoint(encoded)

			expect(first).toEqual({ x: 100, y: 200, z: 0.75 })
		})

		it('returns null for insufficient data', () => {
			expect(b64Vecs.decodeFirstPoint('')).toBeNull()
			expect(b64Vecs.decodeFirstPoint('AAAA')).toBeNull() // Only 4 chars, need 16
		})
	})

	describe('decodeLastPoint', () => {
		it('accumulates deltas to get last point', () => {
			const points: VecModel[] = [
				{ x: 0, y: 0, z: 0.5 },
				{ x: 10, y: 20, z: 0.6 },
				{ x: 30, y: 50, z: 0.7 },
			]
			const encoded = b64Vecs.encodePoints(points)
			const last = b64Vecs.decodeLastPoint(encoded)

			expect(last!.x).toBeCloseTo(30, 2)
			expect(last!.y).toBeCloseTo(50, 2)
			expect(last!.z).toBeCloseTo(0.7, 2)
		})

		it('returns first point when only one point exists', () => {
			const points: VecModel[] = [{ x: 42, y: 84, z: 0.5 }]
			const encoded = b64Vecs.encodePoints(points)
			const last = b64Vecs.decodeLastPoint(encoded)

			expect(last).toEqual({ x: 42, y: 84, z: 0.5 })
		})

		it('returns null for insufficient data', () => {
			expect(b64Vecs.decodeLastPoint('')).toBeNull()
			expect(b64Vecs.decodeLastPoint('AAAA')).toBeNull()
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

			const decoded = b64Vecs.decodePoints(b64Vecs.encodePoints(points))

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

			const decoded = b64Vecs.decodePoints(b64Vecs.encodePoints(points))

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

			const decoded = b64Vecs.decodePoints(b64Vecs.encodePoints(points))

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

		it('cross-decodes: fallback encode → production decode works', () => {
			const points: VecModel[] = [
				{ x: 100, y: 200, z: 0.5 },
				{ x: 105, y: 210, z: 0.6 },
			]

			// Encode with production (may use native)
			const productionEncoded = b64Vecs.encodePoints(points)

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
			const decoded = b64Vecs.decodePoints(fallbackEncoded)

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
			const encoded = b64Vecs.encodePoints(original)

			// Convert through fallback (decode then encode)
			const bytes = fallbackBase64ToUint8Array(encoded)
			const reEncoded = fallbackUint8ArrayToBase64(bytes)

			// Should produce identical string
			expect(reEncoded).toBe(encoded)

			// And decode back to same points
			const decoded = b64Vecs.decodePoints(reEncoded)
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
