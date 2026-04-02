import { describe, expect, it } from 'vitest'
import { bucketShapeCount } from './context'

describe('bucketShapeCount', () => {
	it('returns 0-50 for 0 shapes', () => {
		expect(bucketShapeCount(0)).toBe('0-50')
	})

	it('returns 0-50 for 50 shapes', () => {
		expect(bucketShapeCount(50)).toBe('0-50')
	})

	it('returns 50-200 for 51 shapes', () => {
		expect(bucketShapeCount(51)).toBe('50-200')
	})

	it('returns 50-200 for 200 shapes', () => {
		expect(bucketShapeCount(200)).toBe('50-200')
	})

	it('returns 200-500 for 201 shapes', () => {
		expect(bucketShapeCount(201)).toBe('200-500')
	})

	it('returns 200-500 for 500 shapes', () => {
		expect(bucketShapeCount(500)).toBe('200-500')
	})

	it('returns 500+ for 501 shapes', () => {
		expect(bucketShapeCount(501)).toBe('500+')
	})

	it('returns 500+ for very large counts', () => {
		expect(bucketShapeCount(10000)).toBe('500+')
	})
})
