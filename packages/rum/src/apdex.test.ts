import { describe, expect, it } from 'vitest'
import { computeApdex, p95 } from './apdex'

describe('computeApdex', () => {
	it('returns 1 for empty frame times', () => {
		expect(computeApdex([], 'resize')).toBe(1)
	})

	it('returns 1 when all frames are satisfied', () => {
		const frameTimes = [10, 12, 14, 16] // all < 16.67ms
		expect(computeApdex(frameTimes, 'resize')).toBe(1)
	})

	it('returns 0.5 when all frames are tolerating', () => {
		const frameTimes = [20, 25, 30, 33] // all between 16.67 and 33.33
		expect(computeApdex(frameTimes, 'resize')).toBe(0.5)
	})

	it('returns 0 when all frames are frustrated', () => {
		const frameTimes = [50, 60, 100, 200] // all > 33.33
		expect(computeApdex(frameTimes, 'resize')).toBe(0)
	})

	it('handles mixed frame times', () => {
		// 2 satisfied (10, 15), 1 tolerating (25), 1 frustrated (50)
		const frameTimes = [10, 15, 25, 50]
		// apdex = (2 + 1 * 0.5) / 4 = 2.5 / 4 = 0.625
		expect(computeApdex(frameTimes, 'resize')).toBe(0.625)
	})

	it('uses custom thresholds when provided', () => {
		// With custom thresholds: satisfied <= 8ms, tolerating <= 16ms
		const frameTimes = [5, 10, 20] // 1 satisfied, 1 tolerating, 1 frustrated
		const overrides = { resize: { satisfied: 8, tolerating: 16 } }
		// apdex = (1 + 1 * 0.5) / 3 = 0.5
		expect(computeApdex(frameTimes, 'resize', overrides)).toBe(0.5)
	})

	it('falls back to defaults for operations without overrides', () => {
		const frameTimes = [10] // satisfied at default threshold
		const overrides = { zoom: { satisfied: 8, tolerating: 16 } }
		expect(computeApdex(frameTimes, 'resize', overrides)).toBe(1)
	})
})

describe('p95', () => {
	it('returns 0 for empty array', () => {
		expect(p95([])).toBe(0)
	})

	it('returns the single value for one-element array', () => {
		expect(p95([42])).toBe(42)
	})

	it('returns the 95th percentile', () => {
		// 20 values: 1..20
		const values = Array.from({ length: 20 }, (_, i) => i + 1)
		// 95th percentile index: ceil(20 * 0.95) - 1 = 19 - 1 = 18 → value 19
		expect(p95(values)).toBe(19)
	})

	it('does not mutate the input array', () => {
		const values = [3, 1, 2]
		p95(values)
		expect(values).toEqual([3, 1, 2])
	})
})
