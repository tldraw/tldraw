import { describe, expect, it } from 'vitest'
import {
	base64ToVecs,
	customBase64ToVecs,
	customVecsToBase64,
	nativeBase64ToVecs,
	nativeVecsToBase64,
	oldSchoolBase64ToVecs,
	oldSchoolVecsToBase64,
	vecsToBase64,
} from './base64'
import { VecModel } from './geometry-types'

// =============================================================================
// Check for native support
// =============================================================================

const hasFromBase64 =
	'fromBase64' in Uint8Array && typeof (Uint8Array as any).fromBase64 === 'function'
const hasToBase64 =
	'toBase64' in Uint8Array.prototype && typeof Uint8Array.prototype.toBase64 === 'function'
const hasFloat16Array = typeof Float16Array !== 'undefined'
const hasFullNativeSupport = hasFromBase64 && hasToBase64 && hasFloat16Array

// =============================================================================
// Test helpers
// =============================================================================

function expectVecsClose(a: VecModel[], b: VecModel[]) {
	expect(a.length).toBe(b.length)
	for (let i = 0; i < a.length; i++) {
		expect(a[i].x).toBeCloseTo(b[i].x, 1)
		expect(a[i].y).toBeCloseTo(b[i].y, 1)
		expect(a[i].z ?? 0.5).toBeCloseTo(b[i].z ?? 0.5, 2)
	}
}

// =============================================================================
// Test cases
// =============================================================================

const testCases: { name: string; vecs: VecModel[] }[] = [
	{
		name: 'empty array',
		vecs: [],
	},
	{
		name: 'single point at origin',
		vecs: [{ x: 0, y: 0, z: 0.5 }],
	},
	{
		name: 'single point with values',
		vecs: [{ x: 100, y: 200, z: 0.75 }],
	},
	{
		name: 'multiple points',
		vecs: [
			{ x: 0, y: 0, z: 0.5 },
			{ x: 10, y: 20, z: 0.6 },
			{ x: 30, y: 40, z: 0.7 },
		],
	},
	{
		name: 'negative values',
		vecs: [
			{ x: -50, y: -100, z: 0.25 },
			{ x: -0.5, y: -0.25, z: 0.1 },
		],
	},
	{
		name: 'mixed positive and negative',
		vecs: [
			{ x: -100, y: 100, z: 0.5 },
			{ x: 50, y: -50, z: 0.5 },
		],
	},
	{
		name: 'very small values',
		vecs: [{ x: 0.001, y: 0.002, z: 0.5 }],
	},
	{
		name: 'larger values (within Float16 range)',
		vecs: [
			{ x: 1000, y: 2000, z: 0.5 },
			{ x: 5000, y: 10000, z: 0.9 },
		],
	},
	{
		name: 'z values at extremes',
		vecs: [
			{ x: 0, y: 0, z: 0 },
			{ x: 0, y: 0, z: 1 },
		],
	},
	{
		name: 'undefined z defaults to 0.5',
		vecs: [{ x: 10, y: 20 }],
	},
	{
		name: 'typical draw shape points',
		vecs: [
			{ x: 0, y: 0, z: 0.5 },
			{ x: 5.5, y: 3.2, z: 0.52 },
			{ x: 12.3, y: 8.7, z: 0.55 },
			{ x: 20.1, y: 15.4, z: 0.6 },
			{ x: 28.9, y: 22.1, z: 0.58 },
			{ x: 35.6, y: 28.3, z: 0.55 },
		],
	},
]

// =============================================================================
// Tests for oldSchool implementation
// =============================================================================

describe('oldSchool implementation', () => {
	describe('oldSchoolVecsToBase64', () => {
		it('returns empty string for empty array', () => {
			expect(oldSchoolVecsToBase64([])).toBe('')
		})

		it('returns a valid base64 string', () => {
			const result = oldSchoolVecsToBase64([{ x: 10, y: 20, z: 0.5 }])
			expect(typeof result).toBe('string')
			expect(result.length).toBeGreaterThan(0)
			// Should be valid base64
			expect(() => atob(result)).not.toThrow()
		})

		it('produces consistent output for same input', () => {
			const vecs = [{ x: 1, y: 2, z: 0.5 }]
			const result1 = oldSchoolVecsToBase64(vecs)
			const result2 = oldSchoolVecsToBase64(vecs)
			expect(result1).toBe(result2)
		})
	})

	describe('oldSchoolBase64ToVecs', () => {
		it('returns empty array for empty string', () => {
			expect(oldSchoolBase64ToVecs('')).toEqual([])
		})
	})

	describe('oldSchool roundtrip', () => {
		for (const { name, vecs } of testCases) {
			it(`roundtrips correctly: ${name}`, () => {
				const encoded = oldSchoolVecsToBase64(vecs)
				const decoded = oldSchoolBase64ToVecs(encoded)
				expectVecsClose(decoded, vecs)
			})
		}
	})
})

// =============================================================================
// Tests for custom implementation (custom Float16 + custom base64)
// =============================================================================

describe('custom implementation', () => {
	describe('customVecsToBase64', () => {
		it('returns empty string for empty array', () => {
			expect(customVecsToBase64([])).toBe('')
		})

		it('returns a valid base64 string', () => {
			const result = customVecsToBase64([{ x: 10, y: 20, z: 0.5 }])
			expect(typeof result).toBe('string')
			expect(result.length).toBeGreaterThan(0)
			// Should be valid base64
			expect(() => atob(result)).not.toThrow()
		})

		it('produces consistent output for same input', () => {
			const vecs = [{ x: 1, y: 2, z: 0.5 }]
			const result1 = customVecsToBase64(vecs)
			const result2 = customVecsToBase64(vecs)
			expect(result1).toBe(result2)
		})
	})

	describe('customBase64ToVecs', () => {
		it('returns empty array for empty string', () => {
			expect(customBase64ToVecs('')).toEqual([])
		})
	})

	describe('custom roundtrip', () => {
		for (const { name, vecs } of testCases) {
			it(`roundtrips correctly: ${name}`, () => {
				const encoded = customVecsToBase64(vecs)
				const decoded = customBase64ToVecs(encoded)
				expectVecsClose(decoded, vecs)
			})
		}
	})
})

// =============================================================================
// Tests for native implementation (requires Float16Array + Uint8Array.toBase64/fromBase64)
// =============================================================================

describe.skipIf(!hasFullNativeSupport)('native implementation', () => {
	describe('nativeVecsToBase64', () => {
		it('returns empty string for empty array', () => {
			expect(nativeVecsToBase64([])).toBe('')
		})

		it('returns a valid base64 string', () => {
			const result = nativeVecsToBase64([{ x: 10, y: 20, z: 0.5 }])
			expect(typeof result).toBe('string')
			expect(result.length).toBeGreaterThan(0)
			// Should be valid base64
			expect(() => atob(result)).not.toThrow()
		})

		it('produces consistent output for same input', () => {
			const vecs = [{ x: 1, y: 2, z: 0.5 }]
			const result1 = nativeVecsToBase64(vecs)
			const result2 = nativeVecsToBase64(vecs)
			expect(result1).toBe(result2)
		})
	})

	describe('nativeBase64ToVecs', () => {
		it('returns empty array for empty string', () => {
			expect(nativeBase64ToVecs('')).toEqual([])
		})
	})

	describe('native roundtrip', () => {
		for (const { name, vecs } of testCases) {
			it(`roundtrips correctly: ${name}`, () => {
				const encoded = nativeVecsToBase64(vecs)
				const decoded = nativeBase64ToVecs(encoded)
				expectVecsClose(decoded, vecs)
			})
		}
	})
})

// =============================================================================
// Tests for interoperability between oldSchool and custom (always runs)
// =============================================================================

describe('interoperability between oldSchool and custom', () => {
	describe('encoding produces identical output', () => {
		for (const { name, vecs } of testCases) {
			it(`identical output: ${name}`, () => {
				const oldSchoolEncoded = oldSchoolVecsToBase64(vecs)
				const customEncoded = customVecsToBase64(vecs)
				expect(oldSchoolEncoded).toBe(customEncoded)
			})
		}
	})

	describe('cross-decode: oldSchool encodes, custom decodes', () => {
		for (const { name, vecs } of testCases) {
			it(`cross-decode works: ${name}`, () => {
				const encoded = oldSchoolVecsToBase64(vecs)
				const decoded = customBase64ToVecs(encoded)
				expectVecsClose(decoded, vecs)
			})
		}
	})

	describe('cross-decode: custom encodes, oldSchool decodes', () => {
		for (const { name, vecs } of testCases) {
			it(`cross-decode works: ${name}`, () => {
				const encoded = customVecsToBase64(vecs)
				const decoded = oldSchoolBase64ToVecs(encoded)
				expectVecsClose(decoded, vecs)
			})
		}
	})
})

// =============================================================================
// Tests for interoperability with native (requires native support)
// =============================================================================

describe.skipIf(!hasFullNativeSupport)('interoperability with native', () => {
	describe('all three implementations produce identical output', () => {
		for (const { name, vecs } of testCases) {
			it(`identical output: ${name}`, () => {
				const oldSchoolEncoded = oldSchoolVecsToBase64(vecs)
				const customEncoded = customVecsToBase64(vecs)
				const nativeEncoded = nativeVecsToBase64(vecs)
				expect(oldSchoolEncoded).toBe(customEncoded)
				expect(oldSchoolEncoded).toBe(nativeEncoded)
			})
		}
	})

	describe('cross-decode: native encodes, oldSchool decodes', () => {
		for (const { name, vecs } of testCases) {
			it(`cross-decode works: ${name}`, () => {
				const encoded = nativeVecsToBase64(vecs)
				const decoded = oldSchoolBase64ToVecs(encoded)
				expectVecsClose(decoded, vecs)
			})
		}
	})

	describe('cross-decode: native encodes, custom decodes', () => {
		for (const { name, vecs } of testCases) {
			it(`cross-decode works: ${name}`, () => {
				const encoded = nativeVecsToBase64(vecs)
				const decoded = customBase64ToVecs(encoded)
				expectVecsClose(decoded, vecs)
			})
		}
	})

	describe('cross-decode: oldSchool encodes, native decodes', () => {
		for (const { name, vecs } of testCases) {
			it(`cross-decode works: ${name}`, () => {
				const encoded = oldSchoolVecsToBase64(vecs)
				const decoded = nativeBase64ToVecs(encoded)
				expectVecsClose(decoded, vecs)
			})
		}
	})

	describe('cross-decode: custom encodes, native decodes', () => {
		for (const { name, vecs } of testCases) {
			it(`cross-decode works: ${name}`, () => {
				const encoded = customVecsToBase64(vecs)
				const decoded = nativeBase64ToVecs(encoded)
				expectVecsClose(decoded, vecs)
			})
		}
	})
})

// =============================================================================
// Tests for public API
// =============================================================================

describe('public API (vecsToBase64 / base64ToVecs)', () => {
	describe('basic functionality', () => {
		it('handles empty array', () => {
			expect(vecsToBase64([])).toBe('')
			expect(base64ToVecs('')).toEqual([])
		})

		it('roundtrips single point', () => {
			const vecs = [{ x: 42, y: 84, z: 0.5 }]
			const encoded = vecsToBase64(vecs)
			const decoded = base64ToVecs(encoded)
			expectVecsClose(decoded, vecs)
		})

		it('roundtrips multiple points', () => {
			const vecs = [
				{ x: 0, y: 0, z: 0.5 },
				{ x: 100, y: 100, z: 0.75 },
				{ x: -50, y: 50, z: 0.25 },
			]
			const encoded = vecsToBase64(vecs)
			const decoded = base64ToVecs(encoded)
			expectVecsClose(decoded, vecs)
		})
	})

	describe('roundtrip all test cases', () => {
		for (const { name, vecs } of testCases) {
			it(`roundtrips correctly: ${name}`, () => {
				const encoded = vecsToBase64(vecs)
				const decoded = base64ToVecs(encoded)
				expectVecsClose(decoded, vecs)
			})
		}
	})

	describe.skipIf(!hasFullNativeSupport)('uses native implementation when available', () => {
		it('vecsToBase64 matches native implementation', () => {
			const vecs = [{ x: 1, y: 2, z: 0.5 }]
			expect(vecsToBase64(vecs)).toBe(nativeVecsToBase64(vecs))
		})

		it('base64ToVecs matches native implementation', () => {
			const encoded = nativeVecsToBase64([{ x: 1, y: 2, z: 0.5 }])
			const publicResult = base64ToVecs(encoded)
			const nativeResult = nativeBase64ToVecs(encoded)
			expect(publicResult).toEqual(nativeResult)
		})
	})

	describe.skipIf(hasFullNativeSupport)('uses custom implementation as fallback', () => {
		it('vecsToBase64 matches custom implementation', () => {
			const vecs = [{ x: 1, y: 2, z: 0.5 }]
			expect(vecsToBase64(vecs)).toBe(customVecsToBase64(vecs))
		})

		it('base64ToVecs matches custom implementation', () => {
			const encoded = customVecsToBase64([{ x: 1, y: 2, z: 0.5 }])
			const publicResult = base64ToVecs(encoded)
			const customResult = customBase64ToVecs(encoded)
			expectVecsClose(publicResult, customResult)
		})
	})
})

// =============================================================================
// Edge cases and special values
// =============================================================================

describe('edge cases', () => {
	it('handles z=undefined by defaulting to 0.5', () => {
		const vecs: VecModel[] = [{ x: 10, y: 20 }]
		const encoded = vecsToBase64(vecs)
		const decoded = base64ToVecs(encoded)
		expect(decoded[0].z).toBeCloseTo(0.5, 2)
	})

	it('handles many points (100 points)', () => {
		const vecs: VecModel[] = Array.from({ length: 100 }, (_, i) => ({
			x: i * 10,
			y: i * 5,
			z: 0.5 + (i % 10) * 0.05,
		}))
		const encoded = vecsToBase64(vecs)
		const decoded = base64ToVecs(encoded)
		expect(decoded.length).toBe(100)
		expectVecsClose(decoded, vecs)
	})

	it('preserves Float16 precision limits', () => {
		// Float16 has ~3 decimal digits of precision
		const vecs: VecModel[] = [{ x: 1.234, y: 5.678, z: 0.5 }]
		const encoded = vecsToBase64(vecs)
		const decoded = base64ToVecs(encoded)
		// Should be close but not exact due to Float16 precision
		expect(decoded[0].x).toBeCloseTo(1.234, 1)
		expect(decoded[0].y).toBeCloseTo(5.678, 1)
	})

	it('handles zero values', () => {
		const vecs: VecModel[] = [{ x: 0, y: 0, z: 0 }]
		const encoded = vecsToBase64(vecs)
		const decoded = base64ToVecs(encoded)
		expect(decoded[0].x).toBe(0)
		expect(decoded[0].y).toBe(0)
		expect(decoded[0].z).toBe(0)
	})

	it('handles max Float16 value (~65504)', () => {
		const vecs: VecModel[] = [{ x: 65000, y: 65000, z: 0.5 }]
		const encoded = vecsToBase64(vecs)
		const decoded = base64ToVecs(encoded)
		// Should be within Float16 precision
		expect(decoded[0].x).toBeCloseTo(65000, -2) // within ~100
		expect(decoded[0].y).toBeCloseTo(65000, -2)
	})
})

// =============================================================================
// Encoding format verification
// =============================================================================

describe('encoding format', () => {
	it('produces 8 base64 characters per point (6 bytes = 8 chars)', () => {
		const onePoint = vecsToBase64([{ x: 1, y: 2, z: 0.5 }])
		const twoPoints = vecsToBase64([
			{ x: 1, y: 2, z: 0.5 },
			{ x: 3, y: 4, z: 0.5 },
		])
		// 6 bytes per point = 8 base64 chars (6 * 8 / 6 = 8)
		expect(onePoint.length).toBe(8)
		expect(twoPoints.length).toBe(16)
	})

	it('output is valid base64 (can be decoded by atob)', () => {
		const encoded = vecsToBase64([
			{ x: 1, y: 2, z: 0.5 },
			{ x: 100, y: 200, z: 0.75 },
		])
		expect(() => atob(encoded)).not.toThrow()
	})
})
