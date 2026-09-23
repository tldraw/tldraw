import { Box } from '../../primitives/Box'
import {
	getAlignLayout,
	getDistributeLayout,
	getPackLayout,
	getResizeToBoundsLayout,
	getStackLayout,
	getStretchLayout,
} from './layout'

function item(id: string, x: number, y: number, w: number, h: number) {
	return { id, pageBounds: new Box(x, y, w, h) }
}

const tiebreak = (i: { id: string }) => i.id

describe('getAlignLayout', () => {
	const items = [item('a', 0, 0, 100, 100), item('b', 200, 50, 50, 200)]

	it.each([
		['left', [0, -200]],
		['right', [150, 0]],
		['center-horizontal', [125 - 50, 125 - 200 - 25]],
	] as const)('%s aligns on the common bounds', (operation, [dx0, dx1]) => {
		const moves = getAlignLayout(items, operation)
		expect(moves.map((m) => m.delta.x)).toEqual([dx0, dx1])
		expect(moves.map((m) => m.delta.y)).toEqual([0, 0])
	})

	it.each([
		['top', [0, -50]],
		['bottom', [150, 0]],
		['center-vertical', [125 - 50, 125 - 50 - 100]],
	] as const)('%s aligns on the common bounds', (operation, [dy0, dy1]) => {
		const moves = getAlignLayout(items, operation)
		expect(moves.map((m) => m.delta.y)).toEqual([dy0, dy1])
		expect(moves.map((m) => m.delta.x)).toEqual([0, 0])
	})

	it('keeps the input order', () => {
		expect(getAlignLayout(items, 'left').map((m) => m.item.id)).toEqual(['a', 'b'])
	})
})

describe('getStackLayout', () => {
	it('butts clusters up with the given gap, in spatial order', () => {
		// input is deliberately out of spatial order
		const items = [item('b', 500, 0, 100, 100), item('a', 0, 0, 100, 100)]
		const moves = getStackLayout(items, 'horizontal', 10)
		expect(moves).toHaveLength(1)
		expect(moves[0].item.id).toBe('b')
		// a ends at 100, so b starts at 110
		expect(moves[0].delta.x).toBe(-390)
	})

	it('infers the most common existing gap when the gap is zero', () => {
		const items = [
			item('a', 0, 0, 10, 10),
			item('b', 30, 0, 10, 10),
			item('c', 60, 0, 10, 10),
			item('d', 999, 0, 10, 10),
		]
		const moves = getStackLayout(items, 'horizontal', 0)
		// gaps are 20, 20, 929: the most common is 20
		expect(moves.map((m) => m.item.id)).toEqual(['b', 'c', 'd'])
		expect(moves.map((m) => m.delta.x)).toEqual([0, 0, -909])
	})

	it('averages the gaps when no gap is most common', () => {
		const items = [item('a', 0, 0, 10, 10), item('b', 20, 0, 10, 10), item('c', 60, 0, 10, 10)]
		// gaps are 10 and 30, each seen once, so the average 20 is used
		const moves = getStackLayout(items, 'horizontal', 0)
		expect(moves.map((m) => m.delta.x)).toEqual([10, 0])
	})

	it('stacks vertically', () => {
		const items = [item('a', 0, 0, 10, 10), item('b', 0, 100, 10, 10)]
		expect(getStackLayout(items, 'vertical', 5)[0].delta.y).toBe(-85)
	})

	it('returns nothing for fewer than two clusters', () => {
		expect(getStackLayout([item('a', 0, 0, 10, 10)], 'horizontal', 10)).toEqual([])
	})

	it('does not mutate the input order', () => {
		const items = [item('b', 500, 0, 100, 100), item('a', 0, 0, 100, 100)]
		getStackLayout(items, 'horizontal', 10)
		expect(items.map((i) => i.id)).toEqual(['b', 'a'])
	})
})

describe('getDistributeLayout', () => {
	it('spaces the middle clusters evenly between the extremes', () => {
		const items = [item('a', 0, 0, 100, 10), item('b', 150, 0, 100, 10), item('c', 700, 0, 100, 10)]
		const result = getDistributeLayout(items, 'horizontal', tiebreak)
		if (result.type !== 'moves') throw Error('expected moves')
		expect(result.moves).toHaveLength(1)
		// space between a (ends 100) and c (starts 700) is 600, minus b's 100, over two gaps = 250
		expect(result.moves[0].item.id).toBe('b')
		expect(result.moves[0].delta.x).toBe(350 - 150)
	})

	it('reports the cluster to exclude when one cluster spans the rest', () => {
		const items = [
			item('big', 0, 0, 1000, 10),
			item('a', 100, 0, 10, 10),
			item('b', 200, 0, 10, 10),
		]
		const result = getDistributeLayout(items, 'horizontal', tiebreak)
		expect(result).toEqual({ type: 'excludes', excluded: items[0] })
	})

	it('breaks ties by key so the result does not depend on input order', () => {
		const a = item('a', 100, 0, 10, 10)
		const b = item('b', 100, 0, 10, 10)
		const ends = [item('first', 0, 0, 10, 10), item('last', 500, 0, 10, 10)]
		const forwards = getDistributeLayout([...ends, a, b], 'horizontal', tiebreak)
		const backwards = getDistributeLayout([...ends, b, a], 'horizontal', tiebreak)
		if (forwards.type !== 'moves' || backwards.type !== 'moves') throw Error('expected moves')
		expect(forwards.moves.map((m) => m.item.id)).toEqual(['a', 'b'])
		expect(backwards.moves.map((m) => m.item.id)).toEqual(['a', 'b'])
	})

	it('clamps a cluster that would overshoot the last cluster', () => {
		// the two middle clusters are far too wide for the space between the extremes, so the gap
		// goes negative and the second one would land past the last cluster
		const items = [
			item('a', 0, 0, 10, 10),
			item('m1', 20, 0, 600, 10),
			item('m2', 30, 0, 600, 10),
			item('last', 1000, 0, 10, 10),
		]
		const result = getDistributeLayout(items, 'horizontal', tiebreak)
		if (result.type !== 'moves') throw Error('expected moves')
		const move = result.moves[1]
		expect(move.item.id).toBe('m2')
		// pushed flush against the last cluster's max, minus one
		expect(move.item.pageBounds.maxX + move.delta.x).toBe(1009)
	})
})

describe('getStretchLayout', () => {
	it('scales each cluster to the common width, pinned to the common left edge', () => {
		const items = [item('a', 0, 0, 100, 10), item('b', 50, 0, 50, 10)]
		const [first, second] = getStretchLayout(items, 'horizontal')
		expect(first.scale.x).toBe(1)
		expect(first.pageOffset.x).toBe(0)
		expect(second.scale.x).toBe(2)
		expect(second.pageOffset.x).toBe(-50)
		expect(second.scaleOrigin.x).toBe(0)
		// the other axis is untouched
		expect(second.scale.y).toBe(1)
		expect(second.pageOffset.y).toBe(0)
		expect(second.scaleOrigin.y).toBe(5)
	})

	it('scales vertically', () => {
		const items = [item('a', 0, 0, 10, 100), item('b', 0, 0, 10, 20)]
		expect(getStretchLayout(items, 'vertical')[1].scale.y).toBe(5)
	})
})

describe('getResizeToBoundsLayout', () => {
	it('maps the common bounds onto the target bounds', () => {
		const items = [item('a', 0, 0, 100, 100), item('b', 100, 100, 100, 100)]
		const transforms = getResizeToBoundsLayout(items, new Box(0, 0, 400, 400))!
		expect(transforms.map((t) => [t.scale.x, t.scale.y])).toEqual([
			[2, 2],
			[2, 2],
		])
		expect([transforms[0].pageOffset.x, transforms[0].pageOffset.y]).toEqual([0, 0])
		expect([transforms[1].pageOffset.x, transforms[1].pageOffset.y]).toEqual([100, 100])
		expect([transforms[1].scaleOrigin.x, transforms[1].scaleOrigin.y]).toEqual([200, 200])
	})

	it('returns null when the clusters have no area', () => {
		const items = [item('a', 0, 0, 0, 100), item('b', 0, 50, 0, 100)]
		expect(getResizeToBoundsLayout(items, new Box(0, 0, 10, 10))).toBe(null)
	})
})

describe('getPackLayout', () => {
	it('packs clusters into a grid and keeps them centered', () => {
		const items = [
			item('a', 0, 0, 100, 100),
			item('b', 1000, 0, 100, 100),
			item('c', 0, 1000, 100, 100),
			item('d', 1000, 1000, 100, 100),
		]
		const before = Box.Common(items.map((i) => i.pageBounds))
		const moves = getPackLayout(items, 10)

		const after = Box.Common(
			moves.map((m) => {
				const b = m.item.pageBounds.clone()
				b.x += m.delta.x
				b.y += m.delta.y
				return b
			})
		)
		// the row width comes from the clusters' current common width, so all four fit in one row
		expect(after.width).toBe(430)
		expect(after.height).toBe(100)
		// and the packed grid stays centered on where the clusters were
		expect([after.center.x, after.center.y]).toEqual([before.center.x, before.center.y])
	})

	it('does not overlap packed clusters', () => {
		const items = [
			item('a', 0, 0, 120, 40),
			item('b', 500, 0, 60, 90),
			item('c', 0, 500, 30, 30),
			item('d', 500, 500, 80, 50),
		]
		const packed = getPackLayout(items, 5).map((m) => {
			const b = m.item.pageBounds.clone()
			b.x += m.delta.x
			b.y += m.delta.y
			return b
		})
		for (let i = 0; i < packed.length; i++) {
			for (let j = i + 1; j < packed.length; j++) {
				expect(Box.Collides(packed[i], packed[j])).toBe(false)
			}
		}
	})
})
