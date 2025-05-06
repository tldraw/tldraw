import { Mat } from '../Mat'
import { Vec, VecLike } from '../Vec'
import { Geometry2dFilters } from './Geometry2d'
import { Rectangle2d } from './Rectangle2d'

describe('TransformedGeometry2d', () => {
	const rect = new Rectangle2d({ width: 100, height: 50, isFilled: true }).transform(
		Mat.Translate(50, 100).scale(2, 2)
	)

	test('getVertices', () => {
		expect(rect.getVertices(Geometry2dFilters.INCLUDE_ALL)).toMatchObject([
			{ x: 50, y: 100, z: 1 },
			{ x: 250, y: 100, z: 1 },
			{ x: 250, y: 200, z: 1 },
			{ x: 50, y: 200, z: 1 },
		])
	})

	test('nearestPoint', () => {
		expectApproxMatch(rect.nearestPoint(new Vec(100, 300)), { x: 100, y: 200 })
	})

	test('hitTestPoint', () => {
		// basic case - no margin / scaling:
		expect(rect.hitTestPoint(new Vec(0, 0), 0, true)).toBe(false)
		expect(rect.hitTestPoint(new Vec(50, 100), 0, true)).toBe(true)
		expect(rect.hitTestPoint(new Vec(49, 100), 0, true)).toBe(false)
		expect(rect.hitTestPoint(new Vec(100, 150), 0, true)).toBe(true)

		// with margin:
		// move away 8 px and test with 10px margin:
		expect(rect.hitTestPoint(new Vec(42, 100), 10, true)).toBe(true)
		// move away 12 px and test with 10px margin:
		expect(rect.hitTestPoint(new Vec(38, 100), 10, true)).toBe(false)
	})
})

function expectApproxMatch(a: VecLike, b: VecLike) {
	expect(a.x).toBeCloseTo(b.x, 0.0001)
	expect(a.y).toBeCloseTo(b.y, 0.0001)
}
