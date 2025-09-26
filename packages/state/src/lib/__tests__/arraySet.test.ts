import { describe, expect, it } from 'vitest'
import { ARRAY_SIZE_THRESHOLD, ArraySet } from '../ArraySet'

const get = <T>(set: ArraySet<T>) => {
	const s = new Set<T>()
	set.visit((i) => s.add(i))
	return s
}

describe(ArraySet, () => {
	it('works with small numbers of things', () => {
		const as = new ArraySet<number>()

		expect(as.isEmpty).toBe(true)

		as.add(3)
		as.add(5)
		as.add(8)
		as.add(9)

		expect(get(as)).toEqual(new Set([3, 5, 8, 9]))

		as.remove(8)

		expect(get(as)).toEqual(new Set([3, 5, 9]))

		as.add(10)

		expect(get(as)).toEqual(new Set([3, 5, 9, 10]))

		as.add(12)

		expect(get(as)).toEqual(new Set([3, 5, 9, 10, 12]))

		as.remove(5)
		as.remove(9)

		expect(get(as)).toEqual(new Set([3, 10, 12]))

		as.remove(9)

		expect(get(as)).toEqual(new Set([3, 10, 12]))

		as.add(123)
		as.add(234)

		expect(get(as)).toEqual(new Set([3, 10, 12, 123, 234]))

		expect(as.isEmpty).toBe(false)

		as.remove(123)
		as.remove(234)
		as.remove(3)
		as.remove(10)
		expect(as.isEmpty).toBe(false)
		as.remove(12)
		expect(as.isEmpty).toBe(true)
	})

	it('works with large numbers of things', () => {
		const as = new ArraySet<number>()

		expect(as.isEmpty).toBe(true)
		for (let i = 0; i < 100; i++) {
			as.add(i)
		}

		expect(get(as)).toEqual(new Set(Array.from({ length: 100 }, (_, i) => i)))

		expect(as.isEmpty).toBe(false)
		for (let i = 0; i < 100; i++) {
			as.remove(i)
		}

		expect(get(as)).toEqual(new Set())
		expect(as.isEmpty).toBe(true)
	})

	it('transitions to Set mode when threshold exceeded', () => {
		const as = new ArraySet<number>()

		// Fill up to threshold
		for (let i = 0; i < ARRAY_SIZE_THRESHOLD; i++) {
			expect(as.add(i)).toBe(true)
		}

		expect(as.size()).toBe(ARRAY_SIZE_THRESHOLD)

		// This addition should trigger conversion to Set
		expect(as.add(ARRAY_SIZE_THRESHOLD)).toBe(true)
		expect(as.size()).toBe(ARRAY_SIZE_THRESHOLD + 1)

		// Verify all elements are still present
		for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
			expect(as.has(i)).toBe(true)
		}
	})

	it('handles null and undefined values in array mode', () => {
		const as = new ArraySet<string | null | undefined>()
		expect(as.add(null)).toBe(true)
		expect(as.add(undefined)).toBe(true)
		expect(as.add(null)).toBe(false) // duplicate
		expect(as.has(null)).toBe(true)
		expect(as.has(undefined)).toBe(true)
		expect(as.size()).toBe(2)

		// undefined values are filtered out during visit due to internal implementation
		const visited: (string | null | undefined)[] = []
		as.visit((item) => visited.push(item))
		expect(visited).toContain(null)
		expect(visited).not.toContain(undefined)
		expect(visited).toHaveLength(1)
	})

	it('maintains consistency across add/remove operations', () => {
		const as = new ArraySet<number>()
		const reference = new Set<number>()

		// Add some initial elements
		for (let i = 0; i < 5; i++) {
			as.add(i)
			reference.add(i)
		}

		// Mix of operations
		as.remove(2)
		reference.delete(2)

		as.add(10)
		reference.add(10)

		as.remove(0)
		reference.delete(0)

		// Verify consistency
		expect(get(as)).toEqual(reference)
		expect(as.size()).toBe(reference.size)
	})

	it('supports iteration', () => {
		const as = new ArraySet<string>()
		as.add('a')
		as.add('b')
		as.add('c')

		const items = [...as]
		expect(items).toContain('a')
		expect(items).toContain('b')
		expect(items).toContain('c')
		expect(items).toHaveLength(3)
	})

	it('throws error when internal state is corrupted', () => {
		const as = new ArraySet<string>()
		// Force both array and set to be null (simulating corruption)
		;(as as any).array = null
		;(as as any).set = null

		expect(() => as.isEmpty).toThrow('no set or array')
		expect(() => as.add('test')).toThrow('no set or array')
		expect(() => as.remove('test')).toThrow('no set or array')
		expect(() => as.visit(() => {})).toThrow('no set or array')
		expect(() => [...as]).toThrow('no set or array')
	})
})

function rng(seed: number) {
	return () => {
		const x = Math.sin(seed++) * 10000
		return x - Math.floor(x)
	}
}

function runTest(seed: number) {
	const as = new ArraySet<number>()
	const s = new Set<number>()
	const r = rng(seed)

	const nums = new Array(ARRAY_SIZE_THRESHOLD * 2).fill(0).map(() => Math.floor(r() * 100))

	for (let i = 0; i < 1000; i++) {
		const num = nums[Math.floor(r() * nums.length)]

		const choice = r()
		if (choice < 0.45) {
			as.add(num)
			s.add(num)
		} else if (choice < 0.9) {
			as.remove(num)
			s.delete(num)
		} else {
			as.clear()
			s.clear()
		}

		try {
			expect(get(as)).toEqual(s)
		} catch (e) {
			console.error('Failed on iteration', i, 'with seed', seed)
			throw e
		}
	}
}

describe('fuzzing this thing (if this fails tell david)', () => {
	new Array(10).fill(0).forEach(() => {
		const seed = Math.floor(Math.random() * 1000000)
		it(`fuzz with seed ${seed}`, () => {
			runTest(seed)
		})
	})
})

describe('regression tests', () => {
	it('passes with seed 354923', () => {
		runTest(354923)
	})
})
