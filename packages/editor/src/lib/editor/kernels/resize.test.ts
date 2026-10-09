import { getFiniteScale } from './resize'

// The rest of the resize math is covered through the editor in packages/tldraw/src/test/
// (resizing.test.ts, flipShapes.test.ts, commands/resizeShape.test.ts).

describe('getFiniteScale', () => {
	it('passes finite scales through', () => {
		const scale = { x: 2, y: 3 }
		expect(getFiniteScale(scale)).toBe(scale)
	})

	it.each([
		[
			{ x: Infinity, y: 3 },
			{ x: 1, y: 3 },
		],
		[
			{ x: 2, y: NaN },
			{ x: 2, y: 1 },
		],
		[
			{ x: NaN, y: Infinity },
			{ x: 1, y: 1 },
		],
	])('replaces a non-finite axis with 1', (scale, expected) => {
		expect(getFiniteScale(scale)).toMatchObject(expected)
	})
})
