import { getPerfectDashProps } from './getPerfectDashProps'

function parse(props: { strokeDasharray: string; strokeDashoffset: string }) {
	const [dash, gap] = props.strokeDasharray.split(' ').map(Number)
	return { dash, gap, offset: Number(props.strokeDashoffset) }
}

const SOLID = { strokeDasharray: 'none', strokeDashoffset: 'none' }

describe('getPerfectDashProps', () => {
	describe('solid output', () => {
		it('returns none for solid, draw and none styles', () => {
			expect(getPerfectDashProps(100, 2, { style: 'solid' })).toEqual(SOLID)
			expect(getPerfectDashProps(100, 2, { style: 'draw' })).toEqual(SOLID)
			expect(getPerfectDashProps(100, 2, { style: 'none' })).toEqual(SOLID)
		})

		it('forceSolid wins over a dashed style', () => {
			expect(getPerfectDashProps(100, 2, { style: 'dashed', forceSolid: true })).toEqual(SOLID)
			expect(getPerfectDashProps(100, 2, { style: 'dotted', forceSolid: true })).toEqual(SOLID)
		})
	})

	describe('dashed', () => {
		it('defaults to dashed with outset terminals and a length ratio of 2', () => {
			// dash = 2 * 2 = 4; outset adds half a dash at each end: 104 total, offset 2
			// 13 dashes of 4 with 12 gaps of 52 / 12
			expect(getPerfectDashProps(100, 2)).toEqual({
				strokeDasharray: '4 4.333333333333333',
				strokeDashoffset: '2',
			})
		})

		it('uses the length ratio to size dashes from the stroke width', () => {
			// dash = 2 * 4 = 8; outset: 108 total, offset 4; 6 dashes of 9, 5 gaps of 10.8
			expect(getPerfectDashProps(100, 2, { lengthRatio: 4 })).toEqual({
				strokeDasharray: '9 10.8',
				strokeDashoffset: '4',
			})
		})

		it('caps the dash length at a quarter of the total length', () => {
			// stroke 20 * ratio 2 = 40 would exceed 100 / 4 = 25
			// outset: 125 total, offset 12.5; 2 dashes -> fallback thirds
			expect(getPerfectDashProps(100, 20)).toEqual({
				strokeDasharray: '41.666666666666664 41.666666666666664',
				strokeDashoffset: '12.5',
			})
		})

		it('skip terminals shorten the path by a full dash and pull the offset back', () => {
			// 100 - 4 - 4 = 92; 11 dashes; dash 92 / 22, gap (92 - 46) / 10
			const { dash, gap, offset } = parse(
				getPerfectDashProps(100, 2, { start: 'skip', end: 'skip' })
			)
			expect(dash).toBeCloseTo(4.181818)
			expect(gap).toBeCloseTo(4.6)
			expect(offset).toBe(-4)
		})

		it('none terminals leave the path length and offset untouched', () => {
			// 12 dashes; dash 100 / 24, gap 50 / 11
			const { dash, gap, offset } = parse(
				getPerfectDashProps(100, 2, { start: 'none', end: 'none' })
			)
			expect(dash).toBeCloseTo(4.166667)
			expect(gap).toBeCloseTo(4.545455)
			expect(offset).toBe(0)
		})

		it('mixes start and end terminals independently', () => {
			// start outset (+2, offset 2), end skip (-4): 98 total, 12 dashes
			const { dash, gap, offset } = parse(getPerfectDashProps(100, 2, { end: 'skip' }))
			expect(dash).toBeCloseTo(98 / 24)
			expect(gap).toBeCloseTo((98 - 49) / 11)
			expect(offset).toBe(2)
		})

		it('closed paths ignore terminals and share the gap across every dash', () => {
			// 12 dashes of 100 / 24 with 12 equal gaps, offset of half a dash
			const { dash, gap, offset } = parse(
				getPerfectDashProps(100, 2, { closed: true, start: 'skip', end: 'skip' })
			)
			expect(dash).toBeCloseTo(4.166667)
			expect(gap).toBeCloseTo(4.166667)
			expect(offset).toBeCloseTo(2.083333)
		})

		it('draws a single full-length dash when the path is shorter than four stroke widths', () => {
			// dash = min(8, 2) = 2; outset: 10 total; 2 dashes < 3 and 10 / 4 < 4
			expect(getPerfectDashProps(8, 4)).toEqual({
				strokeDasharray: '10 0',
				strokeDashoffset: '1',
			})
		})

		it('falls back to thirds when fewer than three dashes fit on a longer path', () => {
			// dash = min(8, 5) = 5; outset: 25 total, offset 2.5; 2 dashes < 3 and 25 / 4 >= 4
			const { dash, gap, offset } = parse(getPerfectDashProps(20, 4))
			expect(dash).toBeCloseTo(25 / 3)
			expect(gap).toBeCloseTo(25 / 3)
			expect(offset).toBe(2.5)
		})

		it('produces a zero-length dash with no gap for a zero-length path', () => {
			expect(getPerfectDashProps(0, 2)).toEqual({
				strokeDasharray: '0 0',
				strokeDashoffset: '0',
			})
		})

		it('rounds the dash count down to a multiple of snap', () => {
			// 13 dashes snapped to 12: dash 104 / 24, gap (104 - 52) / 11
			const { dash, gap, offset } = parse(getPerfectDashProps(100, 2, { snap: 4 }))
			expect(dash).toBeCloseTo(4.333333)
			expect(gap).toBeCloseTo(4.727273)
			expect(offset).toBe(2)
		})

		it('falls back to a single dash when snapping rounds the count to zero', () => {
			// 3 dashes snapped to 0 -> 1; 24 / 2 >= 4 so thirds
			expect(getPerfectDashProps(20, 2, { snap: 5 })).toEqual({
				strokeDasharray: '8 8',
				strokeDashoffset: '2',
			})
		})
	})

	describe('dotted', () => {
		it('uses a dash 1/100th of the stroke width and a 1:200 period', () => {
			// dash 0.02; outset: 100.02 total, offset 0.01; 25 dots
			const { dash, gap, offset } = parse(getPerfectDashProps(100, 2, { style: 'dotted' }))
			expect(dash).toBeCloseTo(100.02 / 25 / 200)
			expect(gap).toBeCloseTo((100.02 - 25 * (100.02 / 25 / 200)) / 24)
			expect(offset).toBeCloseTo(0.01)
		})

		it('ignores lengthRatio', () => {
			expect(getPerfectDashProps(100, 2, { style: 'dotted', lengthRatio: 10 })).toEqual(
				getPerfectDashProps(100, 2, { style: 'dotted' })
			)
		})

		it('closed dotted paths offset by half a dot', () => {
			// dash 0.01; 50 dots of 100 / 50 / 200; 50 equal gaps
			const { dash, gap, offset } = parse(
				getPerfectDashProps(100, 1, { style: 'dotted', closed: true })
			)
			expect(dash).toBeCloseTo(0.01)
			expect(gap).toBeCloseTo(1.99)
			expect(offset).toBeCloseTo(0.005)
		})

		it('does not use the dashed short-path fallback', () => {
			// dash 0.02; outset 0.02 total; 0 dots -> 1 dot of 0.02 / 200 with the rest as gap
			const { dash, gap, offset } = parse(getPerfectDashProps(0, 2, { style: 'dotted' }))
			expect(dash).toBeCloseTo(0.0001)
			expect(gap).toBeCloseTo(0.0199)
			expect(offset).toBeCloseTo(0.01)
		})
	})
})
