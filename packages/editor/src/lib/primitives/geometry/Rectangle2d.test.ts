import { Vec } from '../Vec'
import { Rectangle2d } from './Rectangle2d'

describe('Rectangle2d', () => {
	describe('distanceToLineSegment', () => {
		it('measures a short segment running alongside a long edge', () => {
			const rect = new Rectangle2d({ width: 200, height: 100, isFilled: false })
			const A = new Vec(100, -6)
			const B = new Vec(110, -6)
			// Measuring only vertex-to-segment distances reported ~90 here
			expect(rect.distanceToLineSegment(A, B)).toBeCloseTo(6)
			expect(rect.hitTestLineSegment(A, B, 8)).toBe(true)
			expect(rect.hitTestLineSegment(A, B, 4)).toBe(false)
		})
	})
})
