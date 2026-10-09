import { Box } from '../../primitives/Box'
import { getDistributeLayout, getResizeToBoundsLayout, getStackLayout } from './layout'

// Each layout is covered through the editor in packages/tldraw/src/test/commands/ (alignShapes,
// distributeShapes, stackShapes, packShapes, stretch, resizeToBounds). These are the kernel
// contracts and edges those don't reach.

function item(id: string, x: number, y: number, w: number, h: number) {
	return { id, pageBounds: new Box(x, y, w, h) }
}

describe('getStackLayout', () => {
	it('does not mutate the input order', () => {
		const items = [item('b', 500, 0, 100, 100), item('a', 0, 0, 100, 100)]
		getStackLayout(items, 'horizontal', 10)
		expect(items.map((i) => i.id)).toEqual(['b', 'a'])
	})
})

describe('getDistributeLayout', () => {
	it('breaks ties by key so the result does not depend on input order', () => {
		const tiebreak = (i: { id: string }) => i.id
		const a = item('a', 100, 0, 10, 10)
		const b = item('b', 100, 0, 10, 10)
		const ends = [item('first', 0, 0, 10, 10), item('last', 500, 0, 10, 10)]
		const forwards = getDistributeLayout([...ends, a, b], 'horizontal', tiebreak)
		const backwards = getDistributeLayout([...ends, b, a], 'horizontal', tiebreak)
		if (forwards.type !== 'moves' || backwards.type !== 'moves') throw Error('expected moves')
		expect(forwards.moves.map((m) => m.item.id)).toEqual(['a', 'b'])
		expect(backwards.moves.map((m) => m.item.id)).toEqual(['a', 'b'])
	})
})

describe('getResizeToBoundsLayout', () => {
	it('returns null when the clusters have no area', () => {
		const items = [item('a', 0, 0, 0, 100), item('b', 0, 50, 0, 100)]
		expect(getResizeToBoundsLayout(items, new Box(0, 0, 10, 10))).toBe(null)
	})
})
