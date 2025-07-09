import {
	intersectCircleCircle,
	intersectCirclePolygon,
	intersectCirclePolyline,
	intersectLineSegmentCircle,
	intersectLineSegmentLineSegment,
	intersectLineSegmentPolygon,
	intersectLineSegmentPolyline,
	intersectPolygonPolygon,
} from './intersect'
import { Vec, VecLike } from './Vec'

describe('intersectLineSegmentLineSegment', () => {
	describe('intersecting segments', () => {
		it('should find intersection when segments cross', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(10, 10)
			const b1 = new Vec(0, 10)
			const b2 = new Vec(10, 0)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
			expect(result!.x).toBeCloseTo(5, 5)
			expect(result!.y).toBeCloseTo(5, 5)
		})

		it('should find intersection when segments cross at an angle', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(8, 6)
			const b1 = new Vec(0, 6)
			const b2 = new Vec(8, 0)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
			expect(result!.x).toBeCloseTo(4, 5)
			expect(result!.y).toBeCloseTo(3, 5)
		})

		it('should find intersection when one segment is vertical', () => {
			const a1 = new Vec(5, 0)
			const a2 = new Vec(5, 10)
			const b1 = new Vec(0, 5)
			const b2 = new Vec(10, 5)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
			expect(result!.x).toBeCloseTo(5, 5)
			expect(result!.y).toBeCloseTo(5, 5)
		})

		it('should find intersection when one segment is horizontal', () => {
			const a1 = new Vec(0, 5)
			const a2 = new Vec(10, 5)
			const b1 = new Vec(5, 0)
			const b2 = new Vec(5, 10)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
			expect(result!.x).toBeCloseTo(5, 5)
			expect(result!.y).toBeCloseTo(5, 5)
		})
	})

	describe('non-intersecting segments', () => {
		it('should return null when segments are parallel', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(10, 0)
			const b1 = new Vec(0, 5)
			const b2 = new Vec(10, 5)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull()
		})

		it('should return null when segments are parallel and vertical', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(0, 10)
			const b1 = new Vec(5, 0)
			const b2 = new Vec(5, 10)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull()
		})

		it('should return null when segments do not intersect', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(5, 5)
			const b1 = new Vec(10, 0)
			const b2 = new Vec(15, 5)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull()
		})

		it('should return null when segments are collinear but do not overlap', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(5, 0)
			const b1 = new Vec(10, 0)
			const b2 = new Vec(15, 0)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull()
		})
	})

	describe('coincident segments', () => {
		it('should return null when segments are identical', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(10, 0)
			const b1 = new Vec(0, 0)
			const b2 = new Vec(10, 0)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull()
		})

		it('should return null when segments overlap', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(10, 0)
			const b1 = new Vec(5, 0)
			const b2 = new Vec(15, 0)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull()
		})

		it('should return null when one segment is contained within another', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(10, 0)
			const b1 = new Vec(3, 0)
			const b2 = new Vec(7, 0)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull()
		})
	})

	describe('touching endpoints', () => {
		it('should return null when segments touch at endpoints (coincident case)', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(5, 5)
			const b1 = new Vec(5, 5)
			const b2 = new Vec(10, 0)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull() // coincident case
		})

		it('should return null when segments touch at one endpoint (coincident case)', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(5, 5)
			const b1 = new Vec(5, 5)
			const b2 = new Vec(10, 10)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull() // coincident case
		})

		it('should find intersection when segments cross near endpoints', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(5, 5)
			const b1 = new Vec(4.9, 5.1)
			const b2 = new Vec(5.1, 4.9)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
			expect(result!.x).toBeCloseTo(5, 1)
			expect(result!.y).toBeCloseTo(5, 1)
		})

		it('should find intersection when segments cross at endpoints (floating point error case)', () => {
			const result = intersectLineSegmentLineSegment(
				{ x: 100, y: 100 },
				{ x: 20, y: 20 },
				{ x: 36.141160159025375, y: 31.811740238538057 },
				{ x: 34.14213562373095, y: 34.14213562373095 }
			)

			expect(result).not.toBeNull()
		})
	})

	describe('edge cases', () => {
		it('should handle very small segments', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(0.0001, 0.0001)
			const b1 = new Vec(0, 0.0001)
			const b2 = new Vec(0.0001, 0)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
		})

		it('should handle segments with very large coordinates', () => {
			const a1 = new Vec(1e10, 1e10)
			const a2 = new Vec(1e11, 1e11)
			const b1 = new Vec(1e10, 1e11)
			const b2 = new Vec(1e11, 1e10)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
		})

		it('should return null for zero-length segments (parallel case)', () => {
			const a1 = new Vec(5, 5)
			const a2 = new Vec(5, 5)
			const b1 = new Vec(0, 0)
			const b2 = new Vec(10, 10)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull() // parallel case (zero-length segment)
		})

		it('should handle very short segments that still intersect', () => {
			const a1 = new Vec(5.05, 4.95)
			const a2 = new Vec(4.95, 5.05)
			const b1 = new Vec(0, 0)
			const b2 = new Vec(10, 10)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
			expect(result!.x).toBeCloseTo(5, 1)
			expect(result!.y).toBeCloseTo(5, 1)
		})

		it('should handle both segments being zero-length at same point', () => {
			const a1 = new Vec(5, 5)
			const a2 = new Vec(5, 5)
			const b1 = new Vec(5, 5)
			const b2 = new Vec(5, 5)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull() // coincident case
		})
	})

	describe('precision and floating point', () => {
		it('should handle floating point precision issues', () => {
			const a1 = new Vec(0.1, 0.1)
			const a2 = new Vec(0.2, 0.2)
			const b1 = new Vec(0.1, 0.2)
			const b2 = new Vec(0.2, 0.1)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
			expect(result!.x).toBeCloseTo(0.15, 5)
			expect(result!.y).toBeCloseTo(0.15, 5)
		})

		it('should handle segments that are very close but not intersecting', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(1, 0)
			const b1 = new Vec(0, 0.000001)
			const b2 = new Vec(1, 0.000001)

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).toBeNull() // parallel
		})
	})

	describe('VecLike interface compatibility', () => {
		it('should work with VecModel objects', () => {
			const a1 = { x: 0, y: 0 }
			const a2 = { x: 10, y: 10 }
			const b1 = { x: 0, y: 10 }
			const b2 = { x: 10, y: 0 }

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
			expect(result!.x).toBeCloseTo(5, 5)
			expect(result!.y).toBeCloseTo(5, 5)
		})

		it('should work with mixed Vec and VecModel objects', () => {
			const a1 = new Vec(0, 0)
			const a2 = { x: 10, y: 10 }
			const b1 = new Vec(0, 10)
			const b2 = { x: 10, y: 0 }

			const result = intersectLineSegmentLineSegment(a1, a2, b1, b2)

			expect(result).not.toBeNull()
			expect(result!.x).toBeCloseTo(5, 5)
			expect(result!.y).toBeCloseTo(5, 5)
		})
	})
})

describe('intersectLineSegmentCircle', () => {
	it('should return null when segment is completely outside the circle', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(1, 0)
		const c = new Vec(5, 0)
		const r = 1
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).toBeNull()
	})

	it('should return null when segment is tangent to the circle', () => {
		const a1 = new Vec(0, 1)
		const a2 = new Vec(2, 1)
		const c = new Vec(1, 0)
		const r = 1
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).toBeNull() // tangent returns null per implementation
	})

	it('should return two points when segment passes through the circle', () => {
		const a1 = new Vec(-2, 0)
		const a2 = new Vec(2, 0)
		const c = new Vec(0, 0)
		const r = 1
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(2)
		const sorted = result!.slice().sort((a, b) => a.x - b.x)
		expect(sorted[0].x).toBeCloseTo(-1, 5)
		expect(sorted[1].x).toBeCloseTo(1, 5)
		sorted.forEach((pt) => expect(Math.abs(pt.y)).toBeCloseTo(0, 5))
	})

	it('should return one point when segment starts inside and exits the circle', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(2, 0)
		const c = new Vec(0, 0)
		const r = 1
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(1)
		expect(result![0].x).toBeCloseTo(1, 5)
		expect(result![0].y).toBeCloseTo(0, 5)
	})

	it('should return one point when segment ends inside and enters the circle', () => {
		const a1 = new Vec(2, 0)
		const a2 = new Vec(0, 0)
		const c = new Vec(0, 0)
		const r = 1
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(1)
		expect(result![0].x).toBeCloseTo(1, 5)
		expect(result![0].y).toBeCloseTo(0, 5)
	})

	it('should return null when segment is entirely inside the circle', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(0.5, 0)
		const c = new Vec(0, 0)
		const r = 2
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).toBeNull()
	})

	it('should return one point when segment endpoint is exactly on the circle', () => {
		const a1 = new Vec(-1, 0)
		const a2 = new Vec(0, 0)
		const c = new Vec(0, 0)
		const r = 1
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(1)
		expect(result![0].x).toBeCloseTo(-1, 5)
		expect(result![0].y).toBeCloseTo(0, 5)
	})

	it('should return null for zero-length segment outside the circle', () => {
		const a1 = new Vec(2, 2)
		const a2 = new Vec(2, 2)
		const c = new Vec(0, 0)
		const r = 1
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).toBeNull()
	})

	it('should return null for zero-length segment inside the circle', () => {
		const a1 = new Vec(0.5, 0)
		const a2 = new Vec(0.5, 0)
		const c = new Vec(0, 0)
		const r = 1
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).toBeNull()
	})

	it('should return one point for zero-length segment on the circle', () => {
		const a1 = new Vec(1, 0)
		const a2 = new Vec(1, 0)
		const c = new Vec(0, 0)
		const r = 1
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).toBeNull() // tangent returns null per implementation
	})

	it('should handle floating point precision', () => {
		const a1 = new Vec(-1e-8, 1)
		const a2 = new Vec(1 + 1e-8, 1)
		const c = new Vec(0.5, 1)
		const r = 0.5
		const result = intersectLineSegmentCircle(a1, a2, c, r)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(2)
		const sorted = result!.slice().sort((a, b) => a.x - b.x)
		expect(sorted[0].x).toBeCloseTo(0, 5)
		expect(sorted[1].x).toBeCloseTo(1, 5)
	})
})

describe('intersectLineSegmentPolyline', () => {
	it('should return null when no intersection with polyline', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(1, 0)
		const points = [new Vec(5, 5), new Vec(6, 5), new Vec(6, 6), new Vec(5, 6)]
		const result = intersectLineSegmentPolyline(a1, a2, points)
		expect(result).toBeNull()
	})

	it('should return single intersection point', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(10, 10)
		const points = [new Vec(0, 10), new Vec(10, 0)]
		const result = intersectLineSegmentPolyline(a1, a2, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(1)
		expect(result![0].x).toBeCloseTo(5, 5)
		expect(result![0].y).toBeCloseTo(5, 5)
	})

	it('should return multiple intersection points', () => {
		const a1 = new Vec(0, 5)
		const a2 = new Vec(10, 5)
		const points = [new Vec(2, 0), new Vec(2, 10), new Vec(8, 10), new Vec(8, 0)]
		const result = intersectLineSegmentPolyline(a1, a2, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(2)
		// Should intersect at x=2 and x=8
		const sorted = result!.slice().sort((a, b) => a.x - b.x)
		expect(sorted[0].x).toBeCloseTo(2, 5)
		expect(sorted[1].x).toBeCloseTo(8, 5)
		sorted.forEach((pt) => expect(pt.y).toBeCloseTo(5, 5))
	})

	it('should return null for empty polyline', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(1, 1)
		const points: VecLike[] = []
		const result = intersectLineSegmentPolyline(a1, a2, points)
		expect(result).toBeNull()
	})

	it('should return null for single point polyline', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(1, 1)
		const points = [new Vec(5, 5)]
		const result = intersectLineSegmentPolyline(a1, a2, points)
		expect(result).toBeNull()
	})

	it('should handle polyline with duplicate points', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(10, 10)
		const points = [new Vec(0, 10), new Vec(5, 5), new Vec(5, 5), new Vec(10, 0)]
		const result = intersectLineSegmentPolyline(a1, a2, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(1)
		expect(result![0].x).toBeCloseTo(5, 5)
		expect(result![0].y).toBeCloseTo(5, 5)
	})

	it('should handle polyline with zero-length segments', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(10, 10)
		const points = [new Vec(0, 10), new Vec(5, 5), new Vec(5, 5), new Vec(10, 0)]
		const result = intersectLineSegmentPolyline(a1, a2, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(1)
		expect(result![0].x).toBeCloseTo(5, 5)
		expect(result![0].y).toBeCloseTo(5, 5)
	})

	it('should handle polyline that touches segment endpoint', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(5, 5)
		const points = [new Vec(5, 5), new Vec(10, 0)]
		const result = intersectLineSegmentPolyline(a1, a2, points)
		expect(result).toBeNull() // coincident case
	})

	it('should handle complex polyline with multiple intersections', () => {
		const a1 = new Vec(0, 5)
		const a2 = new Vec(20, 5)
		const points = [
			new Vec(2, 0),
			new Vec(2, 10),
			new Vec(8, 10),
			new Vec(8, 0),
			new Vec(12, 0),
			new Vec(12, 10),
			new Vec(18, 10),
			new Vec(18, 0),
		]
		const result = intersectLineSegmentPolyline(a1, a2, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(4)
		// Should intersect at x=2, x=8, x=12, x=18
		const sorted = result!.slice().sort((a, b) => a.x - b.x)
		expect(sorted[0].x).toBeCloseTo(2, 5)
		expect(sorted[1].x).toBeCloseTo(8, 5)
		expect(sorted[2].x).toBeCloseTo(12, 5)
		expect(sorted[3].x).toBeCloseTo(18, 5)
		sorted.forEach((pt) => expect(pt.y).toBeCloseTo(5, 5))
	})

	// Test cases for vertex intersection issues
	describe('vertex intersection edge cases', () => {
		it('should detect intersection when line segment passes through polyline vertex', () => {
			const a1 = new Vec(0, 5)
			const a2 = new Vec(10, 5)
			const points = [new Vec(5, 0), new Vec(5, 10)] // vertical line at x=5
			const result = intersectLineSegmentPolyline(a1, a2, points)
			expect(result).not.toBeNull()
			expect(result!.length).toBe(1)
			expect(result![0].x).toBeCloseTo(5, 5)
			expect(result![0].y).toBeCloseTo(5, 5)
		})

		it('should detect intersection when line segment passes through polyline vertex at angle', () => {
			const a1 = new Vec(0, 0)
			const a2 = new Vec(10, 10)
			const points = [new Vec(5, 0), new Vec(5, 10)] // vertical line at x=5
			const result = intersectLineSegmentPolyline(a1, a2, points)
			expect(result).not.toBeNull()
			expect(result!.length).toBe(1)
			expect(result![0].x).toBeCloseTo(5, 5)
			expect(result![0].y).toBeCloseTo(5, 5)
		})

		it('should detect intersection when line segment passes through polyline vertex at middle', () => {
			const a1 = new Vec(0, 5)
			const a2 = new Vec(10, 5)
			const points = [new Vec(0, 0), new Vec(5, 5), new Vec(10, 0)] // vertex at (5,5)
			const result = intersectLineSegmentPolyline(a1, a2, points)
			expect(result).not.toBeNull()
			expect(result!.length).toBe(1)
			expect(result![0].x).toBeCloseTo(5, 5)
			expect(result![0].y).toBeCloseTo(5, 5)
		})

		it('should detect intersection when line segment passes through a polyline vertext (floating point error case)', () => {
			const result = intersectLineSegmentPolyline({ x: 100, y: 100 }, { x: 20, y: 20 }, [
				{ x: 36.141160159025375, y: 31.811740238538057 },
				{ x: 34.14213562373095, y: 34.14213562373095 },
				{ x: 31.811740238538057, y: 36.141160159025375 },
			])

			expect(result).not.toBeNull()
		})
	})
})

describe('intersectLineSegmentPolygon', () => {
	it('should return null when no intersection with polygon', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(1, 0)
		const points = [new Vec(5, 5), new Vec(6, 5), new Vec(6, 6), new Vec(5, 6)]
		const result = intersectLineSegmentPolygon(a1, a2, points)
		expect(result).toBeNull()
	})

	it('should return multiple intersection points', () => {
		const a1 = new Vec(0, 5)
		const a2 = new Vec(10, 5)
		const points = [new Vec(2, 0), new Vec(2, 10), new Vec(8, 10), new Vec(8, 0)]
		const result = intersectLineSegmentPolygon(a1, a2, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(2)
		const sorted = result!.slice().sort((a, b) => a.x - b.x)
		expect(sorted[0].x).toBeCloseTo(2, 5)
		expect(sorted[1].x).toBeCloseTo(8, 5)
		sorted.forEach((pt) => expect(pt.y).toBeCloseTo(5, 5))
	})

	it('should return null when segment is entirely inside the polygon', () => {
		const a1 = new Vec(3, 3)
		const a2 = new Vec(4, 4)
		const points = [new Vec(2, 2), new Vec(6, 2), new Vec(6, 6), new Vec(2, 6)]
		const result = intersectLineSegmentPolygon(a1, a2, points)
		expect(result).toBeNull()
	})

	it('should return null when segment is entirely outside the polygon', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(1, 1)
		const points = [new Vec(2, 2), new Vec(6, 2), new Vec(6, 6), new Vec(2, 6)]
		const result = intersectLineSegmentPolygon(a1, a2, points)
		expect(result).toBeNull()
	})

	it('should return intersection points when segment crosses polygon boundary', () => {
		const a1 = new Vec(0, 5)
		const a2 = new Vec(10, 5)
		const points = [new Vec(2, 0), new Vec(2, 10), new Vec(8, 10), new Vec(8, 0)]
		const result = intersectLineSegmentPolygon(a1, a2, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(2)
	})

	it('should return null for empty polygon', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(1, 1)
		const points: VecLike[] = []
		const result = intersectLineSegmentPolygon(a1, a2, points)
		expect(result).toBeNull()
	})

	it('should return null for single point polygon', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(1, 1)
		const points = [new Vec(5, 5)]
		const result = intersectLineSegmentPolygon(a1, a2, points)
		expect(result).toBeNull()
	})

	it('should return single intersection at exit corner', () => {
		const a1 = new Vec(0, 0)
		const a2 = new Vec(10, 10)
		const points = [new Vec(0, 10), new Vec(10, 10), new Vec(10, 0), new Vec(0, 0)]
		const result = intersectLineSegmentPolygon(a1, a2, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(1)
		expect(result![0].x).toBeCloseTo(10, 5)
		expect(result![0].y).toBeCloseTo(10, 5)
	})
})

describe('intersectCircleCircle', () => {
	it('should return two points when circles intersect', () => {
		const c1 = new Vec(0, 0)
		const r1 = 5
		const c2 = new Vec(8, 0)
		const r2 = 5
		const result = intersectCircleCircle(c1, r1, c2, r2)
		expect(result).not.toBeNull()
		expect(result.length).toBe(2)
		// Both points should be at x=4, y=+/-3
		const sorted = result.slice().sort((a, b) => a.y - b.y)
		expect(sorted[0].x).toBeCloseTo(4, 5)
		expect(sorted[0].y).toBeCloseTo(-3, 5)
		expect(sorted[1].x).toBeCloseTo(4, 5)
		expect(sorted[1].y).toBeCloseTo(3, 5)
	})

	it('should return two identical points when circles are tangent', () => {
		const c1 = new Vec(0, 0)
		const r1 = 5
		const c2 = new Vec(10, 0)
		const r2 = 5
		const result = intersectCircleCircle(c1, r1, c2, r2)
		expect(result).not.toBeNull()
		expect(result.length).toBe(2)
		// Both points should be at (5, 0)
		expect(result[0].x).toBeCloseTo(5, 5)
		expect(result[0].y).toBeCloseTo(0, 5)
		expect(result[1].x).toBeCloseTo(5, 5)
		expect(result[1].y).toBeCloseTo(0, 5)
	})

	it('should return two points when circles intersect at an angle', () => {
		const c1 = new Vec(0, 0)
		const r1 = 5
		const c2 = new Vec(5, 5)
		const r2 = 5
		const result = intersectCircleCircle(c1, r1, c2, r2)
		expect(result).not.toBeNull()
		expect(result.length).toBe(2)
	})

	it('should return NaN points for concentric circles', () => {
		const c1 = new Vec(0, 0)
		const r1 = 5
		const c2 = new Vec(0, 0)
		const r2 = 3
		const result = intersectCircleCircle(c1, r1, c2, r2)
		expect(result).not.toBeNull()
		result.forEach((pt) => {
			expect(Number.isNaN(pt.x)).toBe(true)
			expect(Number.isNaN(pt.y)).toBe(true)
		})
	})

	it('should return two points for identical circles', () => {
		const c1 = new Vec(0, 0)
		const r1 = 5
		const c2 = new Vec(0, 0)
		const r2 = 5
		const result = intersectCircleCircle(c1, r1, c2, r2)
		expect(result).not.toBeNull()
		result.forEach((pt) => {
			expect(Number.isNaN(pt.x)).toBe(true)
			expect(Number.isNaN(pt.y)).toBe(true)
		})
	})

	it('should return two NaN points when one circle is inside another', () => {
		const c1 = new Vec(0, 0)
		const r1 = 5
		const c2 = new Vec(1, 0)
		const r2 = 1
		const result = intersectCircleCircle(c1, r1, c2, r2)
		expect(result).not.toBeNull()
		result.forEach((pt) => {
			expect(Number.isNaN(pt.x)).toBe(true)
			expect(Number.isNaN(pt.y)).toBe(true)
		})
	})

	it('should return two NaN points when circles are too far apart', () => {
		const c1 = new Vec(0, 0)
		const r1 = 5
		const c2 = new Vec(20, 0)
		const r2 = 5
		const result = intersectCircleCircle(c1, r1, c2, r2)
		expect(result).not.toBeNull()
		result.forEach((pt) => {
			expect(Number.isNaN(pt.x)).toBe(true)
			expect(Number.isNaN(pt.y)).toBe(true)
		})
	})
})

describe('intersectCirclePolygon', () => {
	it('should return null when circle does not intersect polygon', () => {
		const c = new Vec(0, 0)
		const r = 1
		const points = [new Vec(5, 5), new Vec(6, 5), new Vec(6, 6), new Vec(5, 6)]
		const result = intersectCirclePolygon(c, r, points)
		expect(result).toBeNull()
	})

	it('should return single intersection point (tangent)', () => {
		const c = new Vec(0, 0)
		const r = 5
		const points = [new Vec(5, 0), new Vec(10, 0), new Vec(10, 10), new Vec(5, 10)]
		const result = intersectCirclePolygon(c, r, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(1)
		expect(result![0].x).toBeCloseTo(5, 5)
		expect(result![0].y).toBeCloseTo(0, 5)
	})

	it('should return null when circle is entirely inside polygon', () => {
		const c = new Vec(5, 5)
		const r = 1
		const points = [new Vec(2, 2), new Vec(8, 2), new Vec(8, 8), new Vec(2, 8)]
		const result = intersectCirclePolygon(c, r, points)
		expect(result).toBeNull()
	})

	it('should return null when circle is entirely outside polygon', () => {
		const c = new Vec(0, 0)
		const r = 1
		const points = [new Vec(5, 5), new Vec(8, 5), new Vec(8, 8), new Vec(5, 8)]
		const result = intersectCirclePolygon(c, r, points)
		expect(result).toBeNull()
	})

	it('should return null for empty polygon', () => {
		const c = new Vec(0, 0)
		const r = 1
		const points: VecLike[] = []
		const result = intersectCirclePolygon(c, r, points)
		expect(result).toBeNull()
	})

	it('should return null for complex polygon when circle is inside', () => {
		const c = new Vec(5, 5)
		const r = 3
		const points = [new Vec(2, 2), new Vec(8, 2), new Vec(8, 8), new Vec(2, 8)]
		const result = intersectCirclePolygon(c, r, points)
		expect(result).toBeNull()
	})
})

describe('intersectCirclePolyline', () => {
	it('should return null when circle does not intersect polyline', () => {
		const c = new Vec(0, 0)
		const r = 1
		const points = [new Vec(5, 5), new Vec(6, 5), new Vec(6, 6), new Vec(5, 6)]
		const result = intersectCirclePolyline(c, r, points)
		expect(result).toBeNull()
	})

	it('should return single intersection point (tangent)', () => {
		const c = new Vec(0, 0)
		const r = 5
		const points = [new Vec(5, 0), new Vec(10, 0)]
		const result = intersectCirclePolyline(c, r, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(1)
		expect(result![0].x).toBeCloseTo(5, 5)
		expect(result![0].y).toBeCloseTo(0, 5)
	})

	it('should return two intersection points', () => {
		const c = new Vec(0, 0)
		const r = 5
		const points = [new Vec(-10, 0), new Vec(10, 0)]
		const result = intersectCirclePolyline(c, r, points)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(2)
		const sorted = result!.slice().sort((a, b) => a.x - b.x)
		expect(sorted[0].x).toBeCloseTo(-5, 5)
		expect(sorted[1].x).toBeCloseTo(5, 5)
		sorted.forEach((pt) => expect(pt.y).toBeCloseTo(0, 5))
	})

	it('should return null for empty polyline', () => {
		const c = new Vec(0, 0)
		const r = 1
		const points: VecLike[] = []
		const result = intersectCirclePolyline(c, r, points)
		expect(result).toBeNull()
	})

	it('should return null for single point polyline', () => {
		const c = new Vec(0, 0)
		const r = 1
		const points = [new Vec(5, 5)]
		const result = intersectCirclePolyline(c, r, points)
		expect(result).toBeNull()
	})

	it('should return null when circle is entirely inside polyline area', () => {
		const c = new Vec(5, 5)
		const r = 1
		const points = [new Vec(2, 2), new Vec(8, 2), new Vec(8, 8), new Vec(2, 8)]
		const result = intersectCirclePolyline(c, r, points)
		expect(result).toBeNull()
	})

	it('should return null when circle is entirely outside polyline area', () => {
		const c = new Vec(0, 0)
		const r = 1
		const points = [new Vec(5, 5), new Vec(8, 5), new Vec(8, 8), new Vec(5, 8)]
		const result = intersectCirclePolyline(c, r, points)
		expect(result).toBeNull()
	})
})

describe('intersectPolygonPolygon', () => {
	it('should return null for disjoint polygons', () => {
		const polyA = [new Vec(0, 0), new Vec(2, 0), new Vec(2, 2), new Vec(0, 2)]
		const polyB = [new Vec(5, 5), new Vec(7, 5), new Vec(7, 7), new Vec(5, 7)]
		const result = intersectPolygonPolygon(polyA, polyB)
		expect(result).toBeNull()
	})

	it('should return intersection polygon for overlapping squares', () => {
		const polyA = [new Vec(0, 0), new Vec(4, 0), new Vec(4, 4), new Vec(0, 4)]
		const polyB = [new Vec(2, 2), new Vec(6, 2), new Vec(6, 6), new Vec(2, 6)]
		const result = intersectPolygonPolygon(polyA, polyB)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(4)
		// Should be the square from (2,2) to (4,4)
		const xs = result!.map((pt) => pt.x).sort((a, b) => a - b)
		const ys = result!.map((pt) => pt.y).sort((a, b) => a - b)
		expect(xs[0]).toBeCloseTo(2, 5)
		expect(xs[3]).toBeCloseTo(4, 5)
		expect(ys[0]).toBeCloseTo(2, 5)
		expect(ys[3]).toBeCloseTo(4, 5)
	})

	it('should return contained polygon when one is inside another', () => {
		const polyA = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
		const polyB = [new Vec(2, 2), new Vec(8, 2), new Vec(8, 8), new Vec(2, 8)]
		const result = intersectPolygonPolygon(polyA, polyB)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(4)
		const xs = result!.map((pt) => pt.x).sort((a, b) => a - b)
		const ys = result!.map((pt) => pt.y).sort((a, b) => a - b)
		expect(xs[0]).toBeCloseTo(2, 5)
		expect(xs[3]).toBeCloseTo(8, 5)
		expect(ys[0]).toBeCloseTo(2, 5)
		expect(ys[3]).toBeCloseTo(8, 5)
	})

	it('should return single point when polygons touch at a point', () => {
		const polyA = [new Vec(0, 0), new Vec(2, 0), new Vec(2, 2), new Vec(0, 2)]
		const polyB = [new Vec(2, 2), new Vec(4, 2), new Vec(4, 4), new Vec(2, 4)]
		const result = intersectPolygonPolygon(polyA, polyB)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(1)
		expect(result![0].x).toBeCloseTo(2, 5)
		expect(result![0].y).toBeCloseTo(2, 5)
	})

	it('should return shared edge when polygons share an edge', () => {
		const polyA = [new Vec(0, 0), new Vec(2, 0), new Vec(2, 2), new Vec(0, 2)]
		const polyB = [new Vec(2, 0), new Vec(4, 0), new Vec(4, 2), new Vec(2, 2)]
		const result = intersectPolygonPolygon(polyA, polyB)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(2)
		const xs = result!.map((pt) => pt.x).sort((a, b) => a - b)
		const ys = result!.map((pt) => pt.y).sort((a, b) => a - b)
		expect(xs[0]).toBeCloseTo(2, 5)
		expect(xs[1]).toBeCloseTo(2, 5)
		expect(ys[0]).toBeCloseTo(0, 5)
		expect(ys[1]).toBeCloseTo(2, 5)
	})

	it('should return all points for identical polygons', () => {
		const polyA = [new Vec(0, 0), new Vec(2, 0), new Vec(2, 2), new Vec(0, 2)]
		const polyB = [new Vec(0, 0), new Vec(2, 0), new Vec(2, 2), new Vec(0, 2)]
		const result = intersectPolygonPolygon(polyA, polyB)
		expect(result).not.toBeNull()
		expect(result!.length).toBe(4)
	})

	it('should return null for degenerate polygons (single point)', () => {
		const polyA = [new Vec(0, 0)]
		const polyB = [new Vec(1, 1), new Vec(2, 2), new Vec(3, 3)]
		const result = intersectPolygonPolygon(polyA, polyB)
		expect(result).toBeNull()
	})
})
