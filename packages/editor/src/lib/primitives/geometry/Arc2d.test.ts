import { Vec } from '../Vec'
import { Arc2d } from './Arc2d'

describe('Arc2d', () => {
	// quarter arc around the origin from (10,0) through (7.07,7.07) to (0,10)
	const arc = new Arc2d({
		center: new Vec(0, 0),
		start: new Vec(10, 0),
		end: new Vec(0, 10),
		sweepFlag: 1,
		largeArcFlag: 0,
	})

	it('hitTestLineSegment ignores circle intersections in the arc gap', () => {
		expect(arc.hitTestLineSegment(new Vec(-12, 0), new Vec(-8, 0))).toBe(false)
		expect(arc.hitTestLineSegment(new Vec(5, 5), new Vec(10, 10))).toBe(true)
		// crossing exactly at an endpoint still counts
		expect(arc.hitTestLineSegment(new Vec(0, 12), new Vec(0, 8))).toBe(true)
	})

	it('hitTestLineSegment honours the distance margin', () => {
		const A = new Vec(8, 8)
		const B = new Vec(12, 12)
		expect(arc.hitTestLineSegment(A, B)).toBe(false)
		expect(arc.hitTestLineSegment(A, B, 1)).toBe(false)
		expect(arc.hitTestLineSegment(A, B, 2)).toBe(true)
	})

	it('nearestPoint picks the angularly nearer endpoint for points in the gap', () => {
		// 90 degrees behind the start but 180 degrees past the end
		expect(arc.nearestPoint(new Vec(0, -10))).toMatchObject({ x: 10, y: 0 })
		// 180 degrees behind the start but 90 degrees past the end
		expect(arc.nearestPoint(new Vec(-10, 0))).toMatchObject({ x: 0, y: 10 })
	})
})
