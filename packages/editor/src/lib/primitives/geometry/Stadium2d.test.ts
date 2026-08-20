import { Vec } from '../Vec'
import { Stadium2d } from './Stadium2d'

describe('Stadium2d', () => {
	it('hitTestLineSegment honours the distance margin', () => {
		const stadium = new Stadium2d({ width: 200, height: 100, isFilled: false })
		// alongside the straight top edge
		expect(stadium.hitTestLineSegment(new Vec(80, -5), new Vec(120, -5))).toBe(false)
		expect(stadium.hitTestLineSegment(new Vec(80, -5), new Vec(120, -5), 10)).toBe(true)
		// alongside the left cap
		expect(stadium.hitTestLineSegment(new Vec(-5, 40), new Vec(-5, 60))).toBe(false)
		expect(stadium.hitTestLineSegment(new Vec(-5, 40), new Vec(-5, 60), 10)).toBe(true)
	})
})
