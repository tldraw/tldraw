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

describe('getBoundsVertices', () => {
	test('basic geometry returns vertices when not excluded from bounds', () => {
		const rect = new Rectangle2d({
			width: 100,
			height: 50,
			isFilled: true,
		})

		const boundsVertices = rect.getBoundsVertices()
		const vertices = rect.getVertices()

		expect(boundsVertices).toEqual(vertices)
		expect(boundsVertices.length).toBe(4)
		expect(boundsVertices).toMatchObject([
			{ x: 0, y: 0, z: 1 },
			{ x: 100, y: 0, z: 1 },
			{ x: 100, y: 50, z: 1 },
			{ x: 0, y: 50, z: 1 },
		])
	})

	test('geometry excluded from shape bounds returns empty array', () => {
		const rect = new Rectangle2d({
			width: 100,
			height: 50,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const boundsVertices = rect.getBoundsVertices()
		expect(boundsVertices).toEqual([])
	})

	test('cached boundsVertices property', () => {
		const rect = new Rectangle2d({
			width: 100,
			height: 50,
			isFilled: true,
		})

		// Access the cached property multiple times
		const boundsVertices1 = rect.boundsVertices
		const boundsVertices2 = rect.boundsVertices

		// Should return the same reference (cached)
		expect(boundsVertices1).toBe(boundsVertices2)
		expect(boundsVertices1.length).toBe(4)
	})
})

describe('TransformedGeometry2d getBoundsVertices', () => {
	test('transforms bounds vertices correctly', () => {
		const rect = new Rectangle2d({
			width: 100,
			height: 50,
			isFilled: true,
		})

		const transformed = rect.transform(Mat.Translate(50, 100).scale(2, 2))
		const boundsVertices = transformed.getBoundsVertices()

		expect(boundsVertices).toMatchObject([
			{ x: 50, y: 100, z: 1 },
			{ x: 250, y: 100, z: 1 },
			{ x: 250, y: 200, z: 1 },
			{ x: 50, y: 200, z: 1 },
		])
	})

	test('transforms empty bounds vertices for excluded geometry', () => {
		const rect = new Rectangle2d({
			width: 100,
			height: 50,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const transformed = rect.transform(Mat.Translate(50, 100))
		const boundsVertices = transformed.getBoundsVertices()

		expect(boundsVertices).toEqual([])
	})

	test('nested transform preserves bounds vertices behavior', () => {
		const rect = new Rectangle2d({
			width: 100,
			height: 50,
			isFilled: true,
		})

		const transformed1 = rect.transform(Mat.Translate(10, 20))
		const transformed2 = transformed1.transform(Mat.Scale(2, 2))
		const boundsVertices = transformed2.getBoundsVertices()

		expect(boundsVertices).toMatchObject([
			{ x: 20, y: 40, z: 1 },
			{ x: 220, y: 40, z: 1 },
			{ x: 220, y: 140, z: 1 },
			{ x: 20, y: 140, z: 1 },
		])
	})
})

describe('Group2d getBoundsVertices', () => {
	test('flattens children bounds vertices', () => {
		const rect1 = new Rectangle2d({
			width: 50,
			height: 50,
			isFilled: true,
		})

		const rect2 = new Rectangle2d({
			width: 30,
			height: 30,
			isFilled: true,
		}).transform(Mat.Translate(60, 60))

		const group = new Group2d({
			children: [rect1, rect2],
		})

		const boundsVertices = group.getBoundsVertices()

		// Should include all vertices from both rectangles
		expect(boundsVertices.length).toBe(8) // 4 vertices from each rectangle

		// Check that we have vertices from both rectangles
		expect(boundsVertices).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ x: 0, y: 0 }), // rect1 vertices
				expect.objectContaining({ x: 50, y: 0 }),
				expect.objectContaining({ x: 50, y: 50 }),
				expect.objectContaining({ x: 0, y: 50 }),
				expect.objectContaining({ x: 60, y: 60 }), // rect2 vertices
				expect.objectContaining({ x: 90, y: 60 }),
				expect.objectContaining({ x: 90, y: 90 }),
				expect.objectContaining({ x: 60, y: 90 }),
			])
		)
	})

	test('excludes children marked as excluded from bounds', () => {
		const rect1 = new Rectangle2d({
			width: 50,
			height: 50,
			isFilled: true,
		})

		const rect2 = new Rectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const group = new Group2d({
			children: [rect1, rect2],
		})

		const boundsVertices = group.getBoundsVertices()

		// Should only include vertices from rect1, not rect2
		expect(boundsVertices.length).toBe(4) // Only rect1's 4 vertices
		expect(boundsVertices).toMatchObject([
			{ x: 0, y: 0, z: 1 },
			{ x: 50, y: 0, z: 1 },
			{ x: 50, y: 50, z: 1 },
			{ x: 0, y: 50, z: 1 },
		])
	})

	test('returns empty array when group itself is excluded from bounds', () => {
		const rect1 = new Rectangle2d({
			width: 50,
			height: 50,
			isFilled: true,
		})

		const rect2 = new Rectangle2d({
			width: 30,
			height: 30,
			isFilled: true,
		})

		const group = new Group2d({
			children: [rect1, rect2],
			excludeFromShapeBounds: true,
		})

		const boundsVertices = group.getBoundsVertices()
		expect(boundsVertices).toEqual([])
	})

	test('handles nested groups correctly', () => {
		const rect1 = new Rectangle2d({
			width: 50,
			height: 50,
			isFilled: true,
		})

		const rect2 = new Rectangle2d({
			width: 30,
			height: 30,
			isFilled: true,
		})

		const innerGroup = new Group2d({
			children: [rect2],
		})

		const outerGroup = new Group2d({
			children: [rect1, innerGroup],
		})

		const boundsVertices = outerGroup.getBoundsVertices()

		// Should include vertices from both rectangles
		expect(boundsVertices.length).toBe(8) // 4 vertices from each rectangle
	})

	test('handles all children excluded from bounds', () => {
		const rect1 = new Rectangle2d({
			width: 50,
			height: 50,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const rect2 = new Rectangle2d({
			width: 30,
			height: 30,
			isFilled: true,
			excludeFromShapeBounds: true,
		})

		const group = new Group2d({
			children: [rect1, rect2],
		})

		const boundsVertices = group.getBoundsVertices()
		expect(boundsVertices).toEqual([])
	})
})

function expectApproxMatch(a: VecLike, b: VecLike) {
	expect(a.x).toBeCloseTo(b.x, 0.0001)
	expect(a.y).toBeCloseTo(b.y, 0.0001)
}
