import { getSvgPathFromPoints } from './getSvgPathFromPoints'

describe('getSvgPathFromPoints', () => {
	it('returns an empty string for fewer than two points', () => {
		expect(getSvgPathFromPoints([])).toBe('')
		expect(getSvgPathFromPoints([{ x: 1, y: 1 }])).toBe('')
		expect(getSvgPathFromPoints([], false)).toBe('')
		expect(getSvgPathFromPoints([{ x: 1, y: 1 }], false)).toBe('')
	})

	it('draws a straight line for exactly two points, ignoring closed', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		]
		expect(getSvgPathFromPoints(points)).toBe('M0,0 L10,0 ')
		expect(getSvgPathFromPoints(points, false)).toBe('M0,0 L10,0 ')
	})

	describe('with three points', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
		]

		it('closes the curve back through the midpoint of the last and first points', () => {
			expect(getSvgPathFromPoints(points)).toBe('M5,0 Q10,0 10,5 T5,5 5,0 Z')
		})

		it('ends an open path with a line to the last point and no T segment', () => {
			expect(getSvgPathFromPoints(points, false)).toBe('M0,0 Q10,0 10,5 L10,10 ')
		})
	})

	describe('with four or more points', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
			{ x: 0, y: 10 },
		]

		it('builds a closed path of midpoint curves', () => {
			expect(getSvgPathFromPoints(points)).toBe('M5,0 Q10,0 10,5 T5,10 0,5 5,0 Z')
		})

		it('builds an open path from the first point to the last point', () => {
			expect(getSvgPathFromPoints(points, false)).toBe('M0,0 Q10,0 10,5 T5,10 L0,10 ')
		})

		it('adds one midpoint per additional interior point', () => {
			const more = [...points, { x: -10, y: 5 }]
			expect(getSvgPathFromPoints(more, false)).toBe('M0,0 Q10,0 10,5 T5,10 -5,7.5 L-10,5 ')
		})
	})

	it('rounds coordinates to four decimal places', () => {
		const points = [
			{ x: 1.23456789, y: -2.34567891 },
			{ x: 3.00001, y: 4.99999 },
		]
		expect(getSvgPathFromPoints(points)).toBe('M1.2346,-2.3457 L3,5 ')
	})
})
