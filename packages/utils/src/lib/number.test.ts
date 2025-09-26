import { describe, expect, it, test } from 'vitest'
import { invLerp, lerp, modulate, rng } from './number'

describe('lerp', () => {
	test('should interpolate between two values correctly', () => {
		expect(lerp(0, 100, 0.5)).toBe(50)
		expect(lerp(10, 20, 0.25)).toBe(12.5)
		expect(lerp(0, 10, 0.75)).toBe(7.5)
	})

	it('should return start value when t is 0', () => {
		expect(lerp(5, 15, 0)).toBe(5)
		expect(lerp(-10, 10, 0)).toBe(-10)
		expect(lerp(0, 1, 0)).toBe(0)
	})

	it('should return end value when t is 1', () => {
		expect(lerp(5, 15, 1)).toBe(15)
		expect(lerp(-10, 10, 1)).toBe(10)
		expect(lerp(0, 1, 1)).toBe(1)
	})

	it('should handle negative values', () => {
		expect(lerp(-10, -5, 0.5)).toBe(-7.5)
		expect(lerp(-20, 20, 0.25)).toBe(-10)
		expect(lerp(10, -10, 0.5)).toBe(0)
	})

	it('should extrapolate when t is outside 0-1 range', () => {
		expect(lerp(0, 10, 1.5)).toBe(15) // Extrapolate beyond end
		expect(lerp(0, 10, -0.5)).toBe(-5) // Extrapolate before start
		expect(lerp(5, 15, 2)).toBe(25)
	})

	it('should handle floating point precision', () => {
		expect(lerp(0, 1, 0.1)).toBeCloseTo(0.1)
		expect(lerp(0, 1, 1 / 3)).toBeCloseTo(0.3333333333333333)
	})

	it('should handle identical start and end values', () => {
		expect(lerp(5, 5, 0.5)).toBe(5)
		expect(lerp(0, 0, 0.75)).toBe(0)
		expect(lerp(-1, -1, 0.25)).toBe(-1)
	})

	it('should handle zero values', () => {
		expect(lerp(0, 10, 0.3)).toBe(3)
		expect(lerp(-5, 0, 0.6)).toBe(-2)
		expect(lerp(0, 0, 0.5)).toBe(0)
	})
})

describe('invLerp', () => {
	test('should find normalized position correctly', () => {
		expect(invLerp(0, 100, 25)).toBe(0.25)
		expect(invLerp(10, 20, 15)).toBe(0.5)
		expect(invLerp(0, 10, 7.5)).toBe(0.75)
	})

	it('should return 0 when value equals start', () => {
		expect(invLerp(5, 15, 5)).toBe(0)
		expect(invLerp(-10, 10, -10)).toBe(0)
		expect(invLerp(0, 1, 0)).toBe(0)
	})

	it('should return 1 when value equals end', () => {
		expect(invLerp(5, 15, 15)).toBe(1)
		expect(invLerp(-10, 10, 10)).toBe(1)
		expect(invLerp(0, 1, 1)).toBe(1)
	})

	it('should handle negative values', () => {
		expect(invLerp(-10, -5, -7.5)).toBe(0.5)
		expect(invLerp(-20, 20, -10)).toBe(0.25)
		expect(invLerp(10, -10, 0)).toBe(0.5)
	})

	it('should handle values outside the range', () => {
		expect(invLerp(0, 10, 15)).toBe(1.5) // Above range
		expect(invLerp(0, 10, -5)).toBe(-0.5) // Below range
		expect(invLerp(5, 15, 25)).toBe(2)
	})

	it('should handle floating point precision', () => {
		expect(invLerp(0, 1, 0.1)).toBeCloseTo(0.1)
		expect(invLerp(0, 3, 1)).toBeCloseTo(1 / 3)
	})

	it('should return NaN for identical start and end values', () => {
		expect(invLerp(5, 5, 5)).toBeNaN()
		expect(invLerp(0, 0, 0)).toBeNaN()
		expect(invLerp(-1, -1, -1)).toBeNaN()
	})

	it('should be inverse of lerp', () => {
		const a = 10,
			b = 50,
			t = 0.3
		const lerped = lerp(a, b, t)
		const inversed = invLerp(a, b, lerped)
		expect(inversed).toBeCloseTo(t)

		// Test with different values
		const a2 = -20,
			b2 = 80,
			t2 = 0.75
		const lerped2 = lerp(a2, b2, t2)
		const inversed2 = invLerp(a2, b2, lerped2)
		expect(inversed2).toBeCloseTo(t2)
	})
})

describe('rng', () => {
	test('should return a function', () => {
		const random = rng('test')
		expect(typeof random).toBe('function')
	})

	it('should generate deterministic results for same seed', () => {
		const random1 = rng('same-seed')
		const random2 = rng('same-seed')

		const values1 = [random1(), random1(), random1()]
		const values2 = [random2(), random2(), random2()]

		expect(values1).toEqual(values2)
	})

	it('should generate different results for different seeds', () => {
		const random1 = rng('seed-1')
		const random2 = rng('seed-2')

		const values1 = [random1(), random1(), random1()]
		const values2 = [random2(), random2(), random2()]

		expect(values1).not.toEqual(values2)
	})

	it('should generate values between -1 and 1', () => {
		const random = rng('test-range')

		// Generate many values to test range
		for (let i = 0; i < 1000; i++) {
			const value = random()
			expect(value).toBeGreaterThanOrEqual(-1)
			expect(value).toBeLessThanOrEqual(1)
		}
	})

	it('should generate different values in sequence', () => {
		const random = rng('sequence-test')
		const values = []

		// Generate several values
		for (let i = 0; i < 10; i++) {
			values.push(random())
		}

		// Check that not all values are the same (very unlikely with good RNG)
		const uniqueValues = new Set(values)
		expect(uniqueValues.size).toBeGreaterThan(1)
	})

	it('should handle empty seed', () => {
		const random1 = rng()
		const random2 = rng('')

		// Should produce the same sequence for empty string and no argument
		expect(random1()).toBe(random2())
	})

	it('should handle long seeds', () => {
		const longSeed = 'this-is-a-very-long-seed-string-that-should-still-work-properly'
		const random = rng(longSeed)

		expect(typeof random()).toBe('number')
		expect(random()).toBeGreaterThanOrEqual(-1)
		expect(random()).toBeLessThanOrEqual(1)
	})

	it('should handle special characters in seed', () => {
		const specialSeed = '!@#$%^&*()_+-=[]{}|;:,.<>?'
		const random = rng(specialSeed)

		expect(typeof random()).toBe('number')
		expect(random()).toBeGreaterThanOrEqual(-1)
		expect(random()).toBeLessThanOrEqual(1)
	})

	it('should produce consistent results across multiple instances with same seed', () => {
		const seed = 'consistency-test'

		// Create multiple instances and compare first few values
		const instances = [rng(seed), rng(seed), rng(seed)]
		const firstValues = instances.map((r) => r())

		expect(firstValues[0]).toBe(firstValues[1])
		expect(firstValues[1]).toBe(firstValues[2])
	})
})

describe('modulate', () => {
	test('should map value between ranges correctly', () => {
		expect(modulate(0, [0, 1], [0, 100])).toBe(0)
		expect(modulate(0.5, [0, 1], [0, 100])).toBe(50)
		expect(modulate(1, [0, 1], [0, 100])).toBe(100)
	})

	it('should handle different input ranges', () => {
		expect(modulate(5, [0, 10], [0, 100])).toBe(50)
		expect(modulate(15, [10, 20], [0, 100])).toBe(50)
		expect(modulate(0, [-10, 10], [0, 100])).toBe(50)
	})

	it('should handle negative ranges', () => {
		expect(modulate(0.5, [0, 1], [-100, 100])).toBe(0)
		expect(modulate(0, [0, 1], [-100, 100])).toBe(-100)
		expect(modulate(1, [0, 1], [-100, 100])).toBe(100)
	})

	it('should handle reversed ranges', () => {
		expect(modulate(0, [0, 1], [100, 0])).toBe(100)
		expect(modulate(0.5, [0, 1], [100, 0])).toBe(50)
		expect(modulate(1, [0, 1], [100, 0])).toBe(0)
	})

	it('should extrapolate without clamping by default', () => {
		expect(modulate(2, [0, 1], [0, 100])).toBe(200)
		expect(modulate(-1, [0, 1], [0, 100])).toBe(-100)
		expect(modulate(1.5, [0, 1], [0, 100])).toBe(150)
	})

	it('should clamp results when clamp is true', () => {
		expect(modulate(2, [0, 1], [0, 100], true)).toBe(100)
		expect(modulate(-1, [0, 1], [0, 100], true)).toBe(0)
		expect(modulate(1.5, [0, 1], [0, 100], true)).toBe(100)
	})

	it('should handle clamping with reversed target range', () => {
		expect(modulate(2, [0, 1], [100, 0], true)).toBe(0) // Clamped to minimum
		expect(modulate(-1, [0, 1], [100, 0], true)).toBe(100) // Clamped to maximum
	})

	it('should handle identical source range boundaries', () => {
		expect(modulate(5, [5, 5], [0, 100])).toBeNaN() // Division by zero
	})

	it('should handle identical target range boundaries', () => {
		expect(modulate(0.5, [0, 1], [50, 50])).toBe(50)
		expect(modulate(0, [0, 1], [50, 50])).toBe(50)
		expect(modulate(1, [0, 1], [50, 50])).toBe(50)
	})

	it('should handle floating point precision', () => {
		expect(modulate(1 / 3, [0, 1], [0, 100])).toBeCloseTo(33.333333333333336)
		expect(modulate(0.1, [0, 1], [0, 10])).toBeCloseTo(1)
	})

	it('should work with the example from JSDoc', () => {
		const result = modulate(0, [0, 1], [0, 100])
		expect(result).toBe(0)
	})

	it('should handle complex range mappings', () => {
		// Map from [10, 50] to [100, 200]
		expect(modulate(30, [10, 50], [100, 200])).toBe(150)
		expect(modulate(10, [10, 50], [100, 200])).toBe(100)
		expect(modulate(50, [10, 50], [100, 200])).toBe(200)
	})

	it('should be consistent with lerp and invLerp', () => {
		const value = 30
		const rangeA = [10, 50]
		const rangeB = [100, 200]

		// Manual calculation using lerp and invLerp
		const t = invLerp(rangeA[0], rangeA[1], value)
		const expected = lerp(rangeB[0], rangeB[1], t)
		const actual = modulate(value, rangeA, rangeB)

		expect(actual).toBeCloseTo(expected)
	})

	it('should handle edge values in clamping', () => {
		// Test exact boundary values
		expect(modulate(1, [0, 1], [0, 100], true)).toBe(100)
		expect(modulate(0, [0, 1], [0, 100], true)).toBe(0)

		// Test slightly outside boundaries
		expect(modulate(1.00001, [0, 1], [0, 100], true)).toBe(100)
		expect(modulate(-0.00001, [0, 1], [0, 100], true)).toBe(0)
	})
})

describe('integration tests', () => {
	it('should work well together for complex transformations', () => {
		// Example: Transform a value from one range to another and back
		const originalValue = 7.5
		const rangeA = [0, 10]
		const rangeB = [100, 200]

		// Transform to range B
		const transformed = modulate(originalValue, rangeA, rangeB)
		expect(transformed).toBe(175)

		// Transform back to range A
		const backTransformed = modulate(transformed, rangeB, rangeA)
		expect(backTransformed).toBeCloseTo(originalValue)
	})

	it('should handle random value transformations', () => {
		const random = rng('integration-test')

		// Generate random values and transform them
		for (let i = 0; i < 100; i++) {
			const randomValue = random() // -1 to 1
			const normalized = invLerp(-1, 1, randomValue) // 0 to 1
			const scaled = lerp(0, 100, normalized) // 0 to 100
			const modulated = modulate(randomValue, [-1, 1], [0, 100]) // Direct transformation

			expect(scaled).toBeCloseTo(modulated)
		}
	})

	it('should maintain precision through multiple transformations', () => {
		let value = 0.12345

		// Apply multiple transformations
		value = lerp(0, 100, value)
		value = invLerp(0, 100, value)
		value = modulate(value, [0, 1], [0, 1000])
		value = modulate(value, [0, 1000], [0, 1])

		expect(value).toBeCloseTo(0.12345)
	})
})
