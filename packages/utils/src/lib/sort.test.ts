import { describe, expect, it } from 'vitest'
import { sortById } from './sort'

describe('sortById', () => {
	it('sorts objects with string ids in ascending order', () => {
		const items = [
			{ id: 'c', name: 'Charlie' },
			{ id: 'a', name: 'Alice' },
			{ id: 'b', name: 'Bob' },
		]

		const sorted = items.sort(sortById)

		expect(sorted).toEqual([
			{ id: 'a', name: 'Alice' },
			{ id: 'b', name: 'Bob' },
			{ id: 'c', name: 'Charlie' },
		])
	})

	it('sorts objects with numeric ids in ascending order', () => {
		const items = [
			{ id: 3, label: 'three' },
			{ id: 1, label: 'one' },
			{ id: 2, label: 'two' },
		]

		const sorted = items.sort(sortById)

		expect(sorted).toEqual([
			{ id: 1, label: 'one' },
			{ id: 2, label: 'two' },
			{ id: 3, label: 'three' },
		])
	})
})
