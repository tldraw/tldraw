import { Vec } from '../Vec'
import { Point2d } from './Point2d'

describe('Point2d.getSvgPathData', () => {
	it('emits a move command rounded to two decimals', () => {
		const point = new Point2d({ margin: 0, point: new Vec(0.123456, 7.891234) })
		expect(point.getSvgPathData()).toBe('M0.12, 7.89')
	})

	it('does not mutate the stored point', () => {
		const vec = new Vec(0.123456, 7.891234)
		const point = new Point2d({ margin: 0, point: vec })
		point.getSvgPathData()
		expect(vec).toMatchObject({ x: 0.123456, y: 7.891234 })
	})
})
