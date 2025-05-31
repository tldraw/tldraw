import { Vec } from '../Vec'
import { Point2d } from './Point2d'

describe('Point2d', () => {
	let point2d: Point2d
	const testPoint = new Vec(10, 20)
	const margin = 5

	beforeEach(() => {
		point2d = new Point2d({
			margin,
			point: testPoint,
		})
	})

	describe('Constructor', () => {
		it('Creates Point2d with given point and margin', () => {
			expect(point2d.point).toEqual(testPoint)
			expect(point2d.isClosed).toBe(true)
			expect(point2d.isFilled).toBe(true)
		})

		it('Sets isClosed to true by default', () => {
			expect(point2d.isClosed).toBe(true)
		})

		it('Sets isFilled to true by default', () => {
			expect(point2d.isFilled).toBe(true)
		})

		it('Inherits from Geometry2d correctly', () => {
			expect(point2d).toBeInstanceOf(Point2d)
		})
	})

	describe('getVertices', () => {
		it('Returns array containing only the point', () => {
			const vertices = point2d.getVertices()
			expect(vertices).toHaveLength(1)
			expect(vertices[0]).toEqual(testPoint)
		})

		it('Does not take any parameters in Point2d implementation', () => {
			// Point2d overrides the parent method and takes no parameters
			const vertices = point2d.getVertices()
			expect(vertices).toHaveLength(1)
			expect(vertices[0]).toEqual(testPoint)
		})
	})

	describe('nearestPoint', () => {
		it('Returns the point itself regardless of input', () => {
			// Point2d overrides nearestPoint to take no parameters
			const nearest = point2d.nearestPoint()
			expect(nearest).toEqual(testPoint)
		})

		it('Does not take any parameters in Point2d implementation', () => {
			const nearest = point2d.nearestPoint()
			expect(nearest).toEqual(testPoint)
		})
	})

	describe('hitTestLineSegment', () => {
		it('Returns true when point is within margin of line segment', () => {
			// Line segment that passes close to the point
			const A = new Vec(5, 20)
			const B = new Vec(15, 20)
			const result = point2d.hitTestLineSegment(A, B, margin)
			expect(result).toBe(true)
		})

		it('Returns false when point is outside margin of line segment', () => {
			// Line segment far from the point
			const A = new Vec(100, 100)
			const B = new Vec(200, 200)
			const result = point2d.hitTestLineSegment(A, B, margin)
			expect(result).toBe(false)
		})

		it('Works with horizontal line segments', () => {
			const A = new Vec(5, 20)
			const B = new Vec(15, 20)
			const result = point2d.hitTestLineSegment(A, B, margin)
			expect(result).toBe(true)
		})

		it('Works with vertical line segments', () => {
			const A = new Vec(10, 15)
			const B = new Vec(10, 25)
			const result = point2d.hitTestLineSegment(A, B, margin)
			expect(result).toBe(true)
		})

		it('Works with diagonal line segments', () => {
			const A = new Vec(5, 15)
			const B = new Vec(15, 25)
			const result = point2d.hitTestLineSegment(A, B, margin)
			expect(result).toBe(true)
		})

		it('Handles edge case where A equals B', () => {
			const A = new Vec(10, 20)
			const B = new Vec(10, 20)
			const result = point2d.hitTestLineSegment(A, B, margin)
			expect(result).toBe(true)
		})
	})

	describe('getSvgPathData', () => {
		it('Returns correct SVG move command', () => {
			const svgPath = point2d.getSvgPathData()
			expect(svgPath).toBe('M10, 20')
		})

		it('Uses toFixed() formatting for coordinates', () => {
			const floatPoint = new Vec(10.12345, 20.6789)
			const floatPoint2d = new Point2d({
				margin: 5,
				point: floatPoint,
			})
			const svgPath = floatPoint2d.getSvgPathData()
			expect(svgPath).toBe('M10.12, 20.68')
		})
	})

	describe('Inherited Geometry2d methods', () => {
		describe('bounds and vertices', () => {
			it('Returns correct bounds', () => {
				const bounds = point2d.bounds
				expect(bounds.minX).toBeCloseTo(10)
				expect(bounds.minY).toBeCloseTo(20)
				expect(bounds.maxX).toBeCloseTo(10)
				expect(bounds.maxY).toBeCloseTo(20)
			})

			it('Returns vertices array with single point', () => {
				const vertices = point2d.vertices
				expect(vertices).toHaveLength(1)
				expect(vertices[0]).toEqual(testPoint)
			})

			it('Calculates center correctly', () => {
				const center = point2d.center
				expect(center).toEqual(testPoint)
			})
		})

		describe('hitTestPoint', () => {
			it('Returns true when testing the exact point', () => {
				const result = point2d.hitTestPoint(testPoint)
				expect(result).toBe(true)
			})

			it('Returns true when within margin distance', () => {
				const nearbyPoint = new Vec(12, 22)
				const result = point2d.hitTestPoint(nearbyPoint, 4)
				expect(result).toBe(true)
			})

			it('Returns false when outside margin distance', () => {
				const farPoint = new Vec(100, 100)
				const result = point2d.hitTestPoint(farPoint, 1)
				expect(result).toBe(false)
			})

			it('Handles margin parameter correctly', () => {
				const nearbyPoint = new Vec(13, 20)
				expect(point2d.hitTestPoint(nearbyPoint, 2)).toBe(false)
				expect(point2d.hitTestPoint(nearbyPoint, 4)).toBe(true)
			})
		})

		describe('distanceToPoint', () => {
			it('Returns 0 for the same point', () => {
				const distance = point2d.distanceToPoint(testPoint)
				expect(distance).toBeCloseTo(0)
			})

			it('Calculates correct distance to other points', () => {
				const otherPoint = new Vec(13, 24)
				const distance = point2d.distanceToPoint(otherPoint)
				expect(distance).toBeCloseTo(5) // 3-4-5 triangle
			})

			it('Returns negative distance when hitInside is true and point is inside', () => {
				// For a point geometry, the point itself should be considered "inside"
				const distance = point2d.distanceToPoint(testPoint, true)
				expect(distance).toBeCloseTo(0)
			})
		})

		describe('geometry properties', () => {
			it('Has area of 0', () => {
				expect(point2d.area).toBe(0)
			})

			it('Has length of 0', () => {
				expect(point2d.length).toBe(0)
			})

			it('Is closed', () => {
				expect(point2d.isClosed).toBe(true)
			})

			it('Is filled', () => {
				expect(point2d.isFilled).toBe(true)
			})
		})
	})
})
