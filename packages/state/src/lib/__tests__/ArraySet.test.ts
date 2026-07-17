import { ARRAY_SIZE_THRESHOLD, ArraySet } from '../ArraySet'

// Tests for SPEC.md §16 (ArraySet, internal).
// Rule IDs like [AS1] in test names refer to that document.

const get = <T>(set: ArraySet<T>) => {
	const s = new Set<T>()

	set.visit((i) => s.add(i))
	return s
}

describe(ArraySet, () => {
	it('[AS1] add and remove report whether they changed the set', () => {
		const as = new ArraySet<number>()

		expect(as.add(1)).toBe(true)
		expect(as.add(1)).toBe(false)
		expect(as.remove(1)).toBe(true)
		expect(as.remove(1)).toBe(false)

		// the same holds in set mode
		for (let i = 0; i < ARRAY_SIZE_THRESHOLD + 1; i++) {
			as.add(i)
		}
		expect(as.add(0)).toBe(false)
		expect(as.remove(0)).toBe(true)
		expect(as.remove(0)).toBe(false)
	})

	it('[AS2] has, size, isEmpty, visit, and iteration agree', () => {
		const as = new ArraySet<number>()

		expect(as.isEmpty).toBe(true)
		expect(as.size()).toBe(0)
		expect([...as]).toEqual([])

		as.add(1)
		as.add(2)
		as.add(3)

		expect(as.isEmpty).toBe(false)
		expect(as.size()).toBe(3)
		expect(as.has(2)).toBe(true)
		expect(as.has(4)).toBe(false)
		expect(new Set([...as])).toEqual(new Set([1, 2, 3]))
		expect(get(as)).toEqual(new Set([1, 2, 3]))

		as.clear()

		expect(as.isEmpty).toBe(true)
		expect(as.size()).toBe(0)
		expect(as.has(1)).toBe(false)
		expect([...as]).toEqual([])
	})

	it('[AS3] behaves identically across the array-to-set promotion boundary', () => {
		const as = new ArraySet<number>()
		const expected = new Set<number>()

		// fill exactly to the threshold (array mode)
		for (let i = 0; i < ARRAY_SIZE_THRESHOLD; i++) {
			expect(as.add(i)).toBe(true)
			expected.add(i)
		}
		expect(as.size()).toBe(ARRAY_SIZE_THRESHOLD)
		expect(get(as)).toEqual(expected)

		// one more promotes to set mode
		expect(as.add(ARRAY_SIZE_THRESHOLD)).toBe(true)
		expected.add(ARRAY_SIZE_THRESHOLD)

		expect(as.size()).toBe(ARRAY_SIZE_THRESHOLD + 1)
		expect(get(as)).toEqual(expected)
		expect(new Set([...as])).toEqual(expected)

		for (const value of expected) {
			expect(as.has(value)).toBe(true)
		}

		// removal works the same after promotion
		for (const value of expected) {
			expect(as.remove(value)).toBe(true)
		}
		expect(as.isEmpty).toBe(true)

		// clearing in set mode keeps working
		as.add(1)
		as.clear()
		expect(as.isEmpty).toBe(true)
		expect(as.add(1)).toBe(true)
	})

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
