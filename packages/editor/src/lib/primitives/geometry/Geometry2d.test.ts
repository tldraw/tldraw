import { Mat } from '../Mat'
import { Vec, VecLike } from '../Vec'
import { Geometry2dFilters } from './Geometry2d'
import { Group2d } from './Group2d'
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

describe('excludeFromShapeBounds', () => {
	test('simple geometry with excludeFromShapeBounds flag', () => {
		const rect = new Rectangle2d({
			width: 100,
			height: 50,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		// The bounds should still be calculated normally for simple geometry
		const bounds = rect.bounds
		expect(bounds.width).toBe(100)
		expect(bounds.height).toBe(50)
		expect(bounds.x).toBe(0)
		expect(bounds.y).toBe(0)
	})

	test('group with excluded child geometry', () => {
		const mainRect = new Rectangle2d({
			width: 100,
			height: 50,
			isFilled: true,
		})

		const excludedRect = new Rectangle2d({
			width: 200,
			height: 100,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const group = new Group2d({
			children: [mainRect, excludedRect],
		})

		// The bounds should only include the non-excluded rectangle
		const bounds = group.bounds
		expect(bounds.width).toBe(100) // Only the main rectangle width
		expect(bounds.height).toBe(50) // Only the main rectangle height
		expect(bounds.x).toBe(0)
		expect(bounds.y).toBe(0)
	})

	test('group with multiple excluded children', () => {
		const rect1 = new Rectangle2d({
			width: 50,
			height: 50,
			isFilled: true,
		})

		const rect2 = new Rectangle2d({
			width: 100,
			height: 30,
			isFilled: true,
		})

		const excludedRect1 = new Rectangle2d({
			width: 200,
			height: 200,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const excludedRect2 = new Rectangle2d({
			width: 300,
			height: 300,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const group = new Group2d({
			children: [rect1, excludedRect1, rect2, excludedRect2],
		})

		// The bounds should include both non-excluded rectangles
		const bounds = group.bounds
		expect(bounds.width).toBe(100) // Width of rect2 (larger of the two)
		expect(bounds.height).toBe(50) // Height of rect1 (larger of the two)
		expect(bounds.x).toBe(0)
		expect(bounds.y).toBe(0)
	})

	test('group with all children excluded', () => {
		const excludedRect1 = new Rectangle2d({
			width: 100,
			height: 50,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const excludedRect2 = new Rectangle2d({
			width: 200,
			height: 100,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const group = new Group2d({
			children: [excludedRect1, excludedRect2],
		})

		// The bounds should be empty when all children are excluded
		const bounds = group.bounds
		expect(bounds.width).toBe(0)
		expect(bounds.height).toBe(0)
		expect(bounds.x).toBe(0)
		expect(bounds.y).toBe(0)
	})

	test('nested groups with excluded geometry', () => {
		const innerRect = new Rectangle2d({
			width: 50,
			height: 50,
			isFilled: true,
		})

		const excludedRect = new Rectangle2d({
			width: 200,
			height: 200,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const innerGroup = new Group2d({
			children: [innerRect, excludedRect],
		})

		const outerRect = new Rectangle2d({
			width: 100,
			height: 30,
			isFilled: true,
		})

		const outerGroup = new Group2d({
			children: [innerGroup, outerRect],
		})

		// The bounds should include both the inner group (without excluded rect) and outer rect
		const bounds = outerGroup.bounds
		expect(bounds.width).toBe(100) // Width of outerRect (larger)
		expect(bounds.height).toBe(50) // Height of innerRect (larger)
		expect(bounds.x).toBe(0)
		expect(bounds.y).toBe(0)
	})

	test('bounds calculation with transformed geometry', () => {
		const rect = new Rectangle2d({
			width: 50,
			height: 50,
			isFilled: true,
		}).transform(Mat.Translate(100, 100))

		const excludedRect = new Rectangle2d({
			width: 200,
			height: 200,
			isFilled: true,
			excludeFromShapeBounds: true,
		}).transform(Mat.Translate(50, 50))

		const group = new Group2d({
			children: [rect, excludedRect],
		})

		// The bounds should only include the non-excluded rectangle
		const bounds = group.bounds
		// Verify that the excluded rectangle doesn't affect the bounds
		// The bounds should be smaller than if the excluded rect was included
		expect(bounds.width).toBeLessThan(200) // Should not include the excluded rect's width
		expect(bounds.height).toBeLessThan(200) // Should not include the excluded rect's height
		// The bounds should not be empty
		expect(bounds.width).toBeGreaterThan(0)
		expect(bounds.height).toBeGreaterThan(0)
	})
})

function expectApproxMatch(a: VecLike, b: VecLike) {
	expect(a.x).toBeCloseTo(b.x, 0.0001)
	expect(a.y).toBeCloseTo(b.y, 0.0001)
}
