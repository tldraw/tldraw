import { CenteredItem, findNearestItemInDirection, sortIntoReadingOrder } from './readingOrder'

// Most reading-order and adjacency behavior is covered through selectAdjacentShape in
// packages/tldraw/src/test/navigation.test.ts. These are the edges it doesn't reach.

function item(payload: string, x: number, y: number): CenteredItem<string> {
	return { payload, center: { x, y } }
}

describe('sortIntoReadingOrder', () => {
	it('keeps shapes within the row threshold in one row', () => {
		// 60 apart vertically, so they stay in a row and order by x
		expect(sortIntoReadingOrder([item('b', 100, 0), item('a', 0, 60)])).toEqual(['a', 'b'])
	})
})

describe('findNearestItemInDirection', () => {
	it('returns null when nothing lies in the direction', () => {
		expect(findNearestItemInDirection([item('left', -100, 0)], { x: 0, y: 0 }, 'right')).toBe(null)
	})

	it('ignores shapes more than twice as far off-axis as along it', () => {
		expect(findNearestItemInDirection([item('steep', 50, 200)], { x: 0, y: 0 }, 'right')).toBe(null)
	})
})
