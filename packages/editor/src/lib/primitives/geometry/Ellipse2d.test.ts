import { Vec } from '../Vec'
import { Ellipse2d } from './Ellipse2d'

describe('Ellipse2d', () => {
	it('hitTestLineSegment honours the distance margin', () => {
		const ellipse = new Ellipse2d({ width: 100, height: 100, isFilled: false })
		const A = new Vec(50, -5)
		const B = new Vec(60, -5)
		expect(ellipse.hitTestLineSegment(A, B)).toBe(false)
		expect(ellipse.hitTestLineSegment(A, B, 10)).toBe(true)
	})
})
