import { uniq } from './uniq'

describe('uniq', () => {
	it('removes duplicates while keeping the first occurrence order', () => {
		expect(uniq([3, 1, 3, 2, 1])).toEqual([3, 1, 2])
	})

	it('returns an empty array for null, undefined and empty input', () => {
		expect(uniq(null)).toEqual([])
		expect(uniq(undefined)).toEqual([])
		expect(uniq([])).toEqual([])
	})

	it('accepts array-like objects', () => {
		expect(uniq({ length: 3, 0: 'a', 1: 'b', 2: 'a' })).toEqual(['a', 'b'])
	})

	it('compares objects by reference', () => {
		const a = { id: 1 }
		const b = { id: 1 }
		expect(uniq([a, a, b])).toEqual([a, b])
	})

	it('returns a new array rather than mutating the input', () => {
		const input = [1, 1, 2]
		const result = uniq(input)
		expect(result).not.toBe(input)
		expect(input).toEqual([1, 1, 2])
	})
})
