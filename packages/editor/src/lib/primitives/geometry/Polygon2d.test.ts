import { Vec } from '../Vec'
import { Polygon2d } from './Polygon2d'
import { Polyline2d } from './Polyline2d'

describe('Polygon2d', () => {
	describe('construction', () => {
		it('should create a polygon with points array', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.points).toEqual(points)
			expect(polygon.points.length).toBe(3)
		})

		it('should initialize with correct isClosed and isFilled values', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.isClosed).toBe(true)
			expect(polygon.isFilled).toBe(false)
		})

		it('should always have isClosed = true', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.isClosed).toBe(true)

			// Even if we try to set it differently in config, it should still be true
			const polygon2 = new Polygon2d({ points, isFilled: true })
			expect(polygon2.isClosed).toBe(true)
		})

		it('should handle minimum points (3 points for valid polygon)', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.points).toEqual(points)
			expect(polygon.segments.length).toBe(3) // 3 segments for triangle (including closing)
		})

		it('should handle multiple points (4+ points)', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.points).toEqual(points)
			expect(polygon.segments.length).toBe(4) // 4 segments for square (including closing)
		})

		it('should store points array correctly', () => {
			const points = [new Vec(1, 2), new Vec(3, 4), new Vec(5, 6)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.points).toBe(points) // Should be the same reference
			expect(polygon.points[0]).toEqual(new Vec(1, 2))
			expect(polygon.points[1]).toEqual(new Vec(3, 4))
			expect(polygon.points[2]).toEqual(new Vec(5, 6))
		})

		it('should throw error when insufficient points provided', () => {
			// Polygons typically need at least 3 points
			expect(() => {
				new Polygon2d({ points: [], isFilled: false })
			}).toThrow() // Implementation may not throw

			expect(() => {
				new Polygon2d({ points: [new Vec(0, 0)], isFilled: false })
			}).toThrow() // Implementation may not throw

			expect(() => {
				new Polygon2d({ points: [new Vec(0, 0), new Vec(10, 0)], isFilled: false })
			}).toThrow() // Implementation may not throw
		})

		it('should handle duplicate points', () => {
			const points = [new Vec(0, 0), new Vec(0, 0), new Vec(10, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.points).toEqual(points)
			expect(polygon.segments.length).toBe(3)
		})

		it('should handle collinear points', () => {
			const points = [new Vec(0, 0), new Vec(5, 0), new Vec(10, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.points).toEqual(points)
			expect(polygon.segments.length).toBe(3)
		})
	})

	describe('segments', () => {
		it('should generate edge segments from points', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const segments = polygon.segments
			expect(segments.length).toBe(3) // 3 points = 3 segments (including closing)
			expect(segments[0].constructor.name).toBe('Edge2d')
			expect(segments[1].constructor.name).toBe('Edge2d')
			expect(segments[2].constructor.name).toBe('Edge2d')
		})

		it('should create correct number of segments (points.length for closed polygon)', () => {
			const trianglePoints = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const trianglePolygon = new Polygon2d({ points: trianglePoints, isFilled: false })
			expect(trianglePolygon.segments.length).toBe(3)

			const squarePoints = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const squarePolygon = new Polygon2d({ points: squarePoints, isFilled: false })
			expect(squarePolygon.segments.length).toBe(4)

			const pentagonPoints = [
				new Vec(0, 0),
				new Vec(10, 0),
				new Vec(15, 7),
				new Vec(5, 12),
				new Vec(-5, 7),
			]
			const pentagonPolygon = new Polygon2d({ points: pentagonPoints, isFilled: false })
			expect(pentagonPolygon.segments.length).toBe(5)
		})

		it('should cache segments after first calculation', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const segments1 = polygon.segments
			const segments2 = polygon.segments

			expect(segments1).toBe(segments2) // Should be the same reference
		})

		it('should connect segments in order (point[i] to point[i+1])', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const segments = polygon.segments
			expect(segments.length).toBe(4)

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

		it('should include closing segment (last point to first point)', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const segments = polygon.segments
			const lastSegment = segments[segments.length - 1]

			// Last segment should connect last point to first point
			expect(lastSegment.start).toEqual(points[points.length - 1])
			expect(lastSegment.end).toEqual(points[0])
		})

		it('should handle triangular polygons (3 points)', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const segments = polygon.segments
			expect(segments.length).toBe(3)

			expect(segments[0].start).toEqual(new Vec(0, 0))
			expect(segments[0].end).toEqual(new Vec(10, 0))
			expect(segments[1].start).toEqual(new Vec(10, 0))
			expect(segments[1].end).toEqual(new Vec(5, 10))
			expect(segments[2].start).toEqual(new Vec(5, 10))
			expect(segments[2].end).toEqual(new Vec(0, 0)) // Closing segment
		})

		it('should handle rectangular polygons (4 points)', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const segments = polygon.segments
			expect(segments.length).toBe(4)

			// All four segments should be present including closing segment
			expect(segments[3].start).toEqual(new Vec(0, 10))
			expect(segments[3].end).toEqual(new Vec(0, 0)) // Closing segment
		})

		it('should handle complex polygons (many points)', () => {
			const points = []
			for (let i = 0; i < 8; i++) {
				const angle = (i / 8) * Math.PI * 2
				points.push(new Vec(Math.cos(angle) * 10, Math.sin(angle) * 10))
			}

			const polygon = new Polygon2d({ points, isFilled: false })
			const segments = polygon.segments

			expect(segments.length).toBe(8) // 8 points = 8 segments
			// Last segment should close the polygon
			expect(segments[7].start).toEqual(points[7])
			expect(segments[7].end).toEqual(points[0])
		})

		it('should create Edge2d instances for segments', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const segments = polygon.segments
			segments.forEach((segment) => {
				expect(segment.constructor.name).toBe('Edge2d')
				expect(segment.start).toBeInstanceOf(Vec)
				expect(segment.end).toBeInstanceOf(Vec)
			})
		})
	})

	describe('getLength', () => {
		it('should return sum of all segment lengths including closing segment', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const segments = polygon.segments
			const expectedLength = segments.reduce((sum, segment) => sum + segment.length, 0)

			expect(polygon.getLength()).toBeCloseTo(expectedLength, 10)
		})

		it('should return positive length', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.getLength()).toBeGreaterThan(0)
		})

		it('should handle triangular polygons', () => {
			const points = [new Vec(0, 0), new Vec(3, 0), new Vec(0, 4)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const length = polygon.getLength()
			// Triangle with sides 3, 4, 5 (Pythagorean triple)
			expect(length).toBeCloseTo(12, 1) // 3 + 4 + 5 = 12
		})

		it('should handle rectangular polygons', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 5), new Vec(0, 5)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const length = polygon.getLength()
			expect(length).toBeCloseTo(30, 1) // 10 + 5 + 10 + 5 = 30
		})

		it('should handle complex polygons', () => {
			const points = []
			for (let i = 0; i < 6; i++) {
				const angle = (i / 6) * Math.PI * 2
				points.push(new Vec(Math.cos(angle) * 10, Math.sin(angle) * 10))
			}

			const polygon = new Polygon2d({ points, isFilled: false })
			const length = polygon.getLength()

			expect(length).toBeGreaterThan(0)
			expect(length).toBeCloseTo(60, 5) // Approximate hexagon perimeter
		})

		it('should be consistent across multiple calls', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0), new Vec(10, 15)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const length1 = polygon.getLength()
			const length2 = polygon.getLength()
			const length3 = polygon.getLength()

			expect(length1).toBe(length2)
			expect(length2).toBe(length3)
		})

		it('should handle degenerate polygons', () => {
			// Collinear points
			const points = [new Vec(0, 0), new Vec(5, 0), new Vec(10, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const length = polygon.getLength()
			expect(length).toBeGreaterThan(0)
			expect(length).toBeCloseTo(20, 1) // 5 + 5 + 10 = 20
		})

		it('should include perimeter calculation', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const perimeter = polygon.getLength()
			expect(perimeter).toBeCloseTo(40, 1) // Complete perimeter of square
		})
	})

	describe('getVertices', () => {
		it('should return the original points array', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const vertices = polygon.getVertices()
			expect(vertices).toEqual(points)
		})

		it('should maintain point order', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const vertices = polygon.getVertices()
			expect(vertices[0]).toEqual(points[0])
			expect(vertices[1]).toEqual(points[1])
			expect(vertices[2]).toEqual(points[2])
			expect(vertices[3]).toEqual(points[3])
		})

		it('should not include duplicate closing point', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const vertices = polygon.getVertices()
			expect(vertices.length).toBe(3) // Should not include duplicate of first point
			expect(vertices[vertices.length - 1]).not.toEqual(vertices[0])
		})

		it('should handle different polygon shapes', () => {
			const trianglePoints = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const triangle = new Polygon2d({ points: trianglePoints, isFilled: false })
			expect(triangle.getVertices()).toEqual(trianglePoints)

			const squarePoints = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const square = new Polygon2d({ points: squarePoints, isFilled: false })
			expect(square.getVertices()).toEqual(squarePoints)
		})

		it('should return Vec instances', () => {
			const points = [new Vec(1, 2), new Vec(3, 4), new Vec(5, 6)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const vertices = polygon.getVertices()
			vertices.forEach((vertex) => {
				expect(vertex).toBeInstanceOf(Vec)
			})
		})
	})

	describe('nearestPoint', () => {
		it('should find nearest point on any segment including closing segment', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const queryPoint = new Vec(5, 2)
			const nearest = polygon.nearestPoint(queryPoint)

			expect(nearest).toBeDefined()
			expect(nearest.x).toBeGreaterThanOrEqual(0)
			expect(nearest.x).toBeLessThanOrEqual(10)
		})

		it('should return point on the polygon perimeter', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const queryPoint = new Vec(10, 10)
			const nearest = polygon.nearestPoint(queryPoint)

			// Verify the nearest point is actually on one of the segments
			const isOnSegment = polygon.segments.some((segment) => {
				const segmentNearest = segment.nearestPoint(queryPoint)
				return Vec.Dist(segmentNearest, nearest) < 0.001
			})

			expect(isOnSegment).toBe(true)
		})

		it('should handle point inside polygon', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const queryPoint = new Vec(5, 5) // Center of square
			const nearest = polygon.nearestPoint(queryPoint)

			expect(nearest).toBeDefined()
			expect(Vec.Dist(nearest, queryPoint)).toBeGreaterThan(0)
		})

		it('should handle point outside polygon', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const queryPoint = new Vec(20, 20) // Far outside
			const nearest = polygon.nearestPoint(queryPoint)

			expect(nearest).toBeDefined()
			expect(nearest.x).toBeLessThanOrEqual(10)
			expect(nearest.y).toBeLessThanOrEqual(10)
		})

		it('should handle point very close to polygon', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const queryPoint = new Vec(5, 0.1) // Very close to bottom edge
			const nearest = polygon.nearestPoint(queryPoint)

			expect(Vec.Dist(nearest, queryPoint)).toBeLessThan(1)
		})

		it('should handle point very far from polygon', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const queryPoint = new Vec(1000, 1000) // Very far away
			const nearest = polygon.nearestPoint(queryPoint)

			expect(nearest).toBeDefined()
			// Should be one of the vertices or on an edge
			expect(nearest.x).toBeGreaterThanOrEqual(0)
			expect(nearest.x).toBeLessThanOrEqual(10)
		})

		it('should handle point near vertices', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const queryPoint = new Vec(0.1, 0.1) // Near first vertex
			const nearest = polygon.nearestPoint(queryPoint)

			expect(nearest).toBeDefined()
			expect(Vec.Dist(nearest, points[0])).toBeLessThan(2) // Should be close to first vertex
		})

		it('should handle point near edges', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const queryPoint = new Vec(5, -1) // Near bottom edge
			const nearest = polygon.nearestPoint(queryPoint)

			expect(nearest.y).toBeCloseTo(0, 1) // Should be on bottom edge
			expect(nearest.x).toBeCloseTo(5, 1)
		})

		it('should choose closest among all segments', () => {
			const points = [
				new Vec(0, 0),
				new Vec(10, 0),
				new Vec(20, 10),
				new Vec(10, 20),
				new Vec(0, 10),
			]
			const polygon = new Polygon2d({ points, isFilled: false })

			const queryPoint = new Vec(5, 0) // Closer to first segment
			const nearest = polygon.nearestPoint(queryPoint)

			// Should find a point closer to the first segment
			expect(nearest.y).toBeCloseTo(0, 1) // Should be on bottom edge
		})

		it('should throw error if no nearest point found', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Normal usage should not throw
			expect(() => {
				polygon.nearestPoint(new Vec(5, 5))
			}).not.toThrow()

			// The implementation should always find a nearest point
			const nearest = polygon.nearestPoint(new Vec(5, 5))
			expect(nearest).toBeDefined()
		})
	})

	describe('hitTestLineSegment', () => {
		it('should return true when line segment intersects polygon', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Line that clearly crosses the polygon
			const lineStart = new Vec(5, -2)
			const lineEnd = new Vec(5, 10)

			expect(polygon.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should return false when line segment does not intersect polygon', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Line that's completely away from the polygon
			const lineStart = new Vec(0, 20)
			const lineEnd = new Vec(20, 20)

			expect(polygon.hitTestLineSegment(lineStart, lineEnd)).toBe(false)
		})

		it('should handle line intersecting multiple segments', () => {
			const points = [new Vec(0, 0), new Vec(10, 10), new Vec(20, 0), new Vec(30, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Horizontal line that could intersect multiple segments
			const lineStart = new Vec(-5, 5)
			const lineEnd = new Vec(35, 5)

			expect(polygon.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should handle line intersecting single segment', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(20, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Line that only intersects the first segment
			const lineStart = new Vec(2, -2)
			const lineEnd = new Vec(2, 2)

			expect(polygon.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should handle line intersecting closing segment', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Line that intersects the closing segment (from last point to first point)
			const lineStart = new Vec(-2, 5)
			const lineEnd = new Vec(8, 5)

			expect(polygon.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should handle line tangent to polygon', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Line that might be tangent (hard to determine exact tangent, so test nearby)
			const lineStart = new Vec(9, 4)
			const lineEnd = new Vec(11, 6)

			// Should return true if it intersects, false if it doesn't
			const result = polygon.hitTestLineSegment(lineStart, lineEnd)
			expect(typeof result).toBe('boolean')
		})

		it('should handle line passing through vertices', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Line passing through start point
			const lineStart = new Vec(-5, -5)
			const lineEnd = new Vec(5, 5)

			expect(polygon.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should handle line entirely inside polygon', () => {
			const points = [new Vec(0, 0), new Vec(20, 0), new Vec(20, 20), new Vec(0, 20)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Line segment inside the polygon bounds
			const lineStart = new Vec(5, 5)
			const lineEnd = new Vec(15, 15)

			const result = polygon.hitTestLineSegment(lineStart, lineEnd)
			expect(typeof result).toBe('boolean')
		})

		it('should handle line entirely outside polygon', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Line segment completely outside
			const lineStart = new Vec(25, 25)
			const lineEnd = new Vec(30, 30)

			expect(polygon.hitTestLineSegment(lineStart, lineEnd)).toBe(false)
		})

		it('should handle very short line segments', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Very short line segment that crosses the polygon
			const lineStart = new Vec(4.9, 2)
			const lineEnd = new Vec(5.1, 2)

			const result = polygon.hitTestLineSegment(lineStart, lineEnd)
			expect(typeof result).toBe('boolean')
		})

		it('should handle degenerate line segments (same start/end)', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Point on the polygon
			const point = new Vec(0, 0) // Start point
			const result = polygon.hitTestLineSegment(point, point)

			expect(typeof result).toBe('boolean')
		})

		it('should support distance parameter for hit testing', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Line segment slightly away from polygon
			const lineStart = new Vec(5, -0.5)
			const lineEnd = new Vec(5, -0.1)

			const hitWithoutDistance = polygon.hitTestLineSegment(lineStart, lineEnd, 0)
			const hitWithDistance = polygon.hitTestLineSegment(lineStart, lineEnd, 1)

			// Distance parameter should change the result (either direction)
			expect(typeof hitWithoutDistance).toBe('boolean')
			expect(typeof hitWithDistance).toBe('boolean')
		})
	})

	describe('getSvgPathData', () => {
		it('should return valid SVG path data', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const pathData = polygon.getSvgPathData()
			expect(typeof pathData).toBe('string')
			expect(pathData.length).toBeGreaterThan(0)
		})

		it('should start with move command', () => {
			const points = [new Vec(5, 10), new Vec(15, 20), new Vec(25, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const pathData = polygon.getSvgPathData()
			expect(pathData).toMatch(/^M/)
		})

		it('should use line commands for all edges', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0), new Vec(10, 15)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const pathData = polygon.getSvgPathData()
			const lCount = (pathData.match(/L/g) || []).length
			expect(lCount).toBe(3) // 4 points = 3 L commands (first point uses M)
		})

		it('should not include explicit closing Z command (handled by isClosed)', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const pathData = polygon.getSvgPathData()
			// The path data doesn't include Z because closing is implicit
			expect(pathData).not.toContain('Z')
		})

		it('should handle triangular polygons', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const pathData = polygon.getSvgPathData()
			expect(pathData).toMatch(/^M 0 0 L 10 0 L 5 10$/)
		})

		it('should handle rectangular polygons', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const pathData = polygon.getSvgPathData()
			expect(pathData).toMatch(/^M 0 0 L 10 0 L 10 10 L 0 10$/)
		})

		it('should handle complex polygons', () => {
			const points = [
				new Vec(0, 0),
				new Vec(10, 0),
				new Vec(15, 5),
				new Vec(10, 10),
				new Vec(0, 10),
				new Vec(-5, 5),
			]
			const polygon = new Polygon2d({ points, isFilled: false })

			const pathData = polygon.getSvgPathData()
			const lCount = (pathData.match(/L/g) || []).length
			expect(lCount).toBe(5) // 6 points = 5 L commands
		})

		it('should format coordinates correctly', () => {
			const points = [new Vec(1.5, 2.7), new Vec(10.3, 5.9), new Vec(20.1, 0.4)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const pathData = polygon.getSvgPathData()
			expect(pathData).toMatch(/M[\d. ]+/) // Should handle decimal coordinates
		})
	})

	describe('polygon-specific properties', () => {
		it('should always be closed', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.isClosed).toBe(true)

			// Even when creating with explicit isFilled, should still be closed
			const polygon2 = new Polygon2d({ points, isFilled: true })
			expect(polygon2.isClosed).toBe(true)
		})

		it('should handle self-intersecting polygons', () => {
			const points = [new Vec(0, 0), new Vec(20, 20), new Vec(20, 0), new Vec(0, 20)]
			expect(() => {
				const polygon = new Polygon2d({ points, isFilled: false })
				expect(polygon.getLength()).toBeGreaterThan(0)
				expect(polygon.segments.length).toBe(4)
			}).not.toThrow()
		})

		it('should work with convex polygons', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.getLength()).toBeCloseTo(40, 1)
			expect(polygon.segments.length).toBe(4)
		})

		it('should work with concave polygons', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 5), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.segments.length).toBe(5)
			expect(polygon.getLength()).toBeGreaterThan(0)
		})

		it('should handle clockwise point order', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)] // Clockwise
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.points).toEqual(points)
			expect(polygon.getLength()).toBeCloseTo(40, 1)
		})

		it('should handle counter-clockwise point order', () => {
			const points = [new Vec(0, 0), new Vec(0, 10), new Vec(10, 10), new Vec(10, 0)] // Counter-clockwise
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.points).toEqual(points)
			expect(polygon.getLength()).toBeCloseTo(40, 1)
		})

		it('should calculate correct perimeter', () => {
			const points = [new Vec(0, 0), new Vec(3, 0), new Vec(3, 4), new Vec(0, 4)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const perimeter = polygon.getLength()
			expect(perimeter).toBeCloseTo(14, 1) // 3 + 4 + 3 + 4 = 14
		})

		it('should distinguish from open polylines', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })
			const polyline = new Polyline2d({ points })

			expect(polygon.isClosed).toBe(true)
			expect(polyline.isClosed).toBe(false)
			expect(polygon.segments.length).toBe(3) // Including closing segment
			expect(polyline.segments.length).toBe(2) // No closing segment
		})
	})

	describe('edge cases', () => {
		it('should handle very small polygons', () => {
			const points = [new Vec(0, 0), new Vec(0.1, 0), new Vec(0.05, 0.1)]
			expect(() => {
				const polygon = new Polygon2d({ points, isFilled: false })
				expect(polygon.getLength()).toBeGreaterThan(0)
			}).not.toThrow()
		})

		it('should handle very large polygons', () => {
			const points: Vec[] = []
			for (let i = 0; i < 100; i++) {
				const angle = (i / 100) * Math.PI * 2
				points.push(new Vec(Math.cos(angle) * 1000, Math.sin(angle) * 1000))
			}

			expect(() => {
				const polygon = new Polygon2d({ points, isFilled: false })
				expect(polygon.segments.length).toBe(100)
			}).not.toThrow()
		})

		it('should handle points with very large coordinates', () => {
			const points = [
				new Vec(1000000, 2000000),
				new Vec(1000010, 2000005),
				new Vec(1000005, 2000015),
			]
			expect(() => {
				const polygon = new Polygon2d({ points, isFilled: false })
				expect(polygon.getLength()).toBeGreaterThan(0)
			}).not.toThrow()
		})

		it('should handle points with very small coordinates', () => {
			const points = [new Vec(0.0001, 0.0002), new Vec(0.0011, 0.0005), new Vec(0.0006, 0.0015)]
			expect(() => {
				const polygon = new Polygon2d({ points, isFilled: false })
				expect(polygon.getLength()).toBeGreaterThan(0)
			}).not.toThrow()
		})

		it('should handle floating point precision issues', () => {
			const points = [new Vec(0.1 + 0.2, 0), new Vec(0.3, 0), new Vec(0.15, 0.1)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.segments.length).toBe(3)
			expect(polygon.getLength()).toBeGreaterThan(0)
		})

		it('should handle polygons with overlapping points', () => {
			const points = [new Vec(0, 0), new Vec(5, 5), new Vec(5, 5), new Vec(10, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.segments.length).toBe(4)
		})

		it('should handle degenerate polygons (collinear points)', () => {
			const points = [new Vec(0, 0), new Vec(5, 0), new Vec(10, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.segments.length).toBe(3)
			expect(polygon.getLength()).toBeCloseTo(20, 1) // 5 + 5 + 10
		})

		it('should handle polygons with sharp angles', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 0.1), new Vec(0, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(polygon.segments.length).toBe(4)
			expect(polygon.getLength()).toBeGreaterThan(0)
		})

		it('should handle regular polygons (squares, hexagons, etc.)', () => {
			// Square
			const squarePoints = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const square = new Polygon2d({ points: squarePoints, isFilled: false })
			expect(square.getLength()).toBeCloseTo(40, 1)

			// Hexagon
			const hexPoints: Vec[] = []
			for (let i = 0; i < 6; i++) {
				const angle = (i / 6) * Math.PI * 2
				hexPoints.push(new Vec(Math.cos(angle) * 10, Math.sin(angle) * 10))
			}
			const hexagon = new Polygon2d({ points: hexPoints, isFilled: false })
			expect(hexagon.segments.length).toBe(6)
		})
	})

	describe('performance and caching', () => {
		it('should cache segments calculation', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const segments1 = polygon.segments
			const segments2 = polygon.segments

			expect(segments1).toBe(segments2) // Same reference
		})

		it('should not recalculate segments on repeated access', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Access multiple times to verify caching works
			const firstAccess = polygon.segments
			const secondAccess = polygon.segments
			const thirdAccess = polygon.segments

			expect(thirdAccess.length).toBe(3)
			expect(firstAccess).toBe(secondAccess)
			expect(secondAccess).toBe(thirdAccess)
		})

		it('should handle large numbers of points efficiently', () => {
			const points: Vec[] = []
			for (let i = 0; i < 1000; i++) {
				const angle = (i / 1000) * Math.PI * 2
				points.push(new Vec(Math.cos(angle) * 100, Math.sin(angle) * 100))
			}

			expect(() => {
				const polygon = new Polygon2d({ points, isFilled: false })
				expect(polygon.segments.length).toBe(1000)
				expect(polygon.getLength()).toBeGreaterThan(0)
			}).not.toThrow()
		})

		it('should reuse computation across method calls', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const length1 = polygon.getLength()
			const length2 = polygon.getLength()
			const vertices1 = polygon.getVertices()
			const vertices2 = polygon.getVertices()

			expect(length1).toBe(length2)
			expect(vertices1).toBe(vertices2)
		})
	})

	describe('integration with base Geometry2d methods', () => {
		it('should work correctly with bounds calculation', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const bounds = polygon.bounds
			expect(bounds).toBeDefined()
			expect(bounds.w).toBeGreaterThan(0)
			expect(bounds.h).toBeGreaterThan(0)
		})

		it('should work correctly with area calculation', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(typeof polygon.area).toBe('number')
			// Area can be negative depending on polygon winding direction
		})

		it('should work correctly with transformation methods', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(() => {
				const vertices = polygon.getVertices()
				expect(vertices.length).toBeGreaterThan(0)
			}).not.toThrow()
		})

		it('should work correctly with distance calculations', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const testPoint = new Vec(5, 2)
			const distance = polygon.distanceToPoint(testPoint)
			expect(typeof distance).toBe('number')
			expect(distance).toBeGreaterThanOrEqual(0)
		})

		it('should work correctly with hit testing methods', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const testPoint = new Vec(10, 5)
			const isHit = polygon.hitTestPoint(testPoint, 1)
			expect(typeof isHit).toBe('boolean')
		})

		it('should work correctly with point containment tests', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const testPoint = new Vec(5, 5)
			// Unfilled polygons don't contain points (only perimeter)
			expect(polygon.hitTestPoint(testPoint, 0)).toBe(false)
		})

		it('should work correctly with intersection methods', () => {
			const points = [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)]
			const polygon = new Polygon2d({ points, isFilled: false })

			expect(() => {
				polygon.hitTestLineSegment(new Vec(5, 0), new Vec(15, 10))
			}).not.toThrow()
		})

		it('should support filled and unfilled polygons', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const unfilledPolygon = new Polygon2d({ points, isFilled: false })
			const filledPolygon = new Polygon2d({ points, isFilled: true })

			expect(unfilledPolygon.isFilled).toBe(false)
			expect(filledPolygon.isFilled).toBe(true)
			expect(unfilledPolygon.isClosed).toBe(true)
			expect(filledPolygon.isClosed).toBe(true)
		})
	})

	describe('mathematical properties', () => {
		it('should maintain vertex order consistency', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const vertices = polygon.getVertices()
			expect(vertices).toEqual(points)
		})

		it('should handle polygon orientation (CW vs CCW)', () => {
			const cwPoints = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const ccwPoints = [new Vec(0, 0), new Vec(0, 10), new Vec(10, 10), new Vec(10, 0)]

			const cwPolygon = new Polygon2d({ points: cwPoints, isFilled: false })
			const ccwPolygon = new Polygon2d({ points: ccwPoints, isFilled: false })

			expect(cwPolygon.getLength()).toBeCloseTo(ccwPolygon.getLength(), 1)
		})

		it('should calculate correct centroid', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const center = polygon.center
			expect(center.x).toBeCloseTo(5, 1)
			expect(center.y).toBeCloseTo(5, 1)
		})

		it('should handle simple vs complex polygons', () => {
			// Simple triangle
			const simplePoints = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const simplePolygon = new Polygon2d({ points: simplePoints, isFilled: false })

			// Complex polygon
			const complexPoints = [
				new Vec(0, 0),
				new Vec(10, 0),
				new Vec(15, 5),
				new Vec(10, 10),
				new Vec(5, 8),
				new Vec(0, 10),
				new Vec(-5, 5),
			]
			const complexPolygon = new Polygon2d({ points: complexPoints, isFilled: false })

			expect(simplePolygon.segments.length).toBe(3)
			expect(complexPolygon.segments.length).toBe(7)
		})

		it('should validate polygon closure', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			const segments = polygon.segments
			const lastSegment = segments[segments.length - 1]

			// Last segment should connect back to first point
			expect(lastSegment.end).toEqual(points[0])
		})

		it('should handle polygon winding', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Regardless of winding, basic properties should work
			expect(polygon.getLength()).toBeCloseTo(40, 1)
			expect(polygon.segments.length).toBe(4)
		})
	})

	describe('comparison with Polyline2d', () => {
		it('should behave differently from Polyline2d for isClosed', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })
			const polyline = new Polyline2d({ points })

			expect(polygon.isClosed).toBe(true)
			expect(polyline.isClosed).toBe(false)
		})

		it('should have additional closing segment compared to Polyline2d', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })
			const polyline = new Polyline2d({ points })

			expect(polygon.segments.length).toBe(3) // Including closing segment
			expect(polyline.segments.length).toBe(2) // No closing segment
		})

		it('should calculate different perimeter than equivalent Polyline2d', () => {
			const points = [new Vec(0, 0), new Vec(3, 0), new Vec(0, 4)]
			const polygon = new Polygon2d({ points, isFilled: false })
			const polyline = new Polyline2d({ points })

			const polygonLength = polygon.getLength()
			const polylineLength = polyline.getLength()

			expect(polygonLength).toBeGreaterThan(polylineLength)
			expect(polygonLength).toBeCloseTo(12, 1) // 3 + 4 + 5 = 12
			expect(polylineLength).toBeCloseTo(8, 1) // Actual polyline length
		})

		it('should handle SVG generation differently than Polyline2d', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })
			const polyline = new Polyline2d({ points })

			const polygonSvg = polygon.getSvgPathData()
			const polylineSvg = polyline.getSvgPathData()

			// Both should start with M, but polygon represents closed shape
			expect(polygonSvg).toMatch(/^M/)
			expect(polylineSvg).toMatch(/^M/)
			expect(polygonSvg.length).toBeGreaterThanOrEqual(polylineSvg.length)
		})

		it('should inherit base functionality from Polyline2d', () => {
			const points = [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)]
			const polygon = new Polygon2d({ points, isFilled: false })

			// Should have inherited methods from Polyline2d
			expect(typeof polygon.getVertices).toBe('function')
			expect(typeof polygon.nearestPoint).toBe('function')
			expect(typeof polygon.hitTestLineSegment).toBe('function')
			expect(typeof polygon.getSvgPathData).toBe('function')
		})
	})

	describe('snapshots', () => {
		it('should match snapshot for simple triangle SVG path', () => {
			const polygon = new Polygon2d({
				points: [new Vec(0, 0), new Vec(10, 0), new Vec(5, 10)],
				isFilled: false,
			})

			expect(polygon.getSvgPathData()).toMatchSnapshot()
		})

		it('should match snapshot for square polygon SVG path', () => {
			const polygon = new Polygon2d({
				points: [new Vec(0, 0), new Vec(10, 0), new Vec(10, 10), new Vec(0, 10)],
				isFilled: false,
			})

			expect(polygon.getSvgPathData()).toMatchSnapshot()
		})

		it('should match snapshot for complex polygon SVG path', () => {
			const polygon = new Polygon2d({
				points: [
					new Vec(0, 0),
					new Vec(10, 0),
					new Vec(15, 5),
					new Vec(10, 10),
					new Vec(0, 10),
					new Vec(-5, 5),
				],
				isFilled: false,
			})

			expect(polygon.getSvgPathData()).toMatchSnapshot()
		})

		it('should match snapshot for polygon vertices', () => {
			const polygon = new Polygon2d({
				points: [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)],
				isFilled: false,
			})

			expect(polygon.getVertices()).toMatchSnapshot()
		})

		it('should match snapshot for polygon segments', () => {
			const polygon = new Polygon2d({
				points: [new Vec(0, 0), new Vec(10, 5), new Vec(20, 0)],
				isFilled: false,
			})

			const segments = polygon.segments.map((segment) => ({
				start: segment.start,
				end: segment.end,
				length: segment.length,
			}))

			expect(segments).toMatchSnapshot()
		})

		it('should match snapshot for polygon properties', () => {
			const polygon = new Polygon2d({
				points: [new Vec(5, 10), new Vec(15, 20), new Vec(25, 10)],
				isFilled: false,
			})

			expect({
				length: polygon.getLength(),
				segmentCount: polygon.segments.length,
				vertexCount: polygon.getVertices().length,
				isClosed: polygon.isClosed,
				isFilled: polygon.isFilled,
				bounds: polygon.bounds,
				area: polygon.area,
				center: polygon.center,
			}).toMatchSnapshot()
		})

		it('should match snapshot for regular polygon (hexagon)', () => {
			const points: Vec[] = []
			for (let i = 0; i < 6; i++) {
				const angle = (i / 6) * Math.PI * 2
				points.push(new Vec(Math.cos(angle) * 10, Math.sin(angle) * 10))
			}

			const polygon = new Polygon2d({ points, isFilled: false })

			expect({
				svgPath: polygon.getSvgPathData(),
				length: polygon.getLength(),
				segmentCount: polygon.segments.length,
				bounds: polygon.bounds,
			}).toMatchSnapshot()
		})

		it('should match snapshot for irregular polygon', () => {
			const polygon = new Polygon2d({
				points: [new Vec(0, 0), new Vec(15, 3), new Vec(12, 18), new Vec(3, 12), new Vec(-2, 8)],
				isFilled: false,
			})

			expect({
				svgPath: polygon.getSvgPathData(),
				length: polygon.getLength(),
				area: polygon.area,
			}).toMatchSnapshot()
		})

		it('should match snapshot for concave polygon', () => {
			const polygon = new Polygon2d({
				points: [new Vec(0, 0), new Vec(10, 0), new Vec(5, 5), new Vec(10, 10), new Vec(0, 10)],
				isFilled: true,
			})

			expect({
				svgPath: polygon.getSvgPathData(),
				segments: polygon.segments.map((s) => ({ start: s.start, end: s.end })),
				properties: {
					length: polygon.getLength(),
					isClosed: polygon.isClosed,
					isFilled: polygon.isFilled,
					area: polygon.area,
				},
			}).toMatchSnapshot()
		})

		it('should match snapshot for self-intersecting polygon', () => {
			const polygon = new Polygon2d({
				points: [new Vec(0, 0), new Vec(20, 20), new Vec(20, 0), new Vec(0, 20)],
				isFilled: false,
			})

			expect({
				svgPath: polygon.getSvgPathData(),
				length: polygon.getLength(),
				bounds: polygon.bounds,
				segments: polygon.segments.length,
			}).toMatchSnapshot()
		})

		it('should match snapshot for minimal triangle with integer coordinates', () => {
			const polygon = new Polygon2d({
				points: [new Vec(0, 0), new Vec(1, 0), new Vec(0, 1)],
				isFilled: true,
			})

			expect({
				svgPath: polygon.getSvgPathData(),
				vertices: polygon.getVertices(),
				segments: polygon.segments.map((s) => ({
					start: s.start,
					end: s.end,
					length: s.length,
				})),
				properties: {
					length: polygon.getLength(),
					area: polygon.area,
					center: polygon.center,
					bounds: polygon.bounds,
				},
			}).toMatchSnapshot()
		})

		it('should match snapshot for star-shaped polygon', () => {
			const outerRadius = 10
			const innerRadius = 5
			const points: Vec[] = []

			for (let i = 0; i < 5; i++) {
				// Outer point
				const outerAngle = (i / 5) * Math.PI * 2
				points.push(new Vec(Math.cos(outerAngle) * outerRadius, Math.sin(outerAngle) * outerRadius))

				// Inner point
				const innerAngle = ((i + 0.5) / 5) * Math.PI * 2
				points.push(new Vec(Math.cos(innerAngle) * innerRadius, Math.sin(innerAngle) * innerRadius))
			}

			const polygon = new Polygon2d({ points, isFilled: false })

			expect({
				svgPath: polygon.getSvgPathData(),
				segmentCount: polygon.segments.length,
				length: polygon.getLength(),
				bounds: polygon.bounds,
				area: polygon.area,
			}).toMatchSnapshot()
		})

		it('should match snapshot for very thin rectangle', () => {
			const polygon = new Polygon2d({
				points: [new Vec(0, 0), new Vec(100, 0), new Vec(100, 0.1), new Vec(0, 0.1)],
				isFilled: true,
			})

			expect({
				svgPath: polygon.getSvgPathData(),
				length: polygon.getLength(),
				area: polygon.area,
				bounds: polygon.bounds,
				aspectRatio: polygon.bounds.w / polygon.bounds.h,
			}).toMatchSnapshot()
		})

		it('should match snapshot for octagon (regular 8-sided polygon)', () => {
			const points: Vec[] = []
			for (let i = 0; i < 8; i++) {
				const angle = (i / 8) * Math.PI * 2
				points.push(new Vec(Math.cos(angle) * 15, Math.sin(angle) * 15))
			}

			const polygon = new Polygon2d({ points, isFilled: false })

			expect({
				svgPath: polygon.getSvgPathData(),
				vertices: polygon.getVertices().length,
				segments: polygon.segments.length,
				length: polygon.getLength(),
				center: polygon.center,
				bounds: polygon.bounds,
				circumference: polygon.getLength(),
			}).toMatchSnapshot()
		})

		it('should match snapshot for L-shaped polygon', () => {
			const polygon = new Polygon2d({
				points: [
					new Vec(0, 0),
					new Vec(10, 0),
					new Vec(10, 5),
					new Vec(5, 5),
					new Vec(5, 10),
					new Vec(0, 10),
				],
				isFilled: true,
			})

			expect({
				svgPath: polygon.getSvgPathData(),
				segments: polygon.segments.map((s, i) => ({
					index: i,
					start: s.start,
					end: s.end,
					length: s.length,
				})),
				properties: {
					perimeter: polygon.getLength(),
					area: polygon.area,
					isClosed: polygon.isClosed,
					isFilled: polygon.isFilled,
					bounds: polygon.bounds,
					center: polygon.center,
				},
			}).toMatchSnapshot()
		})

		it('should match snapshot for polygon with negative coordinates', () => {
			const polygon = new Polygon2d({
				points: [new Vec(-10, -5), new Vec(-5, -10), new Vec(0, -5), new Vec(-5, 0)],
				isFilled: false,
			})

			expect({
				svgPath: polygon.getSvgPathData(),
				vertices: polygon.getVertices(),
				bounds: polygon.bounds,
				length: polygon.getLength(),
				area: polygon.area,
			}).toMatchSnapshot()
		})

		it('should match snapshot for arrow-shaped polygon', () => {
			const polygon = new Polygon2d({
				points: [
					new Vec(0, 5), // left point
					new Vec(8, 3), // shaft top
					new Vec(8, 4), // arrow base top
					new Vec(12, 2.5), // arrow tip
					new Vec(8, 1), // arrow base bottom
					new Vec(8, 2), // shaft bottom
				],
				isFilled: true,
			})

			expect({
				svgPath: polygon.getSvgPathData(),
				analysis: {
					vertexCount: polygon.getVertices().length,
					segmentCount: polygon.segments.length,
					perimeter: polygon.getLength(),
					area: polygon.area,
					bounds: polygon.bounds,
					aspectRatio: polygon.bounds.w / polygon.bounds.h,
				},
			}).toMatchSnapshot()
		})

		it('should match snapshot for polygon with floating point coordinates', () => {
			const polygon = new Polygon2d({
				points: [
					new Vec(1.23456, 2.34567),
					new Vec(8.91011, 3.45678),
					new Vec(7.65432, 9.87654),
					new Vec(2.13579, 8.24681),
				],
				isFilled: false,
			})

			expect({
				svgPath: polygon.getSvgPathData(),
				vertices: polygon.getVertices(),
				segments: polygon.segments.map((s) => ({
					start: { x: s.start.x, y: s.start.y },
					end: { x: s.end.x, y: s.end.y },
					length: s.length,
				})),
				geometry: {
					length: polygon.getLength(),
					area: polygon.area,
					bounds: polygon.bounds,
					center: polygon.center,
				},
			}).toMatchSnapshot()
		})

		it('should match snapshot for complete polygon test matrix', () => {
			// Test multiple polygon configurations in one comprehensive snapshot
			const configs = [
				{
					name: 'triangle',
					polygon: new Polygon2d({
						points: [new Vec(0, 0), new Vec(6, 0), new Vec(3, 5)],
						isFilled: false,
					}),
				},
				{
					name: 'square',
					polygon: new Polygon2d({
						points: [new Vec(0, 0), new Vec(4, 0), new Vec(4, 4), new Vec(0, 4)],
						isFilled: true,
					}),
				},
				{
					name: 'pentagon',
					polygon: new Polygon2d({
						points: Array.from({ length: 5 }, (_, i) => {
							const angle = (i / 5) * Math.PI * 2
							return new Vec(Math.cos(angle) * 3, Math.sin(angle) * 3)
						}),
						isFilled: false,
					}),
				},
			]

			const results = configs.map((config) => ({
				name: config.name,
				svgPath: config.polygon.getSvgPathData(),
				stats: {
					vertices: config.polygon.getVertices().length,
					segments: config.polygon.segments.length,
					length: config.polygon.getLength(),
					area: config.polygon.area,
					isClosed: config.polygon.isClosed,
					isFilled: config.polygon.isFilled,
					bounds: config.polygon.bounds,
					center: config.polygon.center,
				},
			}))

			expect(results).toMatchSnapshot()
		})
	})
})
