import { vi } from 'vitest'
import { WeakCache } from './cache'

describe('WeakCache', () => {
	describe('constructor', () => {
		it('should create a new WeakCache instance', () => {
			const cache = new WeakCache<object, string>()
			expect(cache).toBeInstanceOf(WeakCache)
			expect(cache.items).toBeInstanceOf(WeakMap)
		})
	})

	describe('get method', () => {
		it('should compute and cache value on first call', () => {
			const cache = new WeakCache<{ id: number }, string>()
			const key = { id: 1 }
			const callback = vi.fn((item: { id: number }) => `value-${item.id}`)

			const result = cache.get(key, callback)

			expect(result).toBe('value-1')
			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback).toHaveBeenCalledWith(key)
		})

		it('should return cached value on subsequent calls', () => {
			const cache = new WeakCache<{ id: number }, string>()
			const key = { id: 1 }
			const callback = vi.fn((item: { id: number }) => `value-${item.id}`)

			const result1 = cache.get(key, callback)
			const result2 = cache.get(key, callback)
			const result3 = cache.get(key, callback)

			expect(result1).toBe('value-1')
			expect(result2).toBe('value-1')
			expect(result3).toBe('value-1')
			expect(callback).toHaveBeenCalledTimes(1)
		})

		it('should return the same object reference for cached values', () => {
			const cache = new WeakCache<{ id: number }, { computed: string }>()
			const key = { id: 1 }
			const callback = vi.fn((item: { id: number }) => ({ computed: `value-${item.id}` }))

			const result1 = cache.get(key, callback)
			const result2 = cache.get(key, callback)

			expect(result1).toBe(result2) // Same object reference
			expect(callback).toHaveBeenCalledTimes(1)
		})

		it('should work with different key objects', () => {
			const cache = new WeakCache<{ id: number }, string>()
			const key1 = { id: 1 }
			const key2 = { id: 2 }
			const callback = vi.fn((item: { id: number }) => `value-${item.id}`)

			const result1 = cache.get(key1, callback)
			const result2 = cache.get(key2, callback)

			expect(result1).toBe('value-1')
			expect(result2).toBe('value-2')
			expect(callback).toHaveBeenCalledTimes(2)
			expect(callback).toHaveBeenNthCalledWith(1, key1)
			expect(callback).toHaveBeenNthCalledWith(2, key2)
		})

		it('should handle complex object keys', () => {
			interface User {
				id: number
				name: string
				metadata: { role: string }
			}

			const cache = new WeakCache<User, string>()
			const user: User = {
				id: 1,
				name: 'Alice',
				metadata: { role: 'admin' },
			}
			const callback = vi.fn((u: User) => `${u.name} (${u.metadata.role}) #${u.id}`)

			const result = cache.get(user, callback)

			expect(result).toBe('Alice (admin) #1')
			expect(callback).toHaveBeenCalledWith(user)
		})

		it('should handle different callbacks for the same key', () => {
			const cache = new WeakCache<{ id: number }, string>()
			const key = { id: 1 }
			const callback1 = vi.fn(() => 'first-computation')
			const callback2 = vi.fn(() => 'second-computation')

			const result1 = cache.get(key, callback1)
			const result2 = cache.get(key, callback2)

			expect(result1).toBe('first-computation')
			expect(result2).toBe('first-computation') // Should return cached value
			expect(callback1).toHaveBeenCalledTimes(1)
			expect(callback2).not.toHaveBeenCalled() // Second callback should not be called
		})

		it('should handle null and undefined return values', () => {
			const cache = new WeakCache<object, string | null | undefined>()
			const key1 = { type: 'null' }
			const key2 = { type: 'undefined' }

			const result1 = cache.get(key1, () => null)
			const result2 = cache.get(key2, () => undefined)

			expect(result1).toBe(null)
			expect(result2).toBe(undefined)

			// Should return cached values
			const result3 = cache.get(key1, () => 'should-not-be-called')
			const result4 = cache.get(key2, () => 'should-not-be-called')

			expect(result3).toBe(null)
			expect(result4).toBe(undefined)
		})

		it('should work with array keys', () => {
			const cache = new WeakCache<number[], string>()
			const arrayKey = [1, 2, 3]
			const callback = vi.fn((arr: number[]) => `sum:${arr.reduce((a, b) => a + b, 0)}`)

			const result = cache.get(arrayKey, callback)

			expect(result).toBe('sum:6')
			expect(callback).toHaveBeenCalledWith(arrayKey)
		})

		it('should work with function keys', () => {
			const cache = new WeakCache<Function, string>()
			const fnKey = () => 'test'
			const callback = vi.fn((fn: Function) => `fn:${fn.name}`)

			const result = cache.get(fnKey, callback)

			expect(result).toBe('fn:fnKey')
			expect(callback).toHaveBeenCalledWith(fnKey)
		})

		it('should handle expensive computations efficiently', () => {
			const cache = new WeakCache<{ size: number }, number[]>()
			const key = { size: 1000 }
			const expensiveCallback = vi.fn((item: { size: number }) => {
				// Simulate expensive computation
				return new Array(item.size).fill(0).map((_, i) => i * i)
			})

			const start = performance.now()
			const result1 = cache.get(key, expensiveCallback)
			const firstCallTime = performance.now() - start

			const start2 = performance.now()
			const result2 = cache.get(key, expensiveCallback)
			const secondCallTime = performance.now() - start2

			expect(result1).toBe(result2)
			expect(result1).toHaveLength(1000)
			expect(result1[999]).toBe(999 * 999)
			expect(expensiveCallback).toHaveBeenCalledTimes(1)
			expect(secondCallTime).toBeLessThan(firstCallTime) // Cached call should be faster
		})

		it('should maintain separate cache entries for similar but different objects', () => {
			const cache = new WeakCache<{ id: number }, string>()
			const key1 = { id: 1 }
			const key2 = { id: 1 } // Different object with same properties
			const callback = vi.fn((item: { id: number }) => `value-${item.id}-${Math.random()}`)

			const result1 = cache.get(key1, callback)
			const result2 = cache.get(key2, callback)

			expect(result1).not.toBe(result2) // Different results for different object instances
			expect(callback).toHaveBeenCalledTimes(2)
		})

		it('should handle callbacks that throw errors', () => {
			const cache = new WeakCache<object, string>()
			const key = { id: 1 }
			const errorCallback = vi.fn(() => {
				throw new Error('Computation failed')
			})

			expect(() => cache.get(key, errorCallback)).toThrow('Computation failed')
			expect(errorCallback).toHaveBeenCalledTimes(1)

			// Subsequent calls should still throw (error not cached)
			expect(() => cache.get(key, errorCallback)).toThrow('Computation failed')
			expect(errorCallback).toHaveBeenCalledTimes(2)
		})

		it('should work correctly with primitive wrapper objects', () => {
			const cache = new WeakCache<String, string>()
			const key = new String('test')
			const callback = vi.fn((str: String) => `processed:${str.toString()}`)

			const result = cache.get(key, callback)

			expect(result).toBe('processed:test')
			expect(callback).toHaveBeenCalledWith(key)
		})
	})

	describe('type safety', () => {
		it('should maintain type safety for generic parameters', () => {
			// This test ensures TypeScript compilation works correctly
			const stringCache = new WeakCache<{ id: number }, string>()
			const numberCache = new WeakCache<{ id: string }, number>()

			const stringKey = { id: 1 }
			const numberKey = { id: 'test' }

			const stringResult = stringCache.get(stringKey, (k) => `value:${k.id}`)
			const numberResult = numberCache.get(numberKey, (k) => k.id.length)

			expect(typeof stringResult).toBe('string')
			expect(typeof numberResult).toBe('number')
			expect(stringResult).toBe('value:1')
			expect(numberResult).toBe(4)
		})

		it('should work with union types', () => {
			const cache = new WeakCache<object, string | number>()
			const key1 = { type: 'string' }
			const key2 = { type: 'number' }

			const result1 = cache.get(key1, () => 'text')
			const result2 = cache.get(key2, () => 42)

			expect(result1).toBe('text')
			expect(result2).toBe(42)
		})
	})

	describe('memory and garbage collection behavior', () => {
		it('should not prevent garbage collection of keys', () => {
			// This is more of a conceptual test since we can't easily force GC in tests
			// But we can verify the WeakMap structure is set up correctly
			const cache = new WeakCache<object, string>()

			expect(cache.items).toBeInstanceOf(WeakMap)

			// Verify we can create and cache many objects without memory leaks
			// (in a real scenario, unused objects would be GC'd)
			for (let i = 0; i < 100; i++) {
				const tempKey = { id: i }
				cache.get(tempKey, (k) => `temp:${k.id}`)
			}

			// The cache should work normally
			const permanentKey = { id: 'permanent' }
			const result = cache.get(permanentKey, (k) => `perm:${k.id}`)
			expect(result).toBe('perm:permanent')
		})
	})

	describe('edge cases', () => {
		it('should handle keys with circular references', () => {
			interface CircularObj {
				id: number
				self?: CircularObj
			}

			const cache = new WeakCache<CircularObj, string>()
			const circularKey: CircularObj = { id: 1 }
			circularKey.self = circularKey

			const result = cache.get(circularKey, (obj) => `circular:${obj.id}`)

			expect(result).toBe('circular:1')
		})

		it('should handle keys with complex prototype chains', () => {
			class BaseClass {
				constructor(public baseId: number) {}
			}

			class DerivedClass extends BaseClass {
				constructor(
					baseId: number,
					public derivedId: string
				) {
					super(baseId)
				}
			}

			const cache = new WeakCache<BaseClass, string>()
			const derived = new DerivedClass(1, 'test')

			const result = cache.get(derived, (obj) => `class:${obj.baseId}`)

			expect(result).toBe('class:1')
		})

		it('should handle callbacks that return the key itself', () => {
			const cache = new WeakCache<{ id: number }, { id: number }>()
			const key = { id: 42 }

			const result = cache.get(key, (k) => k)

			expect(result).toBe(key)
			expect(result).toEqual({ id: 42 })
		})
	})
})
