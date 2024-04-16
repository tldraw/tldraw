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

		if (r() > 0.5) {
			as.add(num)
			s.add(num)
		} else {
			as.remove(num)
			s.delete(num)
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
