import { LruCache } from './LruCache'

describe('LruCache', () => {
	it('stores and retrieves values', () => {
		const cache = new LruCache<string, number>(3)
		cache.set('a', 1)
		cache.set('b', 2)
		expect(cache.get('a')).toBe(1)
		expect(cache.get('b')).toBe(2)
		expect(cache.get('c')).toBeUndefined()
	})

	it('reports size', () => {
		const cache = new LruCache<string, number>(5)
		expect(cache.size).toBe(0)
		cache.set('a', 1)
		expect(cache.size).toBe(1)
		cache.set('b', 2)
		expect(cache.size).toBe(2)
	})

	it('has() checks existence without promoting', () => {
		const cache = new LruCache<string, number>(2)
		cache.set('a', 1)
		cache.set('b', 2)
		expect(cache.has('a')).toBe(true)
		expect(cache.has('z')).toBe(false)

		// 'a' was not promoted by has(), so adding 'c' should evict 'a'
		cache.set('c', 3)
		expect(cache.has('a')).toBe(false)
	})

	it('evicts the oldest entry when exceeding capacity', () => {
		const cache = new LruCache<string, number>(2)
		cache.set('a', 1)
		cache.set('b', 2)
		cache.set('c', 3) // should evict 'a'

		expect(cache.get('a')).toBeUndefined()
		expect(cache.get('b')).toBe(2)
		expect(cache.get('c')).toBe(3)
		expect(cache.size).toBe(2)
	})

	it('get() promotes entry so it is not evicted next', () => {
		const cache = new LruCache<string, number>(2)
		cache.set('a', 1)
		cache.set('b', 2)

		// Access 'a' to promote it; now 'b' is oldest
		cache.get('a')
		cache.set('c', 3) // should evict 'b', not 'a'

		expect(cache.get('b')).toBeUndefined()
		expect(cache.get('a')).toBe(1)
		expect(cache.get('c')).toBe(3)
	})

	it('set() on existing key updates value and promotes it', () => {
		const cache = new LruCache<string, number>(2)
		cache.set('a', 1)
		cache.set('b', 2)

		// Update 'a' — promotes it, 'b' becomes oldest
		cache.set('a', 10)
		expect(cache.get('a')).toBe(10)

		cache.set('c', 3) // should evict 'b'
		expect(cache.get('b')).toBeUndefined()
		expect(cache.get('a')).toBe(10)
		expect(cache.size).toBe(2)
	})

	it('evicts entries in insertion order across many inserts', () => {
		const cache = new LruCache<number, number>(3)
		for (let i = 0; i < 10; i++) {
			cache.set(i, i * 10)
		}
		// Only the last 3 should remain
		expect(cache.size).toBe(3)
		expect(cache.get(7)).toBe(70)
		expect(cache.get(8)).toBe(80)
		expect(cache.get(9)).toBe(90)
		for (let i = 0; i < 7; i++) {
			expect(cache.has(i)).toBe(false)
		}
	})
})
