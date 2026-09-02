import { Mat } from '../Mat'
import { Vec, VecLike } from '../Vec'
import { Edge2d } from './Edge2d'
import {
	Geometry2d,
	Geometry2dFilters,
	Geometry2dOptions,
	TransformedGeometry2d,
} from './Geometry2d'
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

describe('interpolateAlongEdge', () => {
	it('returns vertex when segment has zero length', () => {
		const edge = new Edge2d({ start: new Vec(5, 5), end: new Vec(5, 5) })
		const result = edge.interpolateAlongEdge(0.5)
		expect(result.x).toBe(5)
		expect(result.y).toBe(5)
		expect(Number.isFinite(result.x)).toBe(true)
		expect(Number.isFinite(result.y)).toBe(true)
	})
})

describe('uninterpolateAlongEdge', () => {
	it('returns 0 when geometry has zero length', () => {
		const edge = new Edge2d({ start: new Vec(5, 5), end: new Vec(5, 5) })
		const result = edge.uninterpolateAlongEdge(new Vec(5, 5))
		expect(result).toBe(0)
		expect(Number.isFinite(result)).toBe(true)
	})
})

function expectApproxMatch(a: VecLike, b: VecLike) {
	expect(a.x).toBeCloseTo(b.x, 0.0001)
	expect(a.y).toBeCloseTo(b.y, 0.0001)
}

// A minimal concrete geometry so the base class implementations can be exercised directly,
// without the overrides that the built-in shapes add.
class TestPolygon extends Geometry2d {
	constructor(
		private points: Vec[],
		opts: Partial<Geometry2dOptions> = {}
	) {
		super({ isFilled: false, isClosed: true, ...opts })
	}

	getVertices() {
		return this.points
	}

	nearestPoint(point: VecLike): Vec {
		const { points } = this
		if (points.length === 0) return new Vec(0, 0)
		let nearest = points[0]
		let dist = Infinity
		const limit = this.isClosed ? points.length : points.length - 1
		for (let i = 0; i < limit; i++) {
			const p = Vec.NearestPointOnLineSegment(points[i], points[(i + 1) % points.length], point)
			const d = Vec.Dist2(p, point)
			if (d < dist) {
				dist = d
				nearest = p
			}
		}
		return nearest
	}

	getSvgPathData() {
		return ''
	}
}

// A 100x100 square at the origin
const squarePoints = () => [new Vec(0, 0), new Vec(100, 0), new Vec(100, 100), new Vec(0, 100)]
const square = (opts: Partial<Geometry2dOptions> = {}) => new TestPolygon(squarePoints(), opts)
const filledSquare = () => square({ isFilled: true })
// An open L shape: along the top of the square and down its right side
const openL = (opts: Partial<Geometry2dOptions> = {}) =>
	new TestPolygon([new Vec(0, 0), new Vec(100, 0), new Vec(100, 100)], { isClosed: false, ...opts })

function sortPoints(points: VecLike[]) {
	const round = (n: number) => Math.round(n * 1e6) / 1e6
	return [...points]
		.map((p) => ({ x: round(p.x), y: round(p.y) }))
		.sort((a, b) => a.x - b.x || a.y - b.y)
}

describe('Geometry2d construction', () => {
	it('defaults the optional flags', () => {
		expect(square()).toMatchObject({
			isFilled: false,
			isClosed: true,
			isLabel: false,
			isEmptyLabel: false,
			isInternal: false,
			excludeFromShapeBounds: false,
			debugColor: undefined,
			ignore: undefined,
		})
	})

	it('keeps the provided flags', () => {
		expect(
			square({
				isFilled: true,
				isLabel: true,
				isEmptyLabel: true,
				isInternal: true,
				excludeFromShapeBounds: true,
				debugColor: 'red',
				ignore: true,
			})
		).toMatchObject({
			isFilled: true,
			isLabel: true,
			isEmptyLabel: true,
			isInternal: true,
			excludeFromShapeBounds: true,
			debugColor: 'red',
			ignore: true,
		})
	})
})

describe('Geometry2d.isExcludedByFilter', () => {
	it('is never excluded without filters', () => {
		expect(square({ isLabel: true }).isExcludedByFilter()).toBe(false)
		expect(square({ isInternal: true }).isExcludedByFilter(undefined)).toBe(false)
	})

	it('excludes labels and internal geometry according to the filter', () => {
		const plain = square()
		const label = square({ isLabel: true })
		const internal = square({ isInternal: true })
		const both = square({ isLabel: true, isInternal: true })
		const { INCLUDE_ALL, EXCLUDE_LABELS, EXCLUDE_INTERNAL, EXCLUDE_NON_STANDARD } =
			Geometry2dFilters

		expect([plain, label, internal, both].map((g) => g.isExcludedByFilter(INCLUDE_ALL))).toEqual([
			false,
			false,
			false,
			false,
		])
		expect([plain, label, internal, both].map((g) => g.isExcludedByFilter(EXCLUDE_LABELS))).toEqual(
			[false, true, false, true]
		)
		expect(
			[plain, label, internal, both].map((g) => g.isExcludedByFilter(EXCLUDE_INTERNAL))
		).toEqual([false, false, true, true])
		expect(
			[plain, label, internal, both].map((g) => g.isExcludedByFilter(EXCLUDE_NON_STANDARD))
		).toEqual([false, true, true, true])
	})
})

describe('Geometry2d.hitTestPoint', () => {
	it('hits the interior only when filled or hitInside', () => {
		expect(filledSquare().hitTestPoint(new Vec(50, 50))).toBe(true)
		expect(square().hitTestPoint(new Vec(50, 50))).toBe(false)
		expect(square().hitTestPoint(new Vec(50, 50), 0, true)).toBe(true)
	})

	it('hits the edge and respects the margin outside', () => {
		expect(square().hitTestPoint(new Vec(100, 50))).toBe(true)
		expect(square().hitTestPoint(new Vec(150, 50))).toBe(false)
		expect(square().hitTestPoint(new Vec(150, 50), 50)).toBe(true)
		expect(square().hitTestPoint(new Vec(150, 50), 49)).toBe(false)
	})

	it('respects the margin inside an unfilled shape', () => {
		expect(square().hitTestPoint(new Vec(90, 50), 10)).toBe(true)
		expect(square().hitTestPoint(new Vec(90, 50), 9)).toBe(false)
	})

	it('ignores hitInside for open geometry', () => {
		expect(openL().hitTestPoint(new Vec(90, 10), 0, true)).toBe(false)
		expect(openL({ isFilled: true }).hitTestPoint(new Vec(90, 10))).toBe(false)
	})
})

describe('Geometry2d.distanceToPoint', () => {
	it('is negative inside only when filled or hitInside', () => {
		expect(filledSquare().distanceToPoint(new Vec(50, 50))).toBe(-50)
		expect(square().distanceToPoint(new Vec(50, 50))).toBe(50)
		expect(square().distanceToPoint(new Vec(50, 50), true)).toBe(-50)
	})

	it('is positive outside', () => {
		expect(filledSquare().distanceToPoint(new Vec(150, 50))).toBe(50)
		expect(square().distanceToPoint(new Vec(-3, -4))).toBe(5)
	})

	it('is never negative for open geometry', () => {
		expect(openL({ isFilled: true }).distanceToPoint(new Vec(90, 10), true)).toBe(10)
	})
})

describe('Geometry2d.distanceToLineSegment', () => {
	it('falls back to distanceToPoint for a degenerate segment', () => {
		expect(square().distanceToLineSegment(new Vec(150, 50), new Vec(150, 50))).toBe(50)
		expect(filledSquare().distanceToLineSegment(new Vec(50, 50), new Vec(50, 50))).toBe(-50)
	})

	it('is zero when the segment crosses an edge', () => {
		expect(square().distanceToLineSegment(new Vec(50, -10), new Vec(50, 110))).toBe(0)
		expect(openL().distanceToLineSegment(new Vec(50, -10), new Vec(50, 10))).toBe(0)
	})

	it('does not count the closing segment of open geometry', () => {
		// the segment crosses the line from (100, 100) back to (0, 0)
		const closedL = new TestPolygon([new Vec(0, 0), new Vec(100, 0), new Vec(100, 100)])
		expect(closedL.distanceToLineSegment(new Vec(20, 30), new Vec(30, 20))).toBe(0)
		expect(openL().distanceToLineSegment(new Vec(20, 30), new Vec(30, 20))).toBeGreaterThan(0)
	})

	it('measures from the nearest vertex to the segment', () => {
		expect(square().distanceToLineSegment(new Vec(150, -50), new Vec(150, 50))).toBe(50)
	})

	// Locks in current behaviour, see #10556.
	it('measures from the polygon vertices, not its edges', () => {
		// the segment is 5 units above the middle of the top edge, but 50.25 from the nearest vertex
		expect(square().distanceToLineSegment(new Vec(50, -10), new Vec(50, -5))).toBeCloseTo(
			Math.hypot(50, 5)
		)
	})

	it('is negative when the nearest point lies inside a filled shape', () => {
		const d = square().distanceToLineSegment(new Vec(40, 50), new Vec(60, 50))
		expect(d).toBeCloseTo(Math.hypot(40, 50))
		expect(filledSquare().distanceToLineSegment(new Vec(40, 50), new Vec(60, 50))).toBe(-d)
	})

	it('handles degenerate vertex lists', () => {
		expect(() => new TestPolygon([]).distanceToLineSegment(new Vec(0, 0), new Vec(10, 0))).toThrow(
			'nearest point not found'
		)
		expect(
			new TestPolygon([new Vec(3, 4)]).distanceToLineSegment(new Vec(0, 0), new Vec(10, 0))
		).toBe(5)
	})
})

describe('Geometry2d.hitTestLineSegment', () => {
	it('hits when the segment is within the distance', () => {
		expect(square().hitTestLineSegment(new Vec(50, -10), new Vec(50, 110))).toBe(true)
		expect(square().hitTestLineSegment(new Vec(150, -50), new Vec(150, 50))).toBe(false)
		expect(square().hitTestLineSegment(new Vec(150, -50), new Vec(150, 50), 50)).toBe(true)
		expect(square().hitTestLineSegment(new Vec(150, -50), new Vec(150, 50), 49)).toBe(false)
	})
})

describe('Geometry2d.intersectLineSegment', () => {
	it('intersects closed geometry as a polygon', () => {
		expect(sortPoints(square().intersectLineSegment(new Vec(-10, 50), new Vec(110, 50)))).toEqual([
			{ x: 0, y: 50 },
			{ x: 100, y: 50 },
		])
	})

	it('intersects open geometry as a polyline', () => {
		expect(sortPoints(openL().intersectLineSegment(new Vec(-10, 50), new Vec(110, 50)))).toEqual([
			{ x: 100, y: 50 },
		])
	})

	it('returns an empty array when there is no intersection', () => {
		expect(square().intersectLineSegment(new Vec(150, 0), new Vec(150, 100))).toEqual([])
	})
})

describe('Geometry2d.intersectCircle', () => {
	it('intersects closed geometry as a polygon', () => {
		expect(sortPoints(square().intersectCircle(new Vec(0, 50), 10))).toEqual([
			{ x: 0, y: 40 },
			{ x: 0, y: 60 },
		])
	})

	it('intersects open geometry as a polyline', () => {
		expect(openL().intersectCircle(new Vec(0, 50), 10)).toEqual([])
		expect(sortPoints(openL().intersectCircle(new Vec(100, 50), 10))).toEqual([
			{ x: 100, y: 40 },
			{ x: 100, y: 60 },
		])
	})

	it('returns an empty array when there is no intersection', () => {
		expect(square().intersectCircle(new Vec(50, 50), 10)).toEqual([])
	})
})

describe('Geometry2d.intersectPolygon and intersectPolyline', () => {
	const strip = [new Vec(40, -10), new Vec(60, -10), new Vec(60, 110), new Vec(40, 110)]

	it('finds where a polygon crosses the edges', () => {
		expect(sortPoints(square().intersectPolygon(strip))).toEqual([
			{ x: 40, y: 0 },
			{ x: 40, y: 100 },
			{ x: 60, y: 0 },
			{ x: 60, y: 100 },
		])
		expect(sortPoints(openL().intersectPolygon(strip))).toEqual([
			{ x: 40, y: 0 },
			{ x: 60, y: 0 },
		])
	})

	it('finds where a polyline crosses the edges, without closing it', () => {
		// only the x = 60 side of the strip is a polyline segment; x = 40 would be the closing side
		expect(sortPoints(square().intersectPolyline(strip))).toEqual([
			{ x: 60, y: 0 },
			{ x: 60, y: 100 },
		])
		expect(sortPoints(square().intersectPolyline([new Vec(40, -10), new Vec(40, 110)]))).toEqual([
			{ x: 40, y: 0 },
			{ x: 40, y: 100 },
		])
	})

	it('returns an empty array when there is no intersection', () => {
		const far = [new Vec(200, 0), new Vec(300, 0), new Vec(300, 100)]
		expect(square().intersectPolygon(far)).toEqual([])
		expect(square().intersectPolyline(far)).toEqual([])
	})
})

describe('Geometry2d.interpolateAlongEdge', () => {
	it('walks around closed geometry and back to the start', () => {
		const s = square()
		expect(s.interpolateAlongEdge(0)).toMatchObject({ x: 0, y: 0 })
		expect(s.interpolateAlongEdge(0.125)).toMatchObject({ x: 50, y: 0 })
		expect(s.interpolateAlongEdge(0.5)).toMatchObject({ x: 100, y: 100 })
		expect(s.interpolateAlongEdge(0.875)).toMatchObject({ x: 0, y: 50 })
		expect(s.interpolateAlongEdge(1)).toMatchObject({ x: 0, y: 0 })
	})

	it('stops at the last vertex of open geometry', () => {
		const l = openL()
		expect(l.interpolateAlongEdge(0.25)).toMatchObject({ x: 50, y: 0 })
		expect(l.interpolateAlongEdge(1)).toMatchObject({ x: 100, y: 100 })
		expect(l.interpolateAlongEdge(2)).toMatchObject({ x: 100, y: 100 })
	})

	it('clamps negative values to the first vertex', () => {
		expect(square().interpolateAlongEdge(-1)).toMatchObject({ x: 0, y: 0 })
	})

	it('handles degenerate vertex lists', () => {
		expect(new TestPolygon([]).interpolateAlongEdge(0.5)).toMatchObject({ x: 0, y: 0 })
		expect(new TestPolygon([new Vec(3, 4)]).interpolateAlongEdge(0.5)).toMatchObject({ x: 3, y: 4 })
	})
})

describe('Geometry2d.uninterpolateAlongEdge', () => {
	it('is the inverse of interpolateAlongEdge', () => {
		const s = square()
		expect(s.uninterpolateAlongEdge(new Vec(0, 0))).toBe(0)
		expect(s.uninterpolateAlongEdge(new Vec(50, 0))).toBe(0.125)
		expect(s.uninterpolateAlongEdge(new Vec(100, 50))).toBe(0.375)
		expect(s.uninterpolateAlongEdge(new Vec(50, 100))).toBe(0.625)
		expect(s.uninterpolateAlongEdge(new Vec(0, 50))).toBe(0.875)
	})

	it('snaps points off the edge to the nearest segment', () => {
		expect(square().uninterpolateAlongEdge(new Vec(50, -20))).toBe(0.125)
		expect(openL().uninterpolateAlongEdge(new Vec(120, 50))).toBe(0.75)
	})

	it('handles degenerate vertex lists', () => {
		expect(new TestPolygon([]).uninterpolateAlongEdge(new Vec(1, 1))).toBe(0)
		expect(new TestPolygon([new Vec(3, 4)]).uninterpolateAlongEdge(new Vec(1, 1))).toBe(0)
	})
})

describe('Geometry2d.overlapsPolygon', () => {
	const inside = [new Vec(40, 40), new Vec(60, 40), new Vec(60, 60), new Vec(40, 60)]
	const corner = [new Vec(10, 10), new Vec(20, 10), new Vec(20, 20), new Vec(10, 20)]
	const strip = [new Vec(40, -10), new Vec(60, -10), new Vec(60, 110), new Vec(40, 110)]
	const around = [new Vec(-10, -10), new Vec(110, -10), new Vec(110, 110), new Vec(-10, 110)]
	const far = [new Vec(200, 0), new Vec(300, 0), new Vec(300, 100), new Vec(200, 100)]

	it('overlaps when a vertex is inside the polygon', () => {
		expect(square().overlapsPolygon(around)).toBe(true)
		expect(openL().overlapsPolygon(around)).toBe(true)
	})

	it('overlaps a polygon inside a filled shape, but not inside a hollow one', () => {
		expect(filledSquare().overlapsPolygon(inside)).toBe(true)
		expect(filledSquare().overlapsPolygon(corner)).toBe(true)
		expect(square().overlapsPolygon(inside)).toBe(false)
		expect(square().overlapsPolygon(corner)).toBe(false)
	})

	it('overlaps when the edges cross', () => {
		expect(square().overlapsPolygon(strip)).toBe(true)
		expect(openL().overlapsPolygon(strip)).toBe(true)
	})

	it('does not overlap a polygon that is far away', () => {
		expect(filledSquare().overlapsPolygon(far)).toBe(false)
		expect(openL().overlapsPolygon(far)).toBe(false)
	})

	it('never overlaps for empty labels', () => {
		expect(filledSquare().overlapsPolygon(around)).toBe(true)
		expect(square({ isFilled: true, isEmptyLabel: true }).overlapsPolygon(around)).toBe(false)
	})

	it('accepts plain objects', () => {
		expect(square().overlapsPolygon(around.map((v) => ({ x: v.x, y: v.y })))).toBe(true)
	})
})

describe('Geometry2d.isPointInBounds', () => {
	it('checks the bounds with an optional margin', () => {
		expect(openL().isPointInBounds(new Vec(10, 90))).toBe(true)
		expect(openL().isPointInBounds(new Vec(-5, 50))).toBe(false)
		expect(openL().isPointInBounds(new Vec(-5, 50), 5)).toBe(true)
		expect(openL().isPointInBounds(new Vec(105, 105), 5)).toBe(true)
		expect(openL().isPointInBounds(new Vec(105, 106), 5)).toBe(false)
	})
})

describe('Geometry2d measurements', () => {
	it('derives the center from the bounds', () => {
		expect(square().center).toMatchObject({ x: 50, y: 50 })
		expect(new TestPolygon([new Vec(10, 20), new Vec(30, 60)]).center).toMatchObject({
			x: 20,
			y: 40,
		})
	})

	it('computes a signed shoelace area for closed geometry', () => {
		expect(square().area).toBe(10000)
		expect(new TestPolygon(squarePoints().reverse()).area).toBe(-10000)
		expect(new TestPolygon([new Vec(0, 0), new Vec(10, 0), new Vec(0, 10)]).area).toBe(50)
	})

	it('has zero area for open geometry', () => {
		expect(openL().area).toBe(0)
		expect(openL({ isFilled: true }).area).toBe(0)
	})

	it('caches the area', () => {
		const s = square()
		expect(s.area).toBe(10000)
		s['points'].push(new Vec(-100, 50))
		expect(s.area).toBe(10000)
	})

	it('computes the length, closing the path only for closed geometry', () => {
		expect(square().length).toBe(400)
		expect(openL().length).toBe(200)
		expect(openL().getLength()).toBe(200)
		expect(new TestPolygon([]).getLength()).toBe(0)
		expect(new TestPolygon([new Vec(3, 4)]).getLength()).toBe(0)
	})
})

describe('Geometry2d.toSimpleSvgPath', () => {
	it('draws straight lines through the vertices', () => {
		expect(square().toSimpleSvgPath()).toBe('M0,0L100,0L100,100L0,100Z')
		expect(openL().toSimpleSvgPath()).toBe('M0,0L100,0L100,100')
		expect(new TestPolygon([]).toSimpleSvgPath()).toBe('')
	})
})

describe('Geometry2d.ignoreHit', () => {
	it('never rejects hits by default', () => {
		expect(square().ignoreHit(new Vec(50, 50))).toBe(false)
		expect(square().ignoreHit(new Vec(500, 500))).toBe(false)
	})
})

describe('TransformedGeometry2d delegation', () => {
	// 100x50 rect translated to (50, 100) and scaled by 2: occupies (50, 100) to (250, 200)
	const matrix = Mat.Translate(50, 100).scale(2, 2)
	const rect = () => new Rectangle2d({ width: 100, height: 50, isFilled: true }).transform(matrix)

	it('copies the flags of the wrapped geometry and applies the overrides', () => {
		const inner = new Rectangle2d({
			width: 100,
			height: 50,
			isFilled: true,
			isLabel: true,
			isInternal: true,
			excludeFromShapeBounds: true,
		})
		expect(inner.transform(matrix)).toMatchObject({
			isFilled: true,
			isClosed: true,
			isLabel: true,
			isInternal: true,
			excludeFromShapeBounds: true,
		})
		expect(
			inner.transform(matrix, {
				isLabel: false,
				isInternal: false,
				debugColor: 'red',
				ignore: true,
			})
		).toMatchObject({ isLabel: false, isInternal: false, debugColor: 'red', ignore: true })
	})

	it('rejects non-uniform scaling', () => {
		expect(() =>
			new Rectangle2d({ width: 10, height: 10, isFilled: true }).transform(Mat.Scale(2, 3))
		).toThrow('non-uniform scaling is not yet supported')
	})

	it('scales distances back into the outer space', () => {
		expect(rect().distanceToPoint(new Vec(350, 150))).toBe(100)
		expect(rect().distanceToPoint(new Vec(150, 150))).toBe(-50)
		expect(rect().distanceToLineSegment(new Vec(350, 100), new Vec(350, 200))).toBe(100)
	})

	it('scales the hit test distance into the inner space', () => {
		expect(rect().hitTestLineSegment(new Vec(350, 100), new Vec(350, 200), 100)).toBe(true)
		expect(rect().hitTestLineSegment(new Vec(350, 100), new Vec(350, 200), 99)).toBe(false)
		expect(rect().hitTestLineSegment(new Vec(150, 50), new Vec(150, 250))).toBe(true)
	})

	it('maps intersections back into the outer space', () => {
		expect(sortPoints(rect().intersectLineSegment(new Vec(0, 150), new Vec(400, 150)))).toEqual([
			{ x: 50, y: 150 },
			{ x: 250, y: 150 },
		])
		expect(sortPoints(rect().intersectCircle(new Vec(50, 150), 20))).toEqual([
			{ x: 50, y: 130 },
			{ x: 50, y: 170 },
		])
		const polygon = [new Vec(0, 120), new Vec(100, 120), new Vec(100, 180), new Vec(0, 180)]
		expect(sortPoints(rect().intersectPolygon(polygon))).toEqual([
			{ x: 50, y: 120 },
			{ x: 50, y: 180 },
		])
		expect(sortPoints(rect().intersectPolyline([new Vec(0, 120), new Vec(100, 120)]))).toEqual([
			{ x: 50, y: 120 },
		])
	})

	it('hit tests rotated geometry', () => {
		// rotate the 100x50 rect a quarter turn about the origin: it now spans x in [-50, 0]
		const rotated = new Rectangle2d({ width: 100, height: 50, isFilled: true }).transform(
			Mat.Rotate(Math.PI / 2)
		)
		expect(rotated.hitTestPoint(new Vec(-25, 50))).toBe(true)
		expect(rotated.hitTestPoint(new Vec(25, 50))).toBe(false)
		expect(rotated.bounds.x).toBeCloseTo(-50)
		expect(rotated.bounds.w).toBeCloseTo(50)
		expect(rotated.bounds.h).toBeCloseTo(100)
	})

	it('delegates ignoreHit in the inner space', () => {
		class RightHalfIgnored extends TestPolygon {
			override ignoreHit(point: VecLike) {
				return point.x > 50
			}
		}
		const g = new RightHalfIgnored(squarePoints()).transform(matrix)
		expect(g.ignoreHit(new Vec(100, 150))).toBe(false)
		expect(g.ignoreHit(new Vec(200, 150))).toBe(true)
	})

	it('composes nested transforms and carries the flags forward', () => {
		const g = rect()
			.transform(Mat.Translate(-50, -100), { debugColor: 'red' })
			.transform(Mat.Scale(0.5, 0.5))
		expect(g).toBeInstanceOf(TransformedGeometry2d)
		expect(g.bounds).toMatchObject({ x: 0, y: 0, w: 100, h: 50 })
		expect(g).toMatchObject({ debugColor: 'red', isFilled: true })
	})

	it('cannot produce svg path data', () => {
		expect(() => rect().getSvgPathData(true)).toThrow(
			'Cannot get SVG path data for transformed geometry.'
		)
	})
})
