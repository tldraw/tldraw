import {
	CenteredItem,
	findNearestItemInDirection,
	getAdjacentIndex,
	sortIntoReadingOrder,
} from './readingOrder'

function item(payload: string, x: number, y: number): CenteredItem<string> {
	return { payload, center: { x, y } }
}

describe('sortIntoReadingOrder', () => {
	it('returns a single item unchanged', () => {
		expect(sortIntoReadingOrder([item('a', 500, 500)])).toEqual(['a'])
	})

	it('sorts a row left to right', () => {
		expect(sortIntoReadingOrder([item('c', 200, 0), item('a', 0, 10), item('b', 100, 20)])).toEqual(
			['a', 'b', 'c']
		)
	})

	it('groups shapes more than the row threshold apart into separate rows', () => {
		expect(sortIntoReadingOrder([item('c', 0, 300), item('b', 100, 0), item('a', 0, 0)])).toEqual([
			'a',
			'b',
			'c',
		])
	})

	it('keeps shapes within the row threshold in one row', () => {
		// 60 apart vertically, so they stay in a row and order by x
		expect(sortIntoReadingOrder([item('b', 100, 0), item('a', 0, 60)])).toEqual(['a', 'b'])
	})

	it('swaps a nearer shape ahead of an off-axis one at a shallow angle', () => {
		// b sits off-axis and further away than c, and c is at a 0 degree angle from a
		expect(sortIntoReadingOrder([item('a', 0, 0), item('b', 10, 60), item('c', 20, 0)])).toEqual([
			'a',
			'c',
			'b',
		])
	})

	it('leaves an evenly spaced row alone', () => {
		expect(sortIntoReadingOrder([item('a', 0, 0), item('b', 10, 0), item('c', 20, 0)])).toEqual([
			'a',
			'b',
			'c',
		])
	})
})

describe('findNearestItemInDirection', () => {
	const around = [
		item('right', 100, 0),
		item('left', -100, 0),
		item('up', 0, -100),
		item('down', 0, 100),
	]

	it.each(['right', 'left', 'up', 'down'] as const)('finds the %s item', (direction) => {
		expect(findNearestItemInDirection(around, { x: 0, y: 0 }, direction)).toBe(direction)
	})

	it('returns null when nothing lies in the direction', () => {
		expect(findNearestItemInDirection([item('left', -100, 0)], { x: 0, y: 0 }, 'right')).toBe(null)
	})

	it('prefers an aligned shape over a nearer diagonal one', () => {
		const items = [item('diagonal', 100, 100), item('aligned', 200, 0)]
		expect(findNearestItemInDirection(items, { x: 0, y: 0 }, 'right')).toBe('aligned')
	})

	it('ignores shapes more than twice as far off-axis as along it', () => {
		expect(findNearestItemInDirection([item('steep', 50, 200)], { x: 0, y: 0 }, 'right')).toBe(null)
	})

	it('scores angle deviation across the 0/360 seam', () => {
		// Ten degrees either side of 'right' are equally good, so the first one wins either way. An
		// unwrapped deviation would score the -10 shape 350 off and always pick the +10 one.
		const above = item('above', 98.48, -17.36)
		const below = item('below', 98.48, 17.36)
		expect(findNearestItemInDirection([above, below], { x: 0, y: 0 }, 'right')).toBe('above')
		expect(findNearestItemInDirection([below, above], { x: 0, y: 0 }, 'right')).toBe('below')
	})
})

describe('getAdjacentIndex', () => {
	it('returns null for an empty list', () => {
		expect(getAdjacentIndex(0, -1, 'next')).toBe(null)
		expect(getAdjacentIndex(0, -1, 'prev')).toBe(null)
	})

	it('steps forwards and backwards', () => {
		expect(getAdjacentIndex(3, 0, 'next')).toBe(1)
		expect(getAdjacentIndex(3, 1, 'prev')).toBe(0)
	})

	it('wraps at both ends', () => {
		expect(getAdjacentIndex(3, 2, 'next')).toBe(0)
		expect(getAdjacentIndex(3, 0, 'prev')).toBe(2)
	})

	it('starts at the first shape on next and the last on prev with no current index', () => {
		expect(getAdjacentIndex(3, -1, 'next')).toBe(0)
		expect(getAdjacentIndex(3, -1, 'prev')).toBe(2)
	})
})
