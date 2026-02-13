import { vi } from 'vitest'
import { WeakCache } from './cache'

describe('WeakCache', () => {
	it('should compute and cache value on first call, return cached value on subsequent calls', () => {
		const cache = new WeakCache<{ id: number }, string>()
		const key = { id: 1 }
		const callback = vi.fn((item: { id: number }) => `value-${item.id}`)

		const result1 = cache.get(key, callback)
		const result2 = cache.get(key, callback)

		expect(result1).toBe('value-1')
		expect(result2).toBe('value-1')
		expect(result1).toBe(result2) // Same reference
		expect(callback).toHaveBeenCalledTimes(1)
	})

	it('should handle different callbacks for the same key', () => {
		const cache = new WeakCache<{ id: number }, string>()
		const key = { id: 1 }
		const callback1 = vi.fn(() => 'first-computation')
		const callback2 = vi.fn(() => 'second-computation')

		const result1 = cache.get(key, callback1)
		const result2 = cache.get(key, callback2)

		expect(result1).toBe('first-computation')
		expect(result2).toBe('first-computation')
		expect(callback1).toHaveBeenCalledTimes(1)
		expect(callback2).not.toHaveBeenCalled()
	})

	it('should maintain separate cache entries for different object references', () => {
		const cache = new WeakCache<{ id: number }, string>()
		const key1 = { id: 1 }
		const key2 = { id: 1 } // Different object with same properties
		const callback = vi.fn((item: { id: number }) => `value-${item.id}`)

		const _result1 = cache.get(key1, callback)
		const _result2 = cache.get(key2, callback)

		expect(callback).toHaveBeenCalledTimes(2)
	})

	it('should handle null and undefined return values', () => {
		const cache = new WeakCache<object, string | null | undefined>()
		const key1 = { type: 'null' }
		const key2 = { type: 'undefined' }

		const result1 = cache.get(key1, () => null)
		const result2 = cache.get(key2, () => undefined)
		const result3 = cache.get(key1, () => 'should-not-be-called')
		const result4 = cache.get(key2, () => 'should-not-be-called')

		expect(result1).toBe(null)
		expect(result2).toBe(undefined)
		expect(result3).toBe(null)
		expect(result4).toBe(undefined)
	})

	it('should not cache errors - callbacks that throw should be re-executed', () => {
		const cache = new WeakCache<object, string>()
		const key = { id: 1 }
		const errorCallback = vi.fn(() => {
			throw new Error('Computation failed')
		})

		expect(() => cache.get(key, errorCallback)).toThrow('Computation failed')
		expect(() => cache.get(key, errorCallback)).toThrow('Computation failed')
		expect(errorCallback).toHaveBeenCalledTimes(2)
	})
})
