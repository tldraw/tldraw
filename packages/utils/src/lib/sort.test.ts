import { describe, expect, it } from 'vitest'
import { sortByCreatedAt, sortById } from './sort'

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

describe('sortByCreatedAt', () => {
	it('sorts oldest first', () => {
		const items = [
			{ id: 'a', createdAt: 300 },
			{ id: 'b', createdAt: 100 },
			{ id: 'c', createdAt: 200 },
		]

		expect(items.sort(sortByCreatedAt)).toEqual([
			{ id: 'b', createdAt: 100 },
			{ id: 'c', createdAt: 200 },
			{ id: 'a', createdAt: 300 },
		])
	})

	it('breaks ties on id', () => {
		const items = [
			{ id: 'c', createdAt: 100 },
			{ id: 'a', createdAt: 100 },
			{ id: 'b', createdAt: 100 },
		]

		expect(items.sort(sortByCreatedAt)).toEqual([
			{ id: 'a', createdAt: 100 },
			{ id: 'b', createdAt: 100 },
			{ id: 'c', createdAt: 100 },
		])
	})

	it('gives the same order regardless of input order', () => {
		const tied = [
			{ id: 'comment:x', createdAt: 100 },
			{ id: 'comment:y', createdAt: 100 },
			{ id: 'comment:z', createdAt: 100 },
		]

		expect([...tied].sort(sortByCreatedAt)).toEqual([...tied].reverse().sort(sortByCreatedAt))
	})

	it('returns 0 only when both fields match', () => {
		expect(sortByCreatedAt({ id: 'a', createdAt: 1 }, { id: 'a', createdAt: 1 })).toBe(0)
		expect(sortByCreatedAt({ id: 'a', createdAt: 1 }, { id: 'b', createdAt: 1 })).toBeLessThan(0)
		expect(sortByCreatedAt({ id: 'b', createdAt: 1 }, { id: 'a', createdAt: 1 })).toBeGreaterThan(0)
		expect(sortByCreatedAt({ id: 'b', createdAt: 1 }, { id: 'a', createdAt: 2 })).toBeLessThan(0)
		expect(sortByCreatedAt({ id: 'a', createdAt: 2 }, { id: 'b', createdAt: 1 })).toBeGreaterThan(0)
	})

	it('reverses cleanly for newest-first, ties included', () => {
		const items = [
			{ id: 'b', createdAt: 100 },
			{ id: 'c', createdAt: 200 },
			{ id: 'a', createdAt: 100 },
		]

		expect([...items].sort((a, b) => sortByCreatedAt(b, a))).toEqual([
			{ id: 'c', createdAt: 200 },
			{ id: 'b', createdAt: 100 },
			{ id: 'a', createdAt: 100 },
		])
	})

	it('stays total when a timestamp is not a number', () => {
		// A NaN timestamp makes every relational comparison false; the id has to carry the order,
		// or the comparator returns NaN and the sort result becomes implementation-defined.
		expect(sortByCreatedAt({ id: 'a', createdAt: NaN }, { id: 'b', createdAt: NaN })).toBeLessThan(
			0
		)
		expect(
			sortByCreatedAt({ id: 'b', createdAt: NaN }, { id: 'a', createdAt: NaN })
		).toBeGreaterThan(0)

		const tied = [
			{ id: 'x', createdAt: NaN },
			{ id: 'y', createdAt: NaN },
			{ id: 'z', createdAt: NaN },
		]
		expect([...tied].sort(sortByCreatedAt)).toEqual([...tied].reverse().sort(sortByCreatedAt))
	})
})
