import { describe, expect, test } from 'vitest'
import { invLerp, lerp, modulate, rng } from './number'

describe('lerp', () => {
	test('should interpolate between two values correctly', () => {
		expect(lerp(0, 100, 0.5)).toBe(50)
		expect(lerp(10, 20, 0.25)).toBe(12.5)
		expect(lerp(-10, -5, 0.5)).toBe(-7.5)
	})

	test('should extrapolate when t is outside 0-1 range', () => {
		expect(lerp(0, 10, 1.5)).toBe(15)
		expect(lerp(0, 10, -0.5)).toBe(-5)
	})
})

describe('invLerp', () => {
	test('should find normalized position correctly', () => {
		expect(invLerp(0, 100, 25)).toBe(0.25)
		expect(invLerp(10, 20, 15)).toBe(0.5)
		expect(invLerp(-10, -5, -7.5)).toBe(0.5)
	})

	test('should handle values outside the range', () => {
		expect(invLerp(0, 10, 15)).toBe(1.5)
		expect(invLerp(0, 10, -5)).toBe(-0.5)
	})
})

describe('rng', () => {
	test('should generate deterministic results for same seed', () => {
		const random1 = rng('same-seed')
		const random2 = rng('same-seed')

		const values1 = [random1(), random1(), random1()]
		const values2 = [random2(), random2(), random2()]

		expect(values1).toEqual(values2)
	})

	test('should generate different results for different seeds', () => {
		const random1 = rng('seed-1')
		const random2 = rng('seed-2')

		const values1 = [random1(), random1(), random1()]
		const values2 = [random2(), random2(), random2()]

		expect(values1).not.toEqual(values2)
	})
})

describe('modulate', () => {
	test('should map value between ranges correctly', () => {
		expect(modulate(0, [0, 1], [0, 100])).toBe(0)
		expect(modulate(0.5, [0, 1], [0, 100])).toBe(50)
		expect(modulate(1, [0, 1], [0, 100])).toBe(100)
		expect(modulate(30, [10, 50], [100, 200])).toBe(150)
	})

	test('should extrapolate without clamping by default', () => {
		expect(modulate(2, [0, 1], [0, 100])).toBe(200)
		expect(modulate(-1, [0, 1], [0, 100])).toBe(-100)
	})

	test('should clamp results when clamp is true', () => {
		expect(modulate(2, [0, 1], [0, 100], true)).toBe(100)
		expect(modulate(-1, [0, 1], [0, 100], true)).toBe(0)
	})

	test('should handle clamping with reversed target range', () => {
		expect(modulate(2, [0, 1], [100, 0], true)).toBe(0)
		expect(modulate(-1, [0, 1], [100, 0], true)).toBe(100)
	})
})
