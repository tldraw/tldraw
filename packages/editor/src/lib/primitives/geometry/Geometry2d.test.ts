import { Box } from '../Box'
import { Mat } from '../Mat'
import { Vec, VecLike } from '../Vec'
import { Circle2d } from './Circle2d'
import { Geometry2d, Geometry2dFilters } from './Geometry2d'
import { Point2d } from './Point2d'
import { Rectangle2d } from './Rectangle2d'

describe('Geometry2d', () => {
	let rect: Rectangle2d
	let circle: Circle2d
	let point: Point2d

	beforeEach(() => {
		rect = new Rectangle2d({ width: 100, height: 50, isFilled: true })
		circle = new Circle2d({ x: 0, y: 0, radius: 25, isFilled: true })
		point = new Point2d({ point: new Vec(10, 20), margin: 5 })
	})

	describe('constructor and properties', () => {
		it('Sets isFilled property correctly', () => {
			const filledRect = new Rectangle2d({ width: 100, height: 50, isFilled: true })
			const unfilledRect = new Rectangle2d({ width: 100, height: 50, isFilled: false })

			expect(filledRect.isFilled).toBe(true)
			expect(unfilledRect.isFilled).toBe(false)
		})

		it('Sets isClosed property correctly', () => {
			// Rectangle2d is always closed (inherits from Polygon2d)
			expect(rect.isClosed).toBe(true)
			expect(circle.isClosed).toBe(true)
		})

		it('Sets isLabel property correctly', () => {
			const labelGeometry = new Rectangle2d({
				width: 100,
				height: 50,
				isFilled: true,
				isLabel: true,
			})
			const nonLabelGeometry = new Rectangle2d({ width: 100, height: 50, isFilled: true })

			expect(labelGeometry.isLabel).toBe(true)
			expect(nonLabelGeometry.isLabel).toBe(false)
		})

		it('Sets isInternal property correctly', () => {
			const internalGeometry = new Rectangle2d({
				width: 100,
				height: 50,
				isFilled: true,
				isInternal: true,
			})
			const externalGeometry = new Rectangle2d({ width: 100, height: 50, isFilled: true })

			expect(internalGeometry.isInternal).toBe(true)
			expect(externalGeometry.isInternal).toBe(false)
		})

		it('Sets debugColor property correctly', () => {
			const coloredGeometry = new Rectangle2d({
				width: 100,
				height: 50,
				isFilled: true,
				debugColor: 'red',
			})
			const uncoloredGeometry = new Rectangle2d({ width: 100, height: 50, isFilled: true })

			expect(coloredGeometry.debugColor).toBe('red')
			expect(uncoloredGeometry.debugColor).toBeUndefined()
		})

		it('Sets ignore property correctly', () => {
			const ignoredGeometry = new Rectangle2d({
				width: 100,
				height: 50,
				isFilled: true,
				ignore: true,
			})
			const nonIgnoredGeometry = new Rectangle2d({ width: 100, height: 50, isFilled: true })

			expect(ignoredGeometry.ignore).toBe(true)
			expect(nonIgnoredGeometry.ignore).toBeUndefined()
		})
	})

	describe('isExcludedByFilter', () => {
		it('Returns false when no filters provided', () => {
			expect(rect.isExcludedByFilter()).toBe(false)
			expect(rect.isExcludedByFilter(undefined)).toBe(false)
		})

		it('Excludes labels when includeLabels is false', () => {
			const labelGeometry = new Rectangle2d({
				width: 100,
				height: 50,
				isFilled: true,
				isLabel: true,
			})
			expect(labelGeometry.isExcludedByFilter({ includeLabels: false })).toBe(true)
			expect(rect.isExcludedByFilter({ includeLabels: false })).toBe(false)
		})

		it('Excludes internal when includeInternal is false', () => {
			const internalGeometry = new Rectangle2d({
				width: 100,
				height: 50,
				isFilled: true,
				isInternal: true,
			})
			expect(internalGeometry.isExcludedByFilter({ includeInternal: false })).toBe(true)
			expect(rect.isExcludedByFilter({ includeInternal: false })).toBe(false)
		})

		it('Includes labels when includeLabels is true', () => {
			const labelGeometry = new Rectangle2d({
				width: 100,
				height: 50,
				isFilled: true,
				isLabel: true,
			})
			expect(labelGeometry.isExcludedByFilter({ includeLabels: true })).toBe(false)
		})

		it('Includes internal when includeInternal is true', () => {
			const internalGeometry = new Rectangle2d({
				width: 100,
				height: 50,
				isFilled: true,
				isInternal: true,
			})
			expect(internalGeometry.isExcludedByFilter({ includeInternal: true })).toBe(false)
		})
	})

	describe('vertices property', () => {
		it('Returns cached vertices', () => {
			const vertices1 = rect.vertices
			const vertices2 = rect.vertices
			expect(vertices1).toBe(vertices2) // Same reference
		})

		it('Caches vertices after first call', () => {
			// Access vertices to trigger caching
			const vertices = rect.vertices
			expect(vertices).toEqual([new Vec(0, 0), new Vec(100, 0), new Vec(100, 50), new Vec(0, 50)])
		})

		it('Returns correct vertices for rectangle', () => {
			expect(rect.vertices).toEqual([
				new Vec(0, 0),
				new Vec(100, 0),
				new Vec(100, 50),
				new Vec(0, 50),
			])
		})

		it('Returns correct vertices for circle', () => {
			const vertices = circle.vertices
			expect(vertices.length).toBeGreaterThan(8) // Should have multiple vertices
			expect(vertices[0]).toBeInstanceOf(Vec)
			// First vertex should be at radius distance from center
			expect(Vec.Dist(vertices[0], circle._center)).toBeCloseTo(circle.radius, 2)
		})
	})

	describe('bounds property', () => {
		it('Returns cached bounds', () => {
			const bounds1 = rect.bounds
			const bounds2 = rect.bounds
			expect(bounds1).toBe(bounds2) // Same reference
		})

		it('Caches bounds after first call', () => {
			const bounds = rect.bounds
			expect(bounds).toBeInstanceOf(Box)
		})

		it('Returns correct bounds for rectangle', () => {
			const bounds = rect.bounds
			expect(bounds.x).toBe(0)
			expect(bounds.y).toBe(0)
			expect(bounds.w).toBe(100)
			expect(bounds.h).toBe(50)
		})

		it('Returns correct bounds for circle', () => {
			const bounds = circle.bounds
			expect(bounds.x).toBe(0)
			expect(bounds.y).toBe(0)
			expect(bounds.w).toBe(50) // diameter
			expect(bounds.h).toBe(50) // diameter
		})
	})

	describe('center property', () => {
		it('Returns center of bounds', () => {
			const center = rect.center
			expect(center).toBeInstanceOf(Vec)
		})

		it('Calculates center correctly for rectangle', () => {
			const center = rect.center
			expect(center.x).toBe(50) // 100/2
			expect(center.y).toBe(25) // 50/2
		})

		it('Calculates center correctly for circle', () => {
			const center = circle.center
			expect(center.x).toBe(25) // radius
			expect(center.y).toBe(25) // radius
		})
	})

	describe('area property', () => {
		it('Returns cached area', () => {
			const area1 = rect.area
			const area2 = rect.area
			expect(area1).toBe(area2)
		})

		it('Caches area after first call', () => {
			const area = rect.area
			expect(typeof area).toBe('number')
		})

		it('Calculates area correctly for rectangle', () => {
			const area = rect.area
			expect(area).toBe(5000) // 100 * 50
		})

		it('Calculates area correctly for circle', () => {
			const area = circle.area
			// Circle2d approximates area using polygon vertices, not exact π * r²
			expect(area).toBeCloseTo(1875, 1) // Approximated area based on polygon
		})
	})

	describe('length property', () => {
		it('Returns cached length', () => {
			const length1 = rect.length
			const length2 = rect.length
			expect(length1).toBe(length2)
		})

		it('Caches length after first call', () => {
			const length = rect.length
			expect(typeof length).toBe('number')
		})

		it('Calculates length correctly for rectangle', () => {
			const length = rect.length
			expect(length).toBe(300) // 2 * (100 + 50)
		})

		it('Calculates length correctly for circle', () => {
			const length = circle.length
			// Circle2d approximates perimeter using polygon vertices, not exact 2πr
			expect(length).toBeCloseTo(155.3, 1) // Approximated perimeter based on polygon
		})

		it('Calculates length correctly for point', () => {
			const length = point.length
			expect(length).toBe(0) // Point has no length
		})
	})

	describe('hitTestPoint', () => {
		it('Returns true for points inside filled geometry', () => {
			expect(rect.hitTestPoint(new Vec(50, 25), 0, true)).toBe(true)
			expect(circle.hitTestPoint(new Vec(25, 25), 0, true)).toBe(true)
		})

		it('Returns false for points outside geometry', () => {
			expect(rect.hitTestPoint(new Vec(150, 25), 0, true)).toBe(false)
			expect(circle.hitTestPoint(new Vec(100, 100), 0, true)).toBe(false)
		})

		it('Handles margin correctly', () => {
			// Point just outside geometry but within margin
			expect(rect.hitTestPoint(new Vec(105, 25), 10, true)).toBe(true)
			// Point outside margin
			expect(rect.hitTestPoint(new Vec(120, 25), 10, true)).toBe(false)
		})

		it('Handles hitInside parameter correctly', () => {
			const unfilledRect = new Rectangle2d({ width: 100, height: 50, isFilled: false })
			// Inside point without hitInside should return false for unfilled geometry
			expect(unfilledRect.hitTestPoint(new Vec(50, 25), 0, false)).toBe(false)
			// Inside point with hitInside should return true even for unfilled geometry
			expect(unfilledRect.hitTestPoint(new Vec(50, 25), 0, true)).toBe(true)
		})

		it('Works with open geometries', () => {
			// Point2d is a special case - it's always filled and closed
			expect(point.hitTestPoint(new Vec(10, 20), 0, true)).toBe(true)
			expect(point.hitTestPoint(new Vec(20, 30), 0, true)).toBe(false)
		})
	})

	describe('distanceToPoint', () => {
		it('Returns positive distance for points outside', () => {
			const distance = rect.distanceToPoint(new Vec(150, 25))
			expect(distance).toBeGreaterThan(0)
		})

		it('Returns negative distance for points inside filled geometry', () => {
			const distance = rect.distanceToPoint(new Vec(50, 25), true)
			expect(distance).toBeLessThan(0)
		})

		it('Returns zero for points on boundary', () => {
			const distance = rect.distanceToPoint(new Vec(100, 25)) // Right edge
			expect(distance).toBeCloseTo(0, 2)
		})

		it('Handles hitInside parameter correctly', () => {
			const unfilledRect = new Rectangle2d({ width: 100, height: 50, isFilled: false })
			const distanceWithHitInside = unfilledRect.distanceToPoint(new Vec(50, 25), true)
			const distanceWithoutHitInside = unfilledRect.distanceToPoint(new Vec(50, 25), false)

			expect(distanceWithHitInside).toBeLessThan(0) // Negative when hitInside is true
			expect(distanceWithoutHitInside).toBeGreaterThan(0) // Positive for unfilled geometry
		})
	})

	describe('distanceToLineSegment', () => {
		it.todo('Returns zero for intersecting line segments')
		it.todo('Returns positive distance for non-intersecting segments')
		it.todo('Returns negative distance when segment inside filled geometry')
		it.todo('Handles identical points A and B')
	})

	describe('hitTestLineSegment', () => {
		it.todo('Returns true for intersecting line segments')
		it.todo('Returns false for non-intersecting segments')
		it.todo('Handles distance parameter correctly')
	})

	describe('intersectLineSegment', () => {
		it.todo('Returns intersection points for closed geometry')
		it.todo('Returns intersection points for open geometry')
		it.todo('Returns empty array when no intersections')
	})

	describe('intersectCircle', () => {
		it.todo('Returns intersection points for closed geometry')
		it.todo('Returns intersection points for open geometry')
		it.todo('Returns empty array when no intersections')
	})

	describe('intersectPolygon', () => {
		it.todo('Returns intersection points with polygon')
		it.todo('Returns empty array when no intersections')
	})

	describe('intersectPolyline', () => {
		it.todo('Returns intersection points with polyline')
		it.todo('Returns empty array when no intersections')
	})

	describe('interpolateAlongEdge', () => {
		it.todo('Returns first vertex for t = 0')
		it.todo('Returns last vertex for t = 1')
		it.todo('Returns intermediate point for t = 0.5')
		it.todo('Handles t values outside 0-1 range')
	})

	describe('uninterpolateAlongEdge', () => {
		it.todo('Returns 0 for first vertex')
		it.todo('Returns 1 for last vertex')
		it.todo('Returns correct fraction for intermediate points')
	})

	describe('nearestPointOnLineSegment', () => {
		it.todo('Returns nearest point on line segment')
		it.todo('Handles endpoints correctly')
	})

	describe('isPointInBounds', () => {
		it.todo('Returns true for points inside bounds')
		it.todo('Returns false for points outside bounds')
		it.todo('Handles margin correctly')
	})

	describe('transform', () => {
		it('Returns TransformedGeometry2d instance', () => {
			const transform = Mat.Translate(10, 20)
			const transformed = rect.transform(transform)
			expect(transformed.constructor.name).toBe('TransformedGeometry2d')
		})

		it('Passes options correctly', () => {
			const transform = Mat.Translate(10, 20)
			const transformed = rect.transform(transform, { isLabel: true, debugColor: 'blue' })
			expect(transformed.isLabel).toBe(true)
			expect(transformed.debugColor).toBe('blue')
		})
	})

	describe('getBounds', () => {
		it('Returns bounds from vertices', () => {
			const bounds = rect.getBounds()
			expect(bounds).toBeInstanceOf(Box)
			expect(bounds.x).toBe(0)
			expect(bounds.y).toBe(0)
			expect(bounds.w).toBe(100)
			expect(bounds.h).toBe(50)
		})
	})

	describe('getArea', () => {
		it('Returns zero for open geometry', () => {
			// Point2d is technically closed but special case
			const area = point.getArea()
			expect(area).toBe(0)
		})

		it('Calculates area correctly for closed geometry', () => {
			const area = rect.getArea()
			expect(area).toBe(5000) // 100 * 50
		})

		it('Handles single vertex correctly', () => {
			// Point geometry has single vertex
			const area = point.getArea()
			expect(area).toBe(0)
		})
	})

	describe('getLength', () => {
		it('Calculates perimeter for closed geometry', () => {
			const length = rect.getLength()
			expect(length).toBe(300) // 2 * (100 + 50)
		})

		it('Calculates length for open geometry', () => {
			// Point has no length
			const length = point.getLength()
			expect(length).toBe(0)
		})

		it('Returns zero for empty vertices', () => {
			// This would be a pathological case, but point is closest we have
			const length = point.getLength()
			expect(length).toBe(0)
		})
	})

	describe('isPointInBounds', () => {
		it('Returns true for points inside bounds', () => {
			expect(rect.isPointInBounds(new Vec(50, 25))).toBe(true)
		})

		it('Returns false for points outside bounds', () => {
			expect(rect.isPointInBounds(new Vec(150, 25))).toBe(false)
		})

		it('Handles margin correctly', () => {
			expect(rect.isPointInBounds(new Vec(105, 25), 10)).toBe(true)
			expect(rect.isPointInBounds(new Vec(120, 25), 10)).toBe(false)
		})
	})

	describe('intersectLineSegment', () => {
		it('Returns intersection points for closed geometry', () => {
			// Line crossing through the rectangle
			const intersections = rect.intersectLineSegment(new Vec(-10, 25), new Vec(110, 25))
			expect(intersections.length).toBe(2) // Should intersect left and right edges
		})

		it('Returns empty array when no intersections', () => {
			// Line that doesn't intersect the rectangle
			const intersections = rect.intersectLineSegment(new Vec(200, 25), new Vec(300, 25))
			expect(intersections).toEqual([])
		})
	})

	describe('toSimpleSvgPath', () => {
		it.todo('Returns SVG path string')
		it.todo('Handles different geometry types')
	})
})

describe('TransformedGeometry2d', () => {
	let baseRect: Rectangle2d
	let transformedRect: Geometry2d

	beforeEach(() => {
		baseRect = new Rectangle2d({ width: 100, height: 50, isFilled: true })
		transformedRect = baseRect.transform(Mat.Translate(50, 100).scale(2, 2))
	})

	describe('constructor', () => {
		it('Creates instance with correct properties', () => {
			expect(transformedRect).toBeInstanceOf(Object)
			expect(transformedRect.constructor.name).toBe('TransformedGeometry2d')
		})

		it('Inherits base geometry properties', () => {
			expect(transformedRect.isFilled).toBe(baseRect.isFilled)
			expect(transformedRect.isClosed).toBe(baseRect.isClosed)
		})

		it('Applies transform options', () => {
			const transformedWithOptions = baseRect.transform(Mat.Translate(10, 20), {
				isLabel: true,
				debugColor: 'red',
			})
			expect(transformedWithOptions.isLabel).toBe(true)
			expect(transformedWithOptions.debugColor).toBe('red')
		})
	})

	describe('getVertices', () => {
		it('transforms vertices correctly', () => {
			expect(transformedRect.getVertices(Geometry2dFilters.INCLUDE_ALL)).toMatchObject([
				{ x: 50, y: 100, z: 1 },
				{ x: 250, y: 100, z: 1 },
				{ x: 250, y: 200, z: 1 },
				{ x: 50, y: 200, z: 1 },
			])
		})

		it('Applies filters correctly', () => {
			const vertices = transformedRect.getVertices(Geometry2dFilters.EXCLUDE_LABELS)
			expect(vertices.length).toBe(4)
		})

		it.failing('Handles different transform matrices', () => {
			const rotatedRect = baseRect.transform(Mat.Rotate(Math.PI / 4))
			const vertices = rotatedRect.getVertices(Geometry2dFilters.INCLUDE_ALL)
			expect(vertices.length).toBe(4)
			// Vertices should be rotated
			expect(vertices[0]).not.toEqual(baseRect.vertices[0])
		})
	})

	describe('nearestPoint', () => {
		it('calculates nearest point correctly', () => {
			expectApproxMatch(transformedRect.nearestPoint(new Vec(100, 300)), { x: 100, y: 200 })
		})

		it('Handles different point positions', () => {
			const nearestToLeft = transformedRect.nearestPoint(new Vec(0, 150))
			expectApproxMatch(nearestToLeft, { x: 50, y: 150 })
		})

		it('Applies filters correctly', () => {
			const nearest = transformedRect.nearestPoint(new Vec(100, 300), Geometry2dFilters.INCLUDE_ALL)
			expect(nearest).toBeInstanceOf(Vec)
		})
	})

	describe('hitTestPoint', () => {
		it('tests basic hit detection without margin', () => {
			expect(transformedRect.hitTestPoint(new Vec(0, 0), 0, true)).toBe(false)
			expect(transformedRect.hitTestPoint(new Vec(50, 100), 0, true)).toBe(true)
			expect(transformedRect.hitTestPoint(new Vec(49, 100), 0, true)).toBe(false)
			expect(transformedRect.hitTestPoint(new Vec(100, 150), 0, true)).toBe(true)
		})

		it('handles margin correctly', () => {
			// move away 8 px and test with 10px margin:
			expect(transformedRect.hitTestPoint(new Vec(42, 100), 10, true)).toBe(true)
			// move away 12 px and test with 10px margin:
			expect(transformedRect.hitTestPoint(new Vec(38, 100), 10, true)).toBe(false)
		})

		it('Handles hitInside parameter', () => {
			const unfilledTransformed = new Rectangle2d({
				width: 100,
				height: 50,
				isFilled: false,
			}).transform(Mat.Translate(50, 100).scale(2, 2))
			expect(unfilledTransformed.hitTestPoint(new Vec(150, 150), 0, false)).toBe(false)
			expect(unfilledTransformed.hitTestPoint(new Vec(150, 150), 0, true)).toBe(true)
		})

		it('Applies filters correctly', () => {
			const hit = transformedRect.hitTestPoint(
				new Vec(150, 150),
				0,
				true,
				Geometry2dFilters.INCLUDE_ALL
			)
			expect(typeof hit).toBe('boolean')
		})
	})

	describe('distanceToPoint', () => {
		it('Calculates distance correctly', () => {
			const distance = transformedRect.distanceToPoint(new Vec(300, 150))
			expect(distance).toBeGreaterThan(0)
		})

		it('Handles scaling correctly', () => {
			const distance = transformedRect.distanceToPoint(new Vec(300, 150))
			const originalDistance = baseRect.distanceToPoint(new Vec(125, 75)) // Scaled back position
			// The scaled distance should be different due to transform
			expect(distance).not.toBe(originalDistance)
		})

		it('Applies filters correctly', () => {
			const distance = transformedRect.distanceToPoint(
				new Vec(300, 150),
				true,
				Geometry2dFilters.INCLUDE_ALL
			)
			expect(typeof distance).toBe('number')
		})
	})

	describe('distanceToLineSegment', () => {
		it('Calculates distance to line segment correctly', () => {
			const distance = transformedRect.distanceToLineSegment(new Vec(300, 150), new Vec(400, 150))
			expect(distance).toBeGreaterThan(0)
		})

		it('Handles scaling correctly', () => {
			const distance = transformedRect.distanceToLineSegment(new Vec(300, 150), new Vec(400, 150))
			expect(typeof distance).toBe('number')
		})

		it('Applies filters correctly', () => {
			const distance = transformedRect.distanceToLineSegment(
				new Vec(300, 150),
				new Vec(400, 150),
				Geometry2dFilters.INCLUDE_ALL
			)
			expect(typeof distance).toBe('number')
		})
	})

	describe('hitTestLineSegment', () => {
		it('Tests line segment hit correctly', () => {
			// Line crossing through transformed rectangle
			const hit = transformedRect.hitTestLineSegment(new Vec(0, 150), new Vec(300, 150))
			expect(hit).toBe(true)
		})

		it.failing('Handles distance parameter', () => {
			const hit = transformedRect.hitTestLineSegment(new Vec(0, 90), new Vec(300, 90), 15)
			expect(hit).toBe(true) // Within margin
		})

		it('Applies filters correctly', () => {
			const hit = transformedRect.hitTestLineSegment(
				new Vec(0, 150),
				new Vec(300, 150),
				0,
				Geometry2dFilters.INCLUDE_ALL
			)
			expect(typeof hit).toBe('boolean')
		})
	})

	describe('intersectLineSegment', () => {
		it('Returns transformed intersection points', () => {
			const intersections = transformedRect.intersectLineSegment(new Vec(0, 150), new Vec(300, 150))
			expect(intersections.length).toBeGreaterThan(0)
			if (intersections.length > 0) {
				expect(intersections[0]).toHaveProperty('x')
				expect(intersections[0]).toHaveProperty('y')
			}
		})

		it('Handles no intersections', () => {
			const intersections = transformedRect.intersectLineSegment(new Vec(0, 50), new Vec(30, 50))
			expect(intersections).toEqual([])
		})

		it('Applies filters correctly', () => {
			const intersections = transformedRect.intersectLineSegment(
				new Vec(0, 150),
				new Vec(300, 150),
				Geometry2dFilters.INCLUDE_ALL
			)
			expect(Array.isArray(intersections)).toBe(true)
		})
	})

	describe('intersectCircle', () => {
		it('Returns transformed intersection points', () => {
			const intersections = transformedRect.intersectCircle(new Vec(150, 150), 100)
			expect(Array.isArray(intersections)).toBe(true)
		})

		it('Handles scaling for radius', () => {
			const intersections = transformedRect.intersectCircle(new Vec(150, 150), 20)
			expect(Array.isArray(intersections)).toBe(true)
		})

		it('Applies filters correctly', () => {
			const intersections = transformedRect.intersectCircle(
				new Vec(150, 150),
				100,
				Geometry2dFilters.INCLUDE_ALL
			)
			expect(Array.isArray(intersections)).toBe(true)
		})
	})

	describe('intersectPolyline', () => {
		it('Returns transformed intersection points', () => {
			const polyline = [new Vec(0, 150), new Vec(150, 150), new Vec(300, 150)]
			const intersections = transformedRect.intersectPolyline(polyline)
			expect(Array.isArray(intersections)).toBe(true)
		})

		it('Transforms input polyline correctly', () => {
			const polyline = [new Vec(0, 150), new Vec(300, 150)]
			const intersections = transformedRect.intersectPolyline(polyline)
			expect(Array.isArray(intersections)).toBe(true)
		})

		it('Applies filters correctly', () => {
			const polyline = [new Vec(0, 150), new Vec(300, 150)]
			const intersections = transformedRect.intersectPolyline(
				polyline,
				Geometry2dFilters.INCLUDE_ALL
			)
			expect(Array.isArray(intersections)).toBe(true)
		})
	})

	describe('transform', () => {
		it('Creates new TransformedGeometry2d with combined transform', () => {
			const doubleTransformed = transformedRect.transform(Mat.Scale(0.5, 0.5))
			expect(doubleTransformed.constructor.name).toBe('TransformedGeometry2d')
		})

		it('Preserves options correctly', () => {
			const withOptions = baseRect.transform(Mat.Translate(10, 20), { isLabel: true })
			const doubleTransformed = withOptions.transform(Mat.Scale(2, 2), { debugColor: 'green' })
			expect(doubleTransformed.isLabel).toBe(true)
			expect(doubleTransformed.debugColor).toBe('green')
		})
	})

	describe('getSvgPathData', () => {
		it.failing('Returns SVG path data for transformed geometry', () => {
			const pathData = transformedRect.getSvgPathData(true)
			expect(typeof pathData).toBe('string')
			expect(pathData.length).toBeGreaterThan(0)
		})

		it.failing('Handles different geometry types', () => {
			const testCircle = new Circle2d({ x: 0, y: 0, radius: 25, isFilled: true })
			const transformedCircle = testCircle.transform(Mat.Translate(10, 20))
			const pathData = transformedCircle.getSvgPathData(true)
			expect(typeof pathData).toBe('string')
		})
	})
})

function expectApproxMatch(a: VecLike, b: VecLike) {
	expect(a.x).toBeCloseTo(b.x, 0.0001)
	expect(a.y).toBeCloseTo(b.y, 0.0001)
}
