import { Vec } from '../Vec'
import { Edge2d } from './Edge2d'

describe('Edge2d.getSvgPathData', () => {
	it('emits a move and a line command, rounded to two decimals', () => {
		const edge = new Edge2d({ start: new Vec(0.123456, 0), end: new Vec(10, 10.987654) })
		expect(edge.getSvgPathData()).toBe('M0.12, 0 L10, 10.99')
	})

	it('omits the move command when not first', () => {
		const edge = new Edge2d({ start: new Vec(0.123456, 0), end: new Vec(10, 10.987654) })
		expect(edge.getSvgPathData(false)).toBe(' L10, 10.99')
	})

	it('does not mutate the stored points', () => {
		const start = new Vec(0.123456, 0)
		const end = new Vec(10, 10.987654)
		const edge = new Edge2d({ start, end })
		edge.getSvgPathData()
		expect(start).toMatchObject({ x: 0.123456, y: 0 })
		expect(end).toMatchObject({ x: 10, y: 10.987654 })
	})
})
