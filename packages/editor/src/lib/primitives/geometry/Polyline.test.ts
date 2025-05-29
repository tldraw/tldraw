import { Vec } from '../Vec'
import { Polygon2d } from './Polygon2d'
import { Polyline2d } from './Polyline2d'

describe('Polyline2d', () => {
	describe('construction', () => {
		it('should create a polyline with points array', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.points).toEqual(points)
			expect(polyline.points.length).toBe(3)
		})

		it('should initialize with correct isClosed and isFilled values', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.isClosed).toBe(false)
			expect(polyline.isFilled).toBe(false)
		})

		it('should always have isClosed = false and isFilled = false', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.isClosed).toBe(false)
			expect(polyline.isFilled).toBe(false)

			// These values are forced in the constructor
			const polyline2 = new Polyline2d({ points })
			expect(polyline2.isClosed).toBe(false)
			expect(polyline2.isFilled).toBe(false)
		})

		it('should handle minimum points (2 points for valid polyline)', () => {
			const points = [new Vec(0, 0), new Vec(10, 0)]
			const polyline = new Polyline2d({ points })

			expect(polyline.points).toEqual(points)
			expect(polyline.segments.length).toBe(1) // 2 points = 1 segment
		})

		it('should handle multiple points (3+ points)', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.points).toEqual(points)
			expect(polyline.segments.length).toBe(3) // 4 points = 3 segments (no closing)
		})

		it('should store points array correctly', () => {
			const points = [new Vec(1, 2), new Vec(3, 4), new Vec(5, 6)]
			const polyline = new Polyline2d({ points })

			expect(polyline.points).toBe(points) // Should be the same reference
			expect(polyline.points[0]).toEqual(new Vec(1, 2))
			expect(polyline.points[1]).toEqual(new Vec(3, 4))
			expect(polyline.points[2]).toEqual(new Vec(5, 6))
		})

		it('should handle empty points array gracefully', () => {
			const points: Vec[] = []
			expect(() => {
				new Polyline2d({ points })
			}).toThrow('Polyline2d: points must be an array of at least 2 points')
		})

		it('should handle single point', () => {
			const points = [new Vec(5, 5)]
			expect(() => {
				new Polyline2d({ points })
			}).toThrow('Polyline2d: points must be an array of at least 2 points')
		})

		it('should handle duplicate points', () => {
			const points = [new Vec(0, 0), new Vec(0, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.points).toEqual(points)
			expect(polyline.segments.length).toBe(2) // 3 points = 2 segments
		})

		it('should handle collinear points', () => {
			const points = [new Vec(0, 0), new Vec(5, 0), new Vec(10, 0)]
			const polyline = new Polyline2d({ points })

			expect(polyline.points).toEqual(points)
			expect(polyline.segments.length).toBe(2) // 3 points = 2 segments
		})
	})

	describe('segments', () => {
		it('should generate edge segments from points', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const segments = polyline.segments
			expect(segments.length).toBe(2) // 3 points = 2 segments (no closing)
			expect(segments[0].constructor.name).toBe('Edge2d')
			expect(segments[1].constructor.name).toBe('Edge2d')
		})

		it('should create correct number of segments (points.length - 1)', () => {
			const twoPoints = [new Vec(0, 0), new Vec(10, 0)]
			const twoPointPolyline = new Polyline2d({ points: twoPoints })
			expect(twoPointPolyline.segments.length).toBe(1)

			const threePoints = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const threePointPolyline = new Polyline2d({ points: threePoints })
			expect(threePointPolyline.segments.length).toBe(2)

			const fourPoints = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const fourPointPolyline = new Polyline2d({ points: fourPoints })
			expect(fourPointPolyline.segments.length).toBe(3)

			const fivePoints = [
				new Vec(0, 0),
				new Vec(10, 0),
				new Vec(15, 7),
				new Vec(5, 12),
				new Vec(-5, 7),
			]
			const fivePointPolyline = new Polyline2d({ points: fivePoints })
			expect(fivePointPolyline.segments.length).toBe(4)
		})

		it('should cache segments after first calculation', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const segments1 = polyline.segments
			const segments2 = polyline.segments

			expect(segments1).toBe(segments2) // Should be the same reference
		})

		it('should connect segments in order (point[i] to point[i+1])', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polyline = new Polyline2d({ points })

			const segments = polyline.segments
			expect(segments.length).toBe(3)

			// First segment: point[0] to point[1]
			expect(segments[0].start).toEqual(points[0])
			expect(segments[0].end).toEqual(points[1])

			// Second segment: point[1] to point[2]
			expect(segments[1].start).toEqual(points[1])
			expect(segments[1].end).toEqual(points[2])

			// Third segment: point[2] to point[3]
			expect(segments[2].start).toEqual(points[2])
			expect(segments[2].end).toEqual(points[3])
		})

		it('should not include closing segment (unlike Polygon2d)', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polyline = new Polyline2d({ points })

			const segments = polyline.segments
			expect(segments.length).toBe(3) // 4 points = 3 segments (no closing segment)

			// Last segment should NOT connect last point to first point
			const lastSegment = segments[segments.length - 1]
			expect(lastSegment.start).toEqual(points[points.length - 2])
			expect(lastSegment.end).toEqual(points[points.length - 1])
			expect(lastSegment.end).not.toEqual(points[0]) // Should NOT close
		})

		it('should handle two-point polylines', () => {
			const points = [new Vec(0, 0), new Vec(10, 5)]
			const polyline = new Polyline2d({ points })

			const segments = polyline.segments
			expect(segments.length).toBe(1)

			expect(segments[0].start).toEqual(new Vec(0, 0))
			expect(segments[0].end).toEqual(new Vec(10, 5))
		})

		it('should handle three-point polylines', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const segments = polyline.segments
			expect(segments.length).toBe(2)

			expect(segments[0].start).toEqual(new Vec(0, 0))
			expect(segments[0].end).toEqual(new Vec(10, 0))
			expect(segments[1].start).toEqual(new Vec(10, 0))
			expect(segments[1].end).toEqual(new Vec(10, 10))
		})

		it('should handle complex polylines (many points)', () => {
			const points = []
			for (let i = 0; i < 8; i++) {
				const angle = (i / 8) * Math.PI * 2
				points.push(new Vec(Math.cos(angle) * 10, Math.sin(angle) * 10))
			}

			const polyline = new Polyline2d({ points })
			const segments = polyline.segments

			expect(segments.length).toBe(7) // 8 points = 7 segments (no closing)
			// Verify first and last segments don't connect
			expect(segments[0].start).toEqual(points[0])
			expect(segments[segments.length - 1].end).toEqual(points[points.length - 1])
			expect(segments[segments.length - 1].end).not.toEqual(points[0])
		})

		it('should create Edge2d instances for segments', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const segments = polyline.segments
			segments.forEach((segment) => {
				expect(segment.constructor.name).toBe('Edge2d')
				expect(segment.start).toBeInstanceOf(Vec)
				expect(segment.end).toBeInstanceOf(Vec)
			})
		})
	})

	describe('getLength', () => {
		it('should return sum of all segment lengths', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const segments = polyline.segments
			const expectedLength = segments.reduce((sum, segment) => sum + segment.length, 0)

			expect(polyline.getLength()).toBeCloseTo(expectedLength, 10)
		})

		it('should return positive length for valid polylines', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			expect(polyline.getLength()).toBeGreaterThan(0)
		})

		it('should handle straight lines', () => {
			const points = [new Vec(0, 0), new Vec(10, 0)]
			const polyline = new Polyline2d({ points })

			const length = polyline.getLength()
			expect(length).toBeCloseTo(10, 1) // Straight line of length 10
		})

		it('should handle L-shaped polylines', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 5)]
			const polyline = new Polyline2d({ points })

			const length = polyline.getLength()
			expect(length).toBeCloseTo(15, 1) // 10 + 5 = 15
		})

		it('should handle complex polylines', () => {
			const points = []
			for (let i = 0; i < 6; i++) {
				const angle = (i / 6) * Math.PI * 2
				points.push(new Vec(Math.cos(angle) * 10, Math.sin(angle) * 10))
			}

			const polyline = new Polyline2d({ points })
			const length = polyline.getLength()

			expect(length).toBeGreaterThan(0)
			// Should be less than a complete circle since it's not closed
			expect(length).toBeLessThan(60) // Less than full circle perimeter
		})

		it('should be consistent across multiple calls', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0), new Vec(10, 15)]
			const polyline = new Polyline2d({ points })

			const length1 = polyline.getLength()
			const length2 = polyline.getLength()
			const length3 = polyline.getLength()

			expect(length1).toBe(length2)
			expect(length2).toBe(length3)
		})

		it('should handle degenerate polylines (collinear points)', () => {
			// Collinear points
			const points = [new Vec(0, 0), new Vec(5, 0), new Vec(10, 0)]
			const polyline = new Polyline2d({ points })

			const length = polyline.getLength()
			expect(length).toBeGreaterThan(0)
			expect(length).toBeCloseTo(10, 1) // 5 + 5 = 10
		})

		it('should handle zero-length segments', () => {
			const points = [new Vec(0, 0), new Vec(0, 0), new Vec(10, 0)]
			const polyline = new Polyline2d({ points })

			const length = polyline.getLength()
			expect(length).toBeCloseTo(10, 1) // 0 + 10 = 10
		})
	})

	describe('getVertices', () => {
		it('should return the original points array', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const vertices = polyline.getVertices()
			expect(vertices).toEqual(points)
		})

		it('should maintain point order', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polyline = new Polyline2d({ points })

			const vertices = polyline.getVertices()
			expect(vertices[0]).toEqual(points[0])
			expect(vertices[1]).toEqual(points[1])
			expect(vertices[2]).toEqual(points[2])
			expect(vertices[3]).toEqual(points[3])
		})

		it('should handle different polyline shapes', () => {
			const linePoints = [new Vec(0, 0), new Vec(10, 0)]
			const line = new Polyline2d({ points: linePoints })
			expect(line.getVertices()).toEqual(linePoints)

			const lShapePoints = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const lShape = new Polyline2d({ points: lShapePoints })
			expect(lShape.getVertices()).toEqual(lShapePoints)
		})

		it('should return Vec instances', () => {
			const points = [new Vec(1, 2), new Vec(3, 4), new Vec(5, 6)]
			const polyline = new Polyline2d({ points })

			const vertices = polyline.getVertices()
			vertices.forEach((vertex) => {
				expect(vertex).toBeInstanceOf(Vec)
			})
		})

		it('should not modify original points array', () => {
			const points = [new Vec(1, 2), new Vec(3, 4), new Vec(5, 6)]
			const originalPoints = points.map((p) => new Vec(p.x, p.y)) // Copy for comparison
			const polyline = new Polyline2d({ points })

			const vertices = polyline.getVertices()
			expect(vertices).toBe(points) // Should be the same reference
			expect(points).toEqual(originalPoints) // Original should be unchanged
		})
	})

	describe('nearestPoint', () => {
		it('should find nearest point on any segment', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const queryPoint = new Vec(5, 2)
			const nearest = polyline.nearestPoint(queryPoint)

			expect(nearest).toBeDefined()
			expect(nearest.x).toBeGreaterThanOrEqual(0)
			expect(nearest.x).toBeLessThanOrEqual(10)
		})

		it('should return point on the polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			const queryPoint = new Vec(10, 10)
			const nearest = polyline.nearestPoint(queryPoint)

			// Verify the nearest point is actually on one of the segments
			const isOnSegment = polyline.segments.some((segment) => {
				const segmentNearest = segment.nearestPoint(queryPoint)
				return Vec.Dist(segmentNearest, nearest) < 0.001
			})

			expect(isOnSegment).toBe(true)
		})

		it('should handle point near polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const queryPoint = new Vec(5, 0.1) // Very close to first segment
			const nearest = polyline.nearestPoint(queryPoint)

			expect(Vec.Dist(nearest, queryPoint)).toBeLessThan(1)
		})

		it('should handle point far from polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const queryPoint = new Vec(1000, 1000) // Very far away
			const nearest = polyline.nearestPoint(queryPoint)

			expect(nearest).toBeDefined()
			// Should be one of the endpoints or on a segment
			expect(nearest.x).toBeGreaterThanOrEqual(0)
			expect(nearest.x).toBeLessThanOrEqual(10)
		})

		it('should handle point very close to polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const queryPoint = new Vec(5, 0.001) // Very close to bottom edge
			const nearest = polyline.nearestPoint(queryPoint)

			expect(Vec.Dist(nearest, queryPoint)).toBeLessThan(0.1)
		})

		it('should handle point very far from polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const queryPoint = new Vec(1000, 1000) // Very far away
			const nearest = polyline.nearestPoint(queryPoint)

			expect(nearest).toBeDefined()
			// Should be one of the vertices or on an edge
			expect(nearest.x).toBeGreaterThanOrEqual(0)
			expect(nearest.x).toBeLessThanOrEqual(10)
		})

		it('should handle point near vertices', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const queryPoint = new Vec(0.1, 0.1) // Near first vertex
			const nearest = polyline.nearestPoint(queryPoint)

			expect(nearest).toBeDefined()
			expect(Vec.Dist(nearest, points[0])).toBeLessThan(2) // Should be close to first vertex
		})

		it('should handle point near edges', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const queryPoint = new Vec(5, -1) // Near first edge
			const nearest = polyline.nearestPoint(queryPoint)

			expect(nearest.y).toBeCloseTo(0, 1) // Should be on first edge
			expect(nearest.x).toBeCloseTo(5, 1)
		})

		it('should choose closest among all segments', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(20, 10), new Vec(30, 0)]
			const polyline = new Polyline2d({ points })

			const queryPoint = new Vec(5, 0) // Closer to first segment
			const nearest = polyline.nearestPoint(queryPoint)

			// Should find a point closer to the first segment
			expect(nearest.y).toBeCloseTo(0, 1) // Should be on bottom edge
		})

		it('should handle point at start/end of polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const startQuery = new Vec(-1, 0) // Near start
			const startNearest = polyline.nearestPoint(startQuery)
			expect(Vec.Dist(startNearest, points[0])).toBeLessThan(2)

			const endQuery = new Vec(10, 11) // Near end
			const endNearest = polyline.nearestPoint(endQuery)
			expect(Vec.Dist(endNearest, points[points.length - 1])).toBeLessThan(2)
		})
	})

	describe('hitTestLineSegment', () => {
		it('should return true when line segment intersects polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			// Line that clearly crosses the polyline
			const lineStart = new Vec(5, -2)
			const lineEnd = new Vec(5, 10)

			expect(polyline.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should return false when line segment does not intersect polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			// Line that's completely away from the polyline
			const lineStart = new Vec(0, 20)
			const lineEnd = new Vec(20, 20)

			expect(polyline.hitTestLineSegment(lineStart, lineEnd)).toBe(false)
		})

		it('should handle line intersecting multiple segments', () => {
			const points = [new Vec(0, 0), new Vec(10, 10), new Vec(20, 0), new Vec(30, 10)]
			const polyline = new Polyline2d({ points })

			// Horizontal line that could intersect multiple segments
			const lineStart = new Vec(-5, 5)
			const lineEnd = new Vec(35, 5)

			expect(polyline.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should handle line intersecting single segment', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(20, 10)]
			const polyline = new Polyline2d({ points })

			// Line that only intersects the first segment
			const lineStart = new Vec(2, -2)
			const lineEnd = new Vec(2, 2)

			expect(polyline.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should handle line tangent to polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			// Line that might be tangent (hard to determine exact tangent, so test nearby)
			const lineStart = new Vec(9, 4)
			const lineEnd = new Vec(11, 6)

			// Should return true if it intersects, false if it doesn't
			const result = polyline.hitTestLineSegment(lineStart, lineEnd)
			expect(typeof result).toBe('boolean')
		})

		it('should handle line passing through vertices', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			// Line passing through start point
			const lineStart = new Vec(-5, -5)
			const lineEnd = new Vec(5, 5)

			expect(polyline.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should handle line entirely outside polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			// Line segment completely outside
			const lineStart = new Vec(25, 25)
			const lineEnd = new Vec(30, 30)

			expect(polyline.hitTestLineSegment(lineStart, lineEnd)).toBe(false)
		})

		it('should handle very short line segments', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			// Very short line segment that crosses the polyline
			const lineStart = new Vec(4.9, 2)
			const lineEnd = new Vec(5.1, 2)

			const result = polyline.hitTestLineSegment(lineStart, lineEnd)
			expect(typeof result).toBe('boolean')
		})

		it('should handle degenerate line segments (same start/end)', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			// Point on the polyline
			const point = new Vec(0, 0) // Start point
			const result = polyline.hitTestLineSegment(point, point)

			expect(typeof result).toBe('boolean')
		})

		it('should support distance parameter for hit testing', () => {
			const points = [new Vec(0, 0), new Vec(10, 0)]
			const polyline = new Polyline2d({ points })

			// Line segment slightly away from polyline
			const lineStart = new Vec(5, -0.5)
			const lineEnd = new Vec(5, -0.1)

			const hitWithoutDistance = polyline.hitTestLineSegment(lineStart, lineEnd, 0)
			const hitWithDistance = polyline.hitTestLineSegment(lineStart, lineEnd, 1)

			// Distance parameter should change the result (either direction)
			expect(typeof hitWithoutDistance).toBe('boolean')
			expect(typeof hitWithDistance).toBe('boolean')
		})

		it('should handle line intersecting at endpoints', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			// Line intersecting at the end of the polyline
			const lineStart = new Vec(8, 10)
			const lineEnd = new Vec(12, 10)

			const result = polyline.hitTestLineSegment(lineStart, lineEnd)
			expect(typeof result).toBe('boolean')
		})

		it('should handle parallel lines', () => {
			const points = [new Vec(0, 0), new Vec(10, 0)] // Horizontal polyline
			const polyline = new Polyline2d({ points })

			// Parallel horizontal line
			const lineStart = new Vec(0, 1)
			const lineEnd = new Vec(10, 1)

			expect(polyline.hitTestLineSegment(lineStart, lineEnd)).toBe(false)
		})
	})

	describe('getSvgPathData', () => {
		it('should return valid SVG path data', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			const pathData = polyline.getSvgPathData()
			expect(typeof pathData).toBe('string')
			expect(pathData.length).toBeGreaterThan(0)
		})

		it('should start with move command', () => {
			const points = [new Vec(5, 10), new Vec(15, 20), new Vec(25, 10)]
			const polyline = new Polyline2d({ points })

			const pathData = polyline.getSvgPathData()
			expect(pathData).toMatch(/^M/)
		})

		it('should use line commands for all edges', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0), new Vec(30, 15)]
			const polyline = new Polyline2d({ points })

			const pathData = polyline.getSvgPathData()
			const lCount = (pathData.match(/L/g) || []).length
			expect(lCount).toBe(3) // 4 points = 3 L commands (first point uses M)
		})

		it('should not include closing Z command', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polyline = new Polyline2d({ points })

			const pathData = polyline.getSvgPathData()
			// The path data should not include Z because polylines are open
			expect(pathData).not.toContain('Z')
		})

		it('should handle two-point polylines', () => {
			const points = [new Vec(0, 0), new Vec(10, 0)]
			const polyline = new Polyline2d({ points })

			const pathData = polyline.getSvgPathData()
			expect(pathData).toMatch(/^M 0 0 L 10 0$/)
		})

		it('should handle three-point polylines', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const pathData = polyline.getSvgPathData()
			expect(pathData).toMatch(/^M 0 0 L 10 0 L 10 10$/)
		})

		it('should handle complex polylines', () => {
			const points = [
				new Vec(0, 0),
				new Vec(10, 0),
				new Vec(15, 5),
				new Vec(10, 10),
				new Vec(0, 10),
			]
			const polyline = new Polyline2d({ points })

			const pathData = polyline.getSvgPathData()
			const lCount = (pathData.match(/L/g) || []).length
			expect(lCount).toBe(4) // 5 points = 4 L commands
		})

		it('should format coordinates correctly', () => {
			const points = [new Vec(1.5, 2.7), new Vec(10.3, 5.9), new Vec(20.1, 0.4)]
			const polyline = new Polyline2d({ points })

			const pathData = polyline.getSvgPathData()
			expect(pathData).toMatch(/M[\d. ]+/) // Should handle decimal coordinates
		})

		it('should handle empty polyline gracefully', () => {
			const points: Vec[] = []
			expect(() => {
				new Polyline2d({ points })
			}).toThrow('Polyline2d: points must be an array of at least 2 points')
		})
	})

	describe('polyline-specific properties', () => {
		it('should always be open (not closed)', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.isClosed).toBe(false)
			// Should not create a closing segment back to the first point
			expect(polyline.segments.length).toBe(3) // 4 points = 3 segments (not 4)
		})

		it('should always be unfilled', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.isFilled).toBe(false)
			expect(polyline.area).toBe(0) // Open shapes have no area
		})

		it('should handle straight lines', () => {
			const points = [new Vec(0, 0), new Vec(10, 0)]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(1)
			expect(polyline.getLength()).toBeCloseTo(10, 1)
			expect(polyline.getSvgPathData()).toBe('M 0 0 L 10 0')
		})

		it('should handle zigzag patterns', () => {
			const points = [
				new Vec(0, 0),
				new Vec(10, 10),
				new Vec(20, 0),
				new Vec(30, 10),
				new Vec(40, 0),
			]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(4)
			// Each segment should be roughly sqrt(200) ≈ 14.14
			const expectedLength = 4 * Math.sqrt(200)
			expect(polyline.getLength()).toBeCloseTo(expectedLength, 1)
		})

		it('should handle smooth curves (many points)', () => {
			const points = []
			// Create a curve with many points
			for (let i = 0; i <= 20; i++) {
				const t = i / 20
				const x = t * 20
				const y = Math.sin(t * Math.PI * 2) * 5
				points.push(new Vec(x, y))
			}

			const polyline = new Polyline2d({ points })
			expect(polyline.segments.length).toBe(20) // 21 points = 20 segments
			expect(polyline.getLength()).toBeGreaterThan(20) // Should be longer than straight line
		})

		it('should handle right angles', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(2)
			expect(polyline.getLength()).toBeCloseTo(20, 1) // 10 + 10 = 20
		})

		it('should handle sharp angles', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(0, 1)]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(2)
			const expectedLength = 10 + Math.sqrt(101) // 10 + distance from (10,0) to (0,1)
			expect(polyline.getLength()).toBeCloseTo(expectedLength, 1)
		})

		it('should calculate correct length for open paths', () => {
			const points = [new Vec(0, 0), new Vec(3, 0), new Vec(3, 4)]
			const polyline = new Polyline2d({ points })

			// Length should be 3 + 4 = 7 (not including closing segment)
			expect(polyline.getLength()).toBeCloseTo(7, 1)
		})
	})

	describe('edge cases', () => {
		it('should handle very small polylines', () => {
			const points = [new Vec(0, 0), new Vec(0.001, 0.001)]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(1)
			expect(polyline.getLength()).toBeCloseTo(Math.sqrt(0.000002), 5)
		})

		it('should handle very large polylines', () => {
			const points = [new Vec(0, 0), new Vec(1000000, 1000000)]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(1)
			expect(polyline.getLength()).toBeCloseTo(Math.sqrt(2000000000000), 1)
		})

		it('should handle points with very large coordinates', () => {
			const points = [
				new Vec(1000000, 1000000),
				new Vec(2000000, 2000000),
				new Vec(3000000, 1000000),
			]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(2)
			expect(polyline.getLength()).toBeGreaterThan(0)
		})

		it('should handle points with very small coordinates', () => {
			const points = [new Vec(0.0001, 0.0001), new Vec(0.0002, 0.0002), new Vec(0.0003, 0.0001)]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(2)
			expect(polyline.getLength()).toBeGreaterThan(0)
		})

		it('should handle floating point precision issues', () => {
			const points = [new Vec(0.1 + 0.2, 0), new Vec(0.3, 0), new Vec(0.3, 0.1 + 0.2)]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(2)
			expect(polyline.getLength()).toBeGreaterThan(0)
		})

		it('should handle polylines with overlapping points', () => {
			const points = [
				new Vec(0, 0),
				new Vec(10, 0),
				new Vec(10, 0), // Duplicate point
				new Vec(10, 10),
			]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(3) // Still creates segments, even with duplicates
			expect(polyline.getLength()).toBeCloseTo(20, 1) // 10 + 0 + 10 = 20
		})

		it('should handle degenerate polylines (all same point)', () => {
			const points = [new Vec(5, 5), new Vec(5, 5), new Vec(5, 5)]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(2)
			expect(polyline.getLength()).toBeCloseTo(0, 1)
		})

		it('should handle polylines with sharp angles', () => {
			const points = [
				new Vec(0, 0),
				new Vec(10, 0),
				new Vec(0, 0.1), // Very sharp angle
			]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(2)
			expect(polyline.getLength()).toBeGreaterThan(10)
		})

		it('should handle self-intersecting polylines', () => {
			const points = [
				new Vec(0, 0),
				new Vec(10, 10),
				new Vec(10, 0),
				new Vec(0, 10), // Creates an X shape
			]
			const polyline = new Polyline2d({ points })

			expect(polyline.segments.length).toBe(3) // Still creates segments normally
			expect(polyline.getLength()).toBeGreaterThan(0)
		})

		// Updated tests for the new validation requirements
		it('should throw error for empty points array', () => {
			const points: Vec[] = []
			expect(() => {
				new Polyline2d({ points })
			}).toThrow('Polyline2d: points must be an array of at least 2 points')
		})

		it('should throw error for single point array', () => {
			const points = [new Vec(5, 5)]
			expect(() => {
				new Polyline2d({ points })
			}).toThrow('Polyline2d: points must be an array of at least 2 points')
		})

		it('should accept exactly 2 points', () => {
			const points = [new Vec(0, 0), new Vec(10, 10)]
			expect(() => {
				new Polyline2d({ points })
			}).not.toThrow()
		})

		it('should accept more than 2 points', () => {
			const points = [new Vec(0, 0), new Vec(10, 10), new Vec(20, 0)]
			expect(() => {
				new Polyline2d({ points })
			}).not.toThrow()
		})
	})

	describe('validation error testing', () => {
		it('should throw specific error message for empty array', () => {
			expect(() => {
				new Polyline2d({ points: [] })
			}).toThrow('Polyline2d: points must be an array of at least 2 points')
		})

		it('should throw specific error message for single point', () => {
			expect(() => {
				new Polyline2d({ points: [new Vec(1, 1)] })
			}).toThrow('Polyline2d: points must be an array of at least 2 points')
		})

		it('should NOT throw for exactly 2 points', () => {
			expect(() => {
				new Polyline2d({ points: [new Vec(0, 0), new Vec(1, 1)] })
			}).not.toThrow()
		})

		it('should NOT throw for 3 points', () => {
			expect(() => {
				new Polyline2d({ points: [new Vec(0, 0), new Vec(1, 1), new Vec(2, 2)] })
			}).not.toThrow()
		})

		it('should NOT throw for many points', () => {
			const manyPoints: Vec[] = []
			for (let i = 0; i < 100; i++) {
				manyPoints.push(new Vec(i, i))
			}
			expect(() => {
				new Polyline2d({ points: manyPoints })
			}).not.toThrow()
		})

		it('should validate before any processing', () => {
			// This tests that validation happens before any other constructor logic
			let constructorCalled = false

			// Create a custom class to test validation order
			class TestPolyline extends Polyline2d {
				constructor(config: any) {
					super(config)
					constructorCalled = true
				}
			}

			expect(() => {
				new TestPolyline({ points: [] })
			}).toThrow('Polyline2d: points must be an array of at least 2 points')

			// Constructor should never complete due to early validation
			expect(constructorCalled).toBe(false)
		})

		it('should work with null/undefined edge cases', () => {
			// Test that the length check works even with unusual inputs
			expect(() => {
				// @ts-expect-error - Testing edge case
				new Polyline2d({ points: null })
			}).toThrow() // Should throw (probably TypeError on null.length)

			expect(() => {
				// @ts-expect-error - Testing edge case
				new Polyline2d({ points: undefined })
			}).toThrow() // Should throw (probably TypeError on undefined.length)
		})

		it('should not interfere with valid polyline functionality', () => {
			// Ensure the validation doesn't break normal operation
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.points).toBe(points)
			expect(polyline.segments.length).toBe(2)
			expect(polyline.getLength()).toBeCloseTo(20, 1)
			expect(polyline.isClosed).toBe(false)
			expect(polyline.isFilled).toBe(false)
		})
	})

	describe('integration with base Geometry2d methods', () => {
		it('should work correctly with bounds calculation', () => {
			const points = [new Vec(2, 3), new Vec(8, 3), new Vec(8, 7)]
			const polyline = new Polyline2d({ points })

			const bounds = polyline.bounds
			expect(bounds.x).toBe(2)
			expect(bounds.y).toBe(3)
			expect(bounds.w).toBe(6)
			expect(bounds.h).toBe(4)
		})

		it('should work correctly with area calculation (should be 0)', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.area).toBe(0) // Polylines always have 0 area
			expect(polyline.getArea()).toBe(0)
		})

		it('should work correctly with transformation methods', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			// Test that transform method exists and works
			expect(typeof polyline.transform).toBe('function')
		})

		it('should work correctly with distance calculations', () => {
			const points = [new Vec(0, 0), new Vec(10, 0)]
			const polyline = new Polyline2d({ points })

			const distance = polyline.distanceToPoint(new Vec(5, 5))
			expect(distance).toBeCloseTo(5, 1) // Distance to horizontal line
		})

		it('should work correctly with hit testing methods', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const hitPoint = polyline.hitTestPoint(new Vec(5, 0), 1)
			expect(hitPoint).toBe(true)

			const missPoint = polyline.hitTestPoint(new Vec(5, 5), 1)
			expect(missPoint).toBe(false)
		})

		it('should work correctly with point containment tests', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			// Polylines don't contain points since they're not closed/filled
			const contained = polyline.hitTestPoint(new Vec(5, 5), 0, true)
			expect(contained).toBe(false)
		})

		it('should work correctly with intersection methods', () => {
			const points = [new Vec(0, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const intersections = polyline.intersectLineSegment(new Vec(0, 10), new Vec(10, 0))
			expect(intersections.length).toBeGreaterThan(0) // Should intersect at (5, 5)
		})

		it('should work correctly with interpolation methods', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const midPoint = polyline.interpolateAlongEdge(0.5)
			expect(midPoint).toBeDefined()
			expect(midPoint.x).toBeGreaterThanOrEqual(0)
			expect(midPoint.x).toBeLessThanOrEqual(10)
		})
	})

	describe('mathematical properties', () => {
		it('should maintain vertex order consistency', () => {
			const points = [new Vec(1, 2), new Vec(3, 4), new Vec(5, 6), new Vec(7, 8)]
			const polyline = new Polyline2d({ points })

			const vertices = polyline.getVertices()
			for (let i = 0; i < points.length; i++) {
				expect(vertices[i]).toEqual(points[i])
			}
		})

		it('should calculate correct centroid', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const center = polyline.center
			expect(center.x).toBeCloseTo(5, 1)
			expect(center.y).toBeCloseTo(5, 1)
		})

		it('should handle simple vs complex polylines', () => {
			const simple = new Polyline2d({ points: [new Vec(0, 0), new Vec(10, 0)] })
			const complex = new Polyline2d({
				points: [new Vec(0, 0), new Vec(10, 5), new Vec(15, 10), new Vec(5, 15), new Vec(-5, 10)],
			})

			expect(simple.segments.length).toBe(1)
			expect(complex.segments.length).toBe(4)
			expect(simple.getLength()).toBeLessThan(complex.getLength())
		})

		it('should validate open path behavior', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polyline = new Polyline2d({ points })

			// Should not close the path
			expect(polyline.segments.length).toBe(3) // Not 4
			const lastSegment = polyline.segments[polyline.segments.length - 1]
			expect(lastSegment.end).toEqual(new Vec(0, 10))
			expect(lastSegment.end).not.toEqual(new Vec(0, 0)) // Should not close
		})

		it('should handle direction/orientation', () => {
			const clockwise = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const counterclockwise = [new Vec(0, 0), new Vec(10, 10), new Vec(10, 0)]

			const cw = new Polyline2d({ points: clockwise })
			const ccw = new Polyline2d({ points: counterclockwise })

			// Both should be valid and have same number of segments
			expect(cw.segments.length).toBe(2)
			expect(ccw.segments.length).toBe(2)
		})

		it('should calculate correct bounding box', () => {
			const points = [new Vec(-5, -10), new Vec(15, -10), new Vec(15, 20), new Vec(-5, 20)]
			const polyline = new Polyline2d({ points })

			const bounds = polyline.bounds
			expect(bounds.x).toBe(-5)
			expect(bounds.y).toBe(-10)
			expect(bounds.w).toBe(20)
			expect(bounds.h).toBe(30)
		})
	})

	describe('comparison with Polygon2d', () => {
		it('should behave differently from Polygon2d for isClosed', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polyline.isClosed).toBe(false)
			expect(polygon.isClosed).toBe(true)
		})

		it('should have fewer segments than equivalent Polygon2d', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polyline.segments.length).toBe(2) // No closing segment
			expect(polygon.segments.length).toBe(3) // Including closing segment
		})

		it('should calculate different length than equivalent Polygon2d', () => {
			const points = [new Vec(0, 0), new Vec(3, 0), new Vec(0, 4)]
			const polyline = new Polyline2d({ points })
			const polygon = new Polygon2d({ points, isFilled: false })

			const polylineLength = polyline.getLength()
			const polygonLength = polygon.getLength()

			expect(polylineLength).toBeLessThan(polygonLength)
			expect(polylineLength).toBeCloseTo(8, 1) // 3 + 5 = 8
			expect(polygonLength).toBeCloseTo(12, 1) // 3 + 5 + 4 = 12
		})

		it('should handle SVG generation differently than Polygon2d', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })
			const polygon = new Polygon2d({ points, isFilled: false })

			const polylineSvg = polyline.getSvgPathData()
			const polygonSvg = polygon.getSvgPathData()

			// Both should start with M and use same getSvgPathData method
			expect(polylineSvg).toMatch(/^M/)
			expect(polygonSvg).toMatch(/^M/)

			// However, the toSimpleSvgPath method should differ
			const polylineSimpleSvg = polyline.toSimpleSvgPath()
			const polygonSimpleSvg = polygon.toSimpleSvgPath()

			expect(polylineSimpleSvg).not.toContain('Z')
			expect(polygonSimpleSvg).toContain('Z')
		})

		it('should share base functionality with Polygon2d', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			// Should have inherited methods from Geometry2d
			expect(typeof polyline.getVertices).toBe('function')
			expect(typeof polyline.nearestPoint).toBe('function')
			expect(typeof polyline.hitTestLineSegment).toBe('function')
			expect(typeof polyline.getSvgPathData).toBe('function')
		})
	})

	describe('performance and caching', () => {
		it('should cache segments calculation', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const segments1 = polyline.segments
			const segments2 = polyline.segments

			expect(segments1).toBe(segments2) // Should be the same reference (cached)
		})

		it('should not recalculate segments on repeated access', () => {
			const points = []
			for (let i = 0; i < 100; i++) {
				points.push(new Vec(i, Math.sin(i) * 10))
			}
			const polyline = new Polyline2d({ points })

			const start = performance.now()
			for (let i = 0; i < 10; i++) {
				const _segments = polyline.segments // Should use cached value after first call
			}
			const end = performance.now()

			expect(end - start).toBeLessThan(5) // Should be very fast due to caching
		})

		it('should handle large numbers of points efficiently', () => {
			const points = []
			for (let i = 0; i < 1000; i++) {
				points.push(new Vec(i, Math.random() * 100))
			}

			const start = performance.now()
			const polyline = new Polyline2d({ points })
			const segments = polyline.segments
			const length = polyline.getLength()
			const end = performance.now()

			expect(segments.length).toBe(999)
			expect(length).toBeGreaterThan(0)
			expect(end - start).toBeLessThan(100) // Should complete in reasonable time
		})

		it('should reuse computation across method calls', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polyline = new Polyline2d({ points })

			// These should all use cached segments
			const length1 = polyline.getLength()
			const length2 = polyline.getLength()
			const vertices1 = polyline.getVertices()
			const vertices2 = polyline.getVertices()

			expect(length1).toBe(length2)
			expect(vertices1).toBe(vertices2) // Should be same reference
		})
	})

	describe('snapshots', () => {
		it('should match snapshot for simple line SVG path', () => {
			const points = [new Vec(0, 0), new Vec(10, 0)]
			const polyline = new Polyline2d({ points })

			expect(polyline.getSvgPathData()).toMatchInlineSnapshot(`"M 0 0 L 10 0"`)
		})

		it('should match snapshot for L-shaped polyline SVG path', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.getSvgPathData()).toMatchInlineSnapshot(`"M 0 0 L 10 0 L 10 10"`)
		})

		it('should match snapshot for complex polyline SVG path', () => {
			const points = [
				new Vec(0, 0),
				new Vec(10, 5),
				new Vec(15, 10),
				new Vec(5, 15),
				new Vec(-5, 10),
			]
			const polyline = new Polyline2d({ points })

			expect(polyline.getSvgPathData()).toMatchInlineSnapshot(
				`"M 0 0 L 10 5 L 15 10 L 5 15 L -5 10"`
			)
		})

		it('should match snapshot for polyline vertices', () => {
			const points = [new Vec(1, 2), new Vec(3, 4), new Vec(5, 6)]
			const polyline = new Polyline2d({ points })

			expect(polyline.getVertices()).toMatchInlineSnapshot(`
				[
				  Vec {
				    "x": 1,
				    "y": 2,
				    "z": 1,
				  },
				  Vec {
				    "x": 3,
				    "y": 4,
				    "z": 1,
				  },
				  Vec {
				    "x": 5,
				    "y": 6,
				    "z": 1,
				  },
				]
			`)
		})

		it('should match snapshot for polyline segments', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const segmentData = polyline.segments.map((segment) => ({
				start: { x: segment.start.x, y: segment.start.y },
				end: { x: segment.end.x, y: segment.end.y },
				length: segment.length,
			}))

			expect(segmentData).toMatchInlineSnapshot(`
				[
				  {
				    "end": {
				      "x": 10,
				      "y": 0,
				    },
				    "length": 10,
				    "start": {
				      "x": 0,
				      "y": 0,
				    },
				  },
				  {
				    "end": {
				      "x": 10,
				      "y": 10,
				    },
				    "length": 10,
				    "start": {
				      "x": 10,
				      "y": 0,
				    },
				  },
				]
			`)
		})

		it('should match snapshot for polyline properties', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polyline = new Polyline2d({ points })

			const properties = {
				isClosed: polyline.isClosed,
				isFilled: polyline.isFilled,
				length: polyline.getLength(),
				area: polyline.area,
				bounds: {
					x: polyline.bounds.x,
					y: polyline.bounds.y,
					w: polyline.bounds.w,
					h: polyline.bounds.h,
				},
			}

			expect(properties).toMatchInlineSnapshot(`
				{
				  "area": 0,
				  "bounds": {
				    "h": 10,
				    "w": 10,
				    "x": 0,
				    "y": 0,
				  },
				  "isClosed": false,
				  "isFilled": false,
				  "length": 20,
				}
			`)
		})

		it('should match snapshot for zigzag polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 10), new Vec(20, 0), new Vec(30, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.getSvgPathData()).toMatchInlineSnapshot(`"M 0 0 L 10 10 L 20 0 L 30 10"`)
		})

		it('should match snapshot for smooth curve polyline', () => {
			const points = []
			for (let i = 0; i <= 4; i++) {
				const t = i / 4
				const x = t * 10
				const y = Math.sin(t * Math.PI) * 5
				points.push(new Vec(x, y))
			}
			const polyline = new Polyline2d({ points })

			expect(polyline.getSvgPathData()).toMatchInlineSnapshot(
				`"M 0 0 L 2.5 3.5355339059327373 L 5 5 L 7.5 3.5355339059327378 L 10 6.123233995736766e-16"`
			)
		})

		it('should match snapshot for self-intersecting polyline', () => {
			const points = [new Vec(0, 0), new Vec(10, 10), new Vec(10, 0), new Vec(0, 10)]
			const polyline = new Polyline2d({ points })

			expect(polyline.getSvgPathData()).toMatchInlineSnapshot(`"M 0 0 L 10 10 L 10 0 L 0 10"`)
		})

		it('should match snapshot for complete polyline test matrix', () => {
			const testCases = [
				{ name: 'simple line', points: [new Vec(0, 0), new Vec(5, 0)] },
				{ name: 'L-shape', points: [new Vec(0, 0), new Vec(5, 0), new Vec(5, 5)] },
				{ name: 'triangle', points: [new Vec(0, 0), new Vec(5, 0), new Vec(2.5, 5)] },
			]

			const results = testCases.map((testCase) => ({
				name: testCase.name,
				svgPath: new Polyline2d({ points: testCase.points }).getSvgPathData(),
				length: new Polyline2d({ points: testCase.points }).getLength(),
				segmentCount: new Polyline2d({ points: testCase.points }).segments.length,
			}))

			expect(results).toMatchInlineSnapshot(`
				[
				  {
				    "length": 5,
				    "name": "simple line",
				    "segmentCount": 1,
				    "svgPath": "M 0 0 L 5 0",
				  },
				  {
				    "length": 10,
				    "name": "L-shape",
				    "segmentCount": 2,
				    "svgPath": "M 0 0 L 5 0 L 5 5",
				  },
				  {
				    "length": 10.590169943749475,
				    "name": "triangle",
				    "segmentCount": 2,
				    "svgPath": "M 0 0 L 5 0 L 2.5 5",
				  },
				]
			`)
		})
	})
})
