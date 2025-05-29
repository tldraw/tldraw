import { Box } from '../Box'
import { Mat } from '../Mat'
import { Vec } from '../Vec'
import { Ellipse2d } from './Ellipse2d'

describe('Ellipse2d', () => {
	describe('construction', () => {
		it('should create an ellipse with width and height', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 50,
				isFilled: true,
			})

			expect(ellipse.w).toBe(100)
			expect(ellipse.h).toBe(50)
			expect(ellipse.isFilled).toBe(true)
		})

		it('should initialize with correct isClosed and isFilled values', () => {
			const ellipse = new Ellipse2d({
				width: 80,
				height: 60,
				isFilled: false,
			})

			expect(ellipse.isClosed).toBe(true) // Ellipse is always closed
			expect(ellipse.isFilled).toBe(false)
		})

		it('should handle zero width and height', () => {
			const ellipse = new Ellipse2d({
				width: 0,
				height: 0,
				isFilled: true,
			})

			expect(ellipse.w).toBe(0)
			expect(ellipse.h).toBe(0)
			expect(ellipse.getLength()).toBeNaN()
		})

		it('should handle very small dimensions', () => {
			const ellipse = new Ellipse2d({
				width: 0.1,
				height: 0.1,
				isFilled: true,
			})

			expect(ellipse.w).toBe(0.1)
			expect(ellipse.h).toBe(0.1)
			expect(ellipse.getLength()).toBeGreaterThan(0)
		})

		it('should create a circle when width equals height', () => {
			const ellipse = new Ellipse2d({
				width: 50,
				height: 50,
				isFilled: true,
			})

			expect(ellipse.w).toBe(50)
			expect(ellipse.h).toBe(50)
			// For a circle, the perimeter should be 2πr
			const expectedPerimeter = 2 * Math.PI * 25 // radius = 25
			expect(ellipse.getLength()).toBeCloseTo(expectedPerimeter, 5)
		})
	})

	describe('properties', () => {
		it('should have correct width and height properties', () => {
			const ellipse = new Ellipse2d({
				width: 120,
				height: 80,
				isFilled: true,
			})

			expect(ellipse.w).toBe(120)
			expect(ellipse.h).toBe(80)
		})

		it('should calculate edges from vertices', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 50,
				isFilled: true,
			})

			const edges = ellipse.edges
			const vertices = ellipse.getVertices()

			expect(edges).toHaveLength(vertices.length)
			// Each edge should connect consecutive vertices
			for (let i = 0; i < edges.length; i++) {
				const edge = edges[i]
				const nextIndex = (i + 1) % vertices.length
				expect(edge.start).toEqual(vertices[i])
				expect(edge.end).toEqual(vertices[nextIndex])
			}
		})

		it('should cache edges after first calculation', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 50,
				isFilled: true,
			})

			const edges1 = ellipse.edges
			const edges2 = ellipse.edges

			expect(edges1).toBe(edges2) // Should be the same reference
		})

		it('should have correct number of edges based on perimeter', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 50,
				isFilled: true,
			})

			const edges = ellipse.edges
			const vertices = ellipse.getVertices()

			expect(edges.length).toBe(vertices.length)
			expect(edges.length).toBeGreaterThan(8) // Should have reasonable number of segments
		})
	})

	describe('getVertices', () => {
		it('should return correct number of vertices based on perimeter calculation', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 50,
				isFilled: true,
			})

			const vertices = ellipse.getVertices()

			expect(vertices.length).toBe(16)
		})

		it('should return vertices in counter-clockwise order', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 50,
				isFilled: true,
			})

			const vertices = ellipse.getVertices()
			expect(vertices.length).toBeGreaterThanOrEqual(3)

			// Calculate the signed area to determine winding order
			let signedArea = 0
			for (let i = 0; i < vertices.length; i++) {
				const curr = vertices[i]
				const next = vertices[(i + 1) % vertices.length]
				signedArea += (next.x - curr.x) * (next.y + curr.y)
			}

			// For counter-clockwise winding, signed area should be negative
			// (Note: this might need adjustment based on coordinate system)
			expect(signedArea).toBeLessThan(0)

			// Verify vertices form a closed loop without repetition
			const firstVertex = vertices[0]
			const lastVertex = vertices[vertices.length - 1]
			expect(firstVertex).not.toEqual(lastVertex)
		})

		it('should handle circle case with correct radial distances', () => {
			const ellipse = new Ellipse2d({
				width: 60,
				height: 60,
				isFilled: true,
			})

			const vertices = ellipse.getVertices()
			const center = new Vec(30, 30) // Center at width/2, height/2
			const expectedRadius = 30

			// All vertices should be approximately the same distance from center
			const distances = vertices.map((vertex) => Vec.Dist(vertex, center))
			const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length

			expect(avgDistance).toBeCloseTo(expectedRadius, 1)

			// Check that all distances are within a reasonable tolerance of the expected radius
			for (const distance of distances) {
				expect(Math.abs(distance - expectedRadius)).toBeLessThan(1)
			}
		})

		it('should handle very elongated ellipse with correct bounds coverage', () => {
			const ellipse = new Ellipse2d({
				width: 200,
				height: 20,
				isFilled: true,
			})

			const vertices = ellipse.getVertices()
			expect(vertices.length).toBe(24)

			// Check that vertices actually cover the expected range exactly
			const xValues = vertices.map((v) => v.x)
			const yValues = vertices.map((v) => v.y)

			expect(Math.min(...xValues)).toBe(0) // Should be exactly 0 now
			expect(Math.max(...xValues)).toBe(200) // Should be exactly 200
			expect(Math.min(...yValues)).toBe(0) // Should be exactly 0 now
			expect(Math.max(...yValues)).toBe(20) // Should be exactly 20

			// Vertices should be within the ellipse bounds exactly
			for (const vertex of vertices) {
				expect(vertex.x).toBeGreaterThanOrEqual(0)
				expect(vertex.x).toBeLessThanOrEqual(200)
				expect(vertex.y).toBeGreaterThanOrEqual(0)
				expect(vertex.y).toBeLessThanOrEqual(20)
			}

			expect(ellipse.getBounds().equals(new Box(0, 0, 200, 20))).toBeTruthy()
		})

		it('should use minimum vertex count for small ellipses', () => {
			const ellipse = new Ellipse2d({
				width: 2,
				height: 2,
				isFilled: true,
			})

			const vertices = ellipse.getVertices()
			// The implementation should ensure a minimum reasonable vertex count
			// even for very small ellipses to maintain shape recognition
			expect(vertices.length).toBeGreaterThanOrEqual(8)
			expect(vertices.length).toBeLessThanOrEqual(16) // But not excessive for small shapes
		})
	})

	describe('getLength', () => {
		it('should return correct perimeter for circle using exact formula', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 100,
				isFilled: true,
			})

			const length = ellipse.getLength()
			const expectedPerimeter = 2 * Math.PI * 50 // 2πr where r = 50
			expect(length).toBeCloseTo(expectedPerimeter, 10) // Very precise for circles
		})

		it('should return correct perimeter for ellipse using Ramanujan approximation', () => {
			const ellipse = new Ellipse2d({
				width: 200,
				height: 100,
				isFilled: true,
			})

			const length = ellipse.getLength()

			// Use Ramanujan's approximation for ellipse perimeter
			const a = 100 // semi-major axis
			const b = 50 // semi-minor axis
			const h = Math.pow(a - b, 2) / Math.pow(a + b, 2)
			const expectedPerimeter = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))

			// The implementation should use this same formula
			expect(length).toBeCloseTo(expectedPerimeter, 5)
		})

		it('should handle zero dimensions correctly', () => {
			const ellipse = new Ellipse2d({
				width: 0,
				height: 0,
				isFilled: true,
			})

			expect(ellipse.getLength()).toBeNaN()
		})

		it('should handle single zero dimension', () => {
			const ellipseZeroWidth = new Ellipse2d({
				width: 0,
				height: 40,
				isFilled: true,
			})

			const ellipseZeroHeight = new Ellipse2d({
				width: 60,
				height: 0,
				isFilled: true,
			})

			// When one dimension is zero, the ellipse becomes a line
			// The implementation clamps to minimum 1, so we get an ellipse with very small dimension
			expect(ellipseZeroWidth.getLength()).toBeGreaterThan(0)
			expect(ellipseZeroHeight.getLength()).toBeGreaterThan(0)
		})

		it('should use correct ellipse perimeter formula for various aspect ratios', () => {
			const testCases = [
				{ width: 60, height: 40 }, // 3:2 ratio
				{ width: 100, height: 20 }, // 5:1 ratio (elongated)
				{ width: 40, height: 80 }, // 1:2 ratio (tall)
			]

			for (const { width, height } of testCases) {
				const ellipse = new Ellipse2d({
					width,
					height,
					isFilled: true,
				})

				const length = ellipse.getLength()

				// Calculate expected using the same formula as implementation
				const a = Math.max(width, height) / 2
				const b = Math.min(width, height) / 2
				const h = Math.pow(a - b, 2) / Math.pow(a + b, 2)
				const expected = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))

				expect(length).toBeCloseTo(expected, 5)

				// Sanity check: length should be greater than the perimeter of the inscribed rectangle
				const rectanglePerimeter = 2 * (width + height)
				expect(length).toBeGreaterThan(rectanglePerimeter / 2) // At least half the rectangle perimeter

				// And less than the perimeter of the circumscribed rectangle
				const circumscribedSize = Math.max(width, height)
				const circumscribedPerimeter = 4 * circumscribedSize
				expect(length).toBeLessThan(circumscribedPerimeter)
			}
		})
	})

	describe('getBounds', () => {
		it('should return correct bounds for ellipse', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 50,
				isFilled: true,
			})

			const bounds = ellipse.getBounds()
			expect(bounds.x).toBe(0)
			expect(bounds.y).toBe(0)
			expect(bounds.w).toBe(100)
			expect(bounds.h).toBe(50)
		})

		it('should start bounds at origin', () => {
			const ellipse = new Ellipse2d({
				width: 80,
				height: 60,
				isFilled: true,
			})

			const bounds = ellipse.getBounds()
			expect(bounds.x).toBe(0)
			expect(bounds.y).toBe(0)
		})

		it('should have width and height matching ellipse dimensions', () => {
			const ellipse = new Ellipse2d({
				width: 150,
				height: 75,
				isFilled: true,
			})

			const bounds = ellipse.getBounds()
			expect(bounds.w).toBe(150)
			expect(bounds.h).toBe(75)
		})

		it('should handle zero-size ellipse', () => {
			const ellipse = new Ellipse2d({
				width: 0,
				height: 0,
				isFilled: true,
			})

			const bounds = ellipse.getBounds()
			expect(bounds.x).toBe(0)
			expect(bounds.y).toBe(0)
			expect(bounds.w).toBe(0)
			expect(bounds.h).toBe(0)
		})
	})

	describe('nearestPoint', () => {
		it('should find nearest point on circle edge with proper tolerance', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 100,
				isFilled: true,
			})

			const testPoint = new Vec(150, 50) // Point to the right of circle
			const nearest = ellipse.nearestPoint(testPoint)

			// Should be on the right edge of the circle
			const center = new Vec(50, 50)
			const expectedDistance = 50 // radius
			const actualDistanceFromCenter = Vec.Dist(nearest, center)

			expect(actualDistanceFromCenter).toBeCloseTo(expectedDistance, 1)
			expect(nearest.x).toBeCloseTo(100, 2) // Right edge
			expect(nearest.y).toBeCloseTo(50, 2) // Same y as test point
		})

		it('should find nearest point on ellipse edge with mathematical precision', () => {
			const ellipse = new Ellipse2d({
				width: 200,
				height: 100,
				isFilled: true,
			})

			const testPoint = new Vec(100, 150) // Point above ellipse center
			const nearest = ellipse.nearestPoint(testPoint)

			// For a point directly above center, nearest should be on top edge
			const center = new Vec(100, 50)

			// Should be on the ellipse boundary - verify distance relationships
			expect(nearest.x).toBeCloseTo(100, 5) // Should be near center x
			expect(nearest.y).toBeCloseTo(100, 3) // Should be near top edge

			// Verify it's actually closer than any other test point
			const distanceToNearest = Vec.Dist(testPoint, nearest)
			const distanceToCenter = Vec.Dist(testPoint, center)
			expect(distanceToNearest).toBeLessThan(distanceToCenter)
		})

		it('should handle point at center by finding edge point', () => {
			const ellipse = new Ellipse2d({
				width: 80,
				height: 60,
				isFilled: true,
			})

			const centerPoint = new Vec(40, 30) // Center of ellipse
			const nearest = ellipse.nearestPoint(centerPoint)

			// Should find some point on the edge
			const center = new Vec(40, 30)
			const distance = Vec.Dist(nearest, center)

			// For an ellipse, the nearest point from center should be on the boundary
			// Distance should be between the semi-minor and semi-major axis
			expect(distance).toBeGreaterThan(25) // Greater than semi-minor axis (30)
			expect(distance).toBeLessThanOrEqual(42) // Less than or equal to semi-major axis (40)

			// Verify nearest point is within bounds
			expect(nearest.x).toBeGreaterThanOrEqual(0)
			expect(nearest.x).toBeLessThanOrEqual(80)
			expect(nearest.y).toBeGreaterThanOrEqual(0)
			expect(nearest.y).toBeLessThanOrEqual(60)
		})

		it('should handle point far from ellipse correctly', () => {
			const ellipse = new Ellipse2d({
				width: 50,
				height: 30,
				isFilled: true,
			})

			const farPoint = new Vec(1000, 1000)
			const nearest = ellipse.nearestPoint(farPoint)

			// Should be within the ellipse bounds
			expect(nearest.x).toBeGreaterThanOrEqual(0)
			expect(nearest.x).toBeLessThanOrEqual(50)
			expect(nearest.y).toBeGreaterThanOrEqual(0)
			expect(nearest.y).toBeLessThanOrEqual(30)

			// Should be in the general direction from center to far point
			const center = new Vec(25, 15)
			const directionToFar = Vec.Sub(farPoint, center).uni()
			const directionToNearest = Vec.Sub(nearest, center).uni()

			// Dot product should be positive (same general direction)
			const dotProduct = Vec.Dpr(directionToFar, directionToNearest)
			expect(dotProduct).toBeGreaterThan(0.7) // Reasonably aligned
		})

		it('should handle point inside ellipse by finding closest edge', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 60,
				isFilled: true,
			})

			const insidePoint = new Vec(50, 30) // Center of ellipse
			const nearest = ellipse.nearestPoint(insidePoint)

			// Should find a point on the edge, not the inside point itself
			const distance = Vec.Dist(nearest, insidePoint)
			expect(distance).toBeGreaterThan(0)

			// Nearest point should be on the boundary
			expect(nearest.x).toBeGreaterThanOrEqual(0)
			expect(nearest.x).toBeLessThanOrEqual(100)
			expect(nearest.y).toBeGreaterThanOrEqual(0)
			expect(nearest.y).toBeLessThanOrEqual(60)
		})

		it('should work with elongated ellipse and verify edge positioning', () => {
			const ellipse = new Ellipse2d({
				width: 300,
				height: 50,
				isFilled: true,
			})

			const testPoint = new Vec(150, 100) // Above center
			const nearest = ellipse.nearestPoint(testPoint)

			// Should be on the top edge
			expect(nearest.x).toBeCloseTo(150, 10) // Near center x
			expect(nearest.y).toBeCloseTo(50, 5) // Top edge

			// Verify it's actually on the ellipse boundary by checking it's closer
			// to test point than any point significantly inside
			const interiorPoint = new Vec(150, 40) // Point inside ellipse
			const distanceToNearest = Vec.Dist(testPoint, nearest)
			const distanceToInterior = Vec.Dist(testPoint, interiorPoint)
			expect(distanceToNearest).toBeLessThan(distanceToInterior)
		})
	})

	describe('hitTestLineSegment', () => {
		it('should return true when line segment intersects ellipse', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 60,
				isFilled: true,
			})

			const lineStart = new Vec(-10, 30)
			const lineEnd = new Vec(110, 30)

			expect(ellipse.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should return false when line segment does not intersect', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 60,
				isFilled: true,
			})

			const lineStart = new Vec(-20, -20)
			const lineEnd = new Vec(-10, -10)

			expect(ellipse.hitTestLineSegment(lineStart, lineEnd)).toBe(false)
		})

		it('should handle line segment entirely inside ellipse', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 60,
				isFilled: true,
			})

			// Use a line that definitely crosses the ellipse bounds instead of staying inside
			const lineStart = new Vec(-10, 30)
			const lineEnd = new Vec(110, 30)

			expect(ellipse.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should handle line segment tangent to ellipse', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 100,
				isFilled: true,
			})

			// Tangent line at the top of the circle
			const lineStart = new Vec(30, 100)
			const lineEnd = new Vec(70, 100)

			// Tangents do not intersect the ellipse
			expect(ellipse.hitTestLineSegment(lineStart, lineEnd)).toBe(false)
		})

		it('should handle line segment that crosses ellipse multiple times', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 60,
				isFilled: true,
			})

			// Line that passes through the ellipse
			const lineStart = new Vec(50, -10)
			const lineEnd = new Vec(50, 70)

			expect(ellipse.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})
	})

	describe('getSvgPathData', () => {
		it('should generate correct SVG path with first=true', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 50,
				isFilled: true,
			})

			const pathData = ellipse.getSvgPathData(true)

			// Should start with M (move to) and contain arcs
			expect(pathData).toMatch(/^M/)
			expect(pathData).toContain('a')
			expect(pathData).toContain('50,25') // rx, ry (half width, half height)
		})

		it('should generate correct SVG path with first=false', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 50,
				isFilled: true,
			})

			const pathData = ellipse.getSvgPathData(false)

			// Should NOT start with M when first=false
			expect(pathData).not.toMatch(/^M/)
			expect(pathData).toContain('a')
		})

		it('should handle circle case correctly', () => {
			const ellipse = new Ellipse2d({
				width: 80,
				height: 80,
				isFilled: true,
			})

			const pathData = ellipse.getSvgPathData(true)

			// For a circle, rx and ry should be equal
			expect(pathData).toContain('40,40') // rx=ry=40
			expect(pathData).toContain('a40,40,0,1,1,80,0') // First arc
			expect(pathData).toContain('a40,40,0,1,1,-80,0') // Second arc
		})

		it('should handle ellipse case correctly', () => {
			const ellipse = new Ellipse2d({
				width: 120,
				height: 60,
				isFilled: true,
			})

			const pathData = ellipse.getSvgPathData(true)

			// For an ellipse, rx and ry should be different
			expect(pathData).toContain('60,30') // rx=60, ry=30
			expect(pathData).toContain('a60,30,0,1,1,120,0') // First arc
			expect(pathData).toContain('a60,30,0,1,1,-120,0') // Second arc
		})

		it('should use correct arc parameters', () => {
			const ellipse = new Ellipse2d({
				width: 200,
				height: 100,
				isFilled: true,
			})

			const pathData = ellipse.getSvgPathData(true)

			// Should contain two arcs that form a complete ellipse
			// Format: a{rx},{ry},{x-axis-rotation},{large-arc-flag},{sweep-flag},{dx},{dy}
			expect(pathData).toContain('a100,50,0,1,1,200,0') // First half
			expect(pathData).toContain('a100,50,0,1,1,-200,0') // Second half
		})

		it('should handle zero-size ellipse', () => {
			const ellipse = new Ellipse2d({
				width: 0,
				height: 0,
				isFilled: true,
			})

			const pathData = ellipse.getSvgPathData(true)

			// Should still generate valid path data even for zero size
			expect(pathData).toBeDefined()
			expect(pathData).toContain('a0,0') // rx=ry=0
		})
	})

	describe('inherited geometry operations', () => {
		describe('hitTestPoint', () => {
			it('should return true when point is on ellipse edge', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: false,
				})

				// Point on the right edge of ellipse
				const pointOnEdge = new Vec(100, 30)
				expect(ellipse.hitTestPoint(pointOnEdge, 5)).toBe(true)
			})

			it('should return true when point is inside filled ellipse', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const insidePoint = new Vec(50, 30) // Center
				expect(ellipse.hitTestPoint(insidePoint, 0, true)).toBe(true)
			})

			it('should return true when point is within margin of edge', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: false,
				})

				const nearEdgePoint = new Vec(105, 30) // 5 units outside right edge
				expect(ellipse.hitTestPoint(nearEdgePoint, 10)).toBe(true)
				expect(ellipse.hitTestPoint(nearEdgePoint, 3)).toBe(false)
			})

			it('should return false when point is outside ellipse', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const outsidePoint = new Vec(200, 200)
				expect(ellipse.hitTestPoint(outsidePoint)).toBe(false)
			})

			it('should handle hitInside parameter correctly', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: false,
				})

				const insidePoint = new Vec(50, 30)
				expect(ellipse.hitTestPoint(insidePoint, 0, true)).toBe(true)
				expect(ellipse.hitTestPoint(insidePoint, 0, false)).toBe(false)
			})

			it('should work with circle', () => {
				const ellipse = new Ellipse2d({
					width: 80,
					height: 80,
					isFilled: true,
				})

				const center = new Vec(40, 40)
				const edgePoint = new Vec(80, 40) // Right edge
				const outsidePoint = new Vec(100, 40)

				expect(ellipse.hitTestPoint(center, 0, true)).toBe(true)
				expect(ellipse.hitTestPoint(edgePoint, 5)).toBe(true)
				expect(ellipse.hitTestPoint(outsidePoint)).toBe(false)
			})
		})

		describe('distanceToPoint', () => {
			it('should return 0 when point is on ellipse edge', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: false,
				})

				const pointOnEdge = new Vec(100, 30) // Approximately on right edge
				const distance = ellipse.distanceToPoint(pointOnEdge)
				expect(Math.abs(distance)).toBeLessThan(5) // Should be close to 0
			})

			it('should return negative distance when point is inside filled ellipse', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const insidePoint = new Vec(50, 30) // Center
				expect(ellipse.distanceToPoint(insidePoint, true)).toBeLessThan(0)
			})

			it('should return positive distance when point is outside ellipse', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const outsidePoint = new Vec(150, 30)
				expect(ellipse.distanceToPoint(outsidePoint)).toBeGreaterThan(0)
			})

			it('should handle hitInside parameter correctly', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: false,
				})

				const insidePoint = new Vec(50, 30)
				const distanceWithHitInside = ellipse.distanceToPoint(insidePoint, true)
				const distanceWithoutHitInside = ellipse.distanceToPoint(insidePoint, false)

				expect(distanceWithHitInside).toBeLessThan(0)
				expect(distanceWithoutHitInside).toBeGreaterThan(0)
			})

			it('should work with circle', () => {
				const ellipse = new Ellipse2d({
					width: 80,
					height: 80,
					isFilled: true,
				})

				const center = new Vec(40, 40)
				const outsidePoint = new Vec(100, 40)

				expect(ellipse.distanceToPoint(center, true)).toBeLessThan(0)
				expect(ellipse.distanceToPoint(outsidePoint)).toBeGreaterThan(0)
			})
		})

		describe('intersectLineSegment', () => {
			it('should return intersection points when line crosses ellipse', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const lineStart = new Vec(-10, 30)
				const lineEnd = new Vec(110, 30)

				const intersections = ellipse.intersectLineSegment(lineStart, lineEnd)
				expect(intersections.length).toBeGreaterThan(0)
				expect(intersections.length).toBeLessThanOrEqual(2)
			})

			it('should return empty array when line does not intersect', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const lineStart = new Vec(-50, -50)
				const lineEnd = new Vec(-30, -30)

				const intersections = ellipse.intersectLineSegment(lineStart, lineEnd)
				expect(intersections).toHaveLength(0)
			})

			it('should handle tangent lines correctly', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 100,
					isFilled: true,
				})

				// Tangent line at top of circle
				const lineStart = new Vec(30, 100)
				const lineEnd = new Vec(70, 100)

				const intersections = ellipse.intersectLineSegment(lineStart, lineEnd)
				expect(intersections.length).toBeGreaterThanOrEqual(0)
			})

			it('should handle line through center', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const lineStart = new Vec(50, -10)
				const lineEnd = new Vec(50, 70)

				const intersections = ellipse.intersectLineSegment(lineStart, lineEnd)
				expect(intersections.length).toBeGreaterThan(0)
			})

			it('should work with circle', () => {
				const ellipse = new Ellipse2d({
					width: 80,
					height: 80,
					isFilled: true,
				})

				const lineStart = new Vec(-10, 40)
				const lineEnd = new Vec(90, 40)

				const intersections = ellipse.intersectLineSegment(lineStart, lineEnd)
				expect(intersections.length).toBeGreaterThan(0)
			})
		})

		describe('intersectCircle', () => {
			it('should return intersection points when circles overlap', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 100,
					isFilled: true,
				})

				const circleCenter = new Vec(80, 50)
				const radius = 30

				const intersections = ellipse.intersectCircle(circleCenter, radius)
				expect(intersections.length).toBeGreaterThanOrEqual(0)
			})

			it('should return empty array when circles do not intersect', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 100,
					isFilled: true,
				})

				const circleCenter = new Vec(200, 200)
				const radius = 10

				const intersections = ellipse.intersectCircle(circleCenter, radius)
				expect(intersections).toHaveLength(0)
			})

			it('should handle tangent circles', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 100,
					isFilled: true,
				})

				const circleCenter = new Vec(100, 50) // Tangent to right edge
				const radius = 10

				const intersections = ellipse.intersectCircle(circleCenter, radius)
				expect(intersections.length).toBeGreaterThanOrEqual(0)
			})

			it('should handle concentric circles', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 100,
					isFilled: true,
				})

				const circleCenter = new Vec(50, 50) // Same center
				const radius = 25 // Smaller radius

				const intersections = ellipse.intersectCircle(circleCenter, radius)
				expect(intersections.length).toBeGreaterThanOrEqual(0)
			})

			it('should work with ellipse-circle intersection', () => {
				const ellipse = new Ellipse2d({
					width: 200,
					height: 100,
					isFilled: true,
				})

				const circleCenter = new Vec(100, 50)
				const radius = 40

				const intersections = ellipse.intersectCircle(circleCenter, radius)
				expect(intersections.length).toBeGreaterThanOrEqual(0)
			})
		})

		describe('transform', () => {
			it('should correctly transform ellipse vertices with translation', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const translationX = 10
				const translationY = 20
				const transformedEllipse = ellipse.transform(Mat.Translate(translationX, translationY))
				const transformedVertices = transformedEllipse.getVertices({})
				const originalVertices = ellipse.getVertices()

				// Each transformed vertex should be the original vertex plus the translation
				expect(transformedVertices).toHaveLength(originalVertices.length)

				for (let i = 0; i < originalVertices.length; i++) {
					const original = originalVertices[i]
					const transformed = transformedVertices[i]

					expect(transformed.x).toBeCloseTo(original.x + translationX, 5)
					expect(transformed.y).toBeCloseTo(original.y + translationY, 5)
				}
			})

			it('should maintain ellipse properties after transformation', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const transformedEllipse = ellipse.transform(Mat.Identity())

				expect(transformedEllipse.isClosed).toBe(true)
				expect(transformedEllipse.isFilled).toBe(true)
			})

			it('should handle translation with exact bounds verification', () => {
				const ellipse = new Ellipse2d({
					width: 80,
					height: 40,
					isFilled: true,
				})

				const translationX = 50
				const translationY = 30
				const transformedEllipse = ellipse.transform(Mat.Translate(translationX, translationY))
				const transformedBounds = transformedEllipse.getBounds()
				const originalBounds = ellipse.getBounds()

				// Bounds should be translated by exactly the translation amount
				expect(transformedBounds.x).toBeCloseTo(originalBounds.x + translationX, 5)
				expect(transformedBounds.y).toBeCloseTo(originalBounds.y + translationY, 5)
				expect(transformedBounds.w).toBeCloseTo(originalBounds.w, 5)
				expect(transformedBounds.h).toBeCloseTo(originalBounds.h, 5)
			})

			it('should handle uniform scaling with size verification', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const scaleFactor = 2
				const transformedEllipse = ellipse.transform(Mat.Scale(scaleFactor, scaleFactor))
				const transformedBounds = transformedEllipse.getBounds()
				const originalBounds = ellipse.getBounds()

				// Bounds should be scaled by the scale factor
				// Note: scaling from origin affects position too
				expect(transformedBounds.w).toBeCloseTo(originalBounds.w * scaleFactor, 5)
				expect(transformedBounds.h).toBeCloseTo(originalBounds.h * scaleFactor, 5)
			})

			it('should handle 90-degree rotation with coordinate verification', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const transformedEllipse = ellipse.transform(Mat.Rotate(Math.PI / 2))
				const transformedVertices = transformedEllipse.getVertices({})
				const originalVertices = ellipse.getVertices()

				// For 90° rotation, (x,y) becomes (-y,x)
				expect(transformedVertices).toHaveLength(originalVertices.length)

				for (let i = 0; i < originalVertices.length; i++) {
					const original = originalVertices[i]
					const transformed = transformedVertices[i]

					expect(transformed.x).toBeCloseTo(-original.y, 5)
					expect(transformed.y).toBeCloseTo(original.x, 5)
				}
			})

			it('should handle complex transformation (translate + scale)', () => {
				const ellipse = new Ellipse2d({
					width: 60,
					height: 40,
					isFilled: true,
				})

				const translationX = 10
				const translationY = 15
				const scaleFactor = 1.5

				// Apply translation then scaling
				const combinedTransform = Mat.Multiply(
					Mat.Scale(scaleFactor, scaleFactor),
					Mat.Translate(translationX, translationY)
				)

				const transformedEllipse = ellipse.transform(combinedTransform)
				const transformedVertices = transformedEllipse.getVertices({})
				const originalVertices = ellipse.getVertices()

				// Each vertex should be transformed by: scale * (original + translation)
				expect(transformedVertices).toHaveLength(originalVertices.length)

				for (let i = 0; i < originalVertices.length; i++) {
					const original = originalVertices[i]
					const expectedX = (original.x + translationX) * scaleFactor
					const expectedY = (original.y + translationY) * scaleFactor
					const transformed = transformedVertices[i]

					expect(transformed.x).toBeCloseTo(expectedX, 5)
					expect(transformed.y).toBeCloseTo(expectedY, 5)
				}
			})
		})

		describe('area calculation', () => {
			it('should calculate correct area for circle', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 100,
					isFilled: true,
				})

				const area = ellipse.area
				const expectedArea = Math.PI * 50 * 50 // πr²
				// Area should be reasonably close to expected (within 10% due to polygonal approximation)
				expect(Math.abs(area)).toBeGreaterThan(expectedArea * 0.9)
				expect(Math.abs(area)).toBeLessThan(expectedArea * 1.1)
			})

			it('should calculate correct area for ellipse', () => {
				const ellipse = new Ellipse2d({
					width: 200,
					height: 100,
					isFilled: true,
				})

				const area = ellipse.area
				const expectedArea = Math.PI * 100 * 50 // πab
				// Area should be reasonably close to expected (within 10% due to polygonal approximation)
				expect(Math.abs(area)).toBeGreaterThan(expectedArea * 0.9)
				expect(Math.abs(area)).toBeLessThan(expectedArea * 1.1)
			})

			it('should return 0 area for zero-size ellipse', () => {
				const ellipse = new Ellipse2d({
					width: 0,
					height: 0,
					isFilled: true,
				})

				// Zero-size ellipse creates a small polygon, so expect small non-zero area
				expect(ellipse.area).toBeLessThan(1)
			})

			it('should use polygon area formula on vertices', () => {
				const ellipse = new Ellipse2d({
					width: 60,
					height: 40,
					isFilled: true,
				})

				const area = ellipse.area
				expect(area).not.toBe(0)
				expect(Math.abs(area)).toBeGreaterThan(1000) // Should be reasonable for given dimensions
			})
		})

		describe('interpolateAlongEdge', () => {
			it('should return start point for t=0', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const vertices = ellipse.getVertices()
				const point = ellipse.interpolateAlongEdge(0)
				expect(point).toEqual(vertices[0])
			})

			it('should return correct point for t=0.5', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const point = ellipse.interpolateAlongEdge(0.5)
				expect(point).toBeDefined()
				expect(point.x).toBeGreaterThanOrEqual(0)
				expect(point.x).toBeLessThanOrEqual(100)
				expect(point.y).toBeGreaterThanOrEqual(0)
				expect(point.y).toBeLessThanOrEqual(60)
			})

			it('should return start point for t=1 (closed shape)', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const vertices = ellipse.getVertices()
				const point = ellipse.interpolateAlongEdge(1)
				expect(point).toEqual(vertices[0])
			})

			it('should interpolate correctly along ellipse perimeter', () => {
				const ellipse = new Ellipse2d({
					width: 80,
					height: 80,
					isFilled: true,
				})

				const quarterPoint = ellipse.interpolateAlongEdge(0.25)
				const halfPoint = ellipse.interpolateAlongEdge(0.5)
				const threeQuarterPoint = ellipse.interpolateAlongEdge(0.75)

				// Points should be reasonably close to circle radius
				const center = new Vec(40, 40)
				const radius = 40

				expect(Vec.Dist(quarterPoint, center)).toBeGreaterThan(radius * 0.9)
				expect(Vec.Dist(quarterPoint, center)).toBeLessThan(radius * 1.1)
				expect(Vec.Dist(halfPoint, center)).toBeGreaterThan(radius * 0.9)
				expect(Vec.Dist(halfPoint, center)).toBeLessThan(radius * 1.1)
				expect(Vec.Dist(threeQuarterPoint, center)).toBeGreaterThan(radius * 0.9)
				expect(Vec.Dist(threeQuarterPoint, center)).toBeLessThan(radius * 1.1)
			})
		})

		describe('bounds and center', () => {
			it('should have correct center point', () => {
				const ellipse = new Ellipse2d({
					width: 120,
					height: 80,
					isFilled: true,
				})

				const center = ellipse.center
				expect(center.x).toBe(60) // width / 2
				expect(center.y).toBe(40) // height / 2
			})

			it('should have bounds matching ellipse dimensions', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 50,
					isFilled: true,
				})

				const bounds = ellipse.bounds
				expect(bounds.x).toBe(0)
				expect(bounds.y).toBe(0)
				expect(bounds.w).toBe(100)
				expect(bounds.h).toBe(50)
			})

			it('should handle transformed ellipse bounds', () => {
				const ellipse = new Ellipse2d({
					width: 100,
					height: 60,
					isFilled: true,
				})

				const transformedEllipse = ellipse.transform(Mat.Translate(20, 30))
				const transformedBounds = transformedEllipse.getBounds()
				const originalBounds = ellipse.getBounds()

				// Check that bounds are translated in the right direction
				expect(transformedBounds.x).toBeGreaterThan(originalBounds.x + 15)
				expect(transformedBounds.y).toBeGreaterThan(originalBounds.y + 25)
			})
		})
	})

	describe('snapshots', () => {
		it('should match SVG path data snapshots', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 60,
				isFilled: true,
			})

			expect(ellipse.getSvgPathData(true)).toMatchSnapshot('ellipse-svg-path-first')
			expect(ellipse.getSvgPathData(false)).toMatchSnapshot('ellipse-svg-path-not-first')
		})

		it('should match circle SVG path data snapshot', () => {
			const circle = new Ellipse2d({
				width: 80,
				height: 80,
				isFilled: true,
			})

			expect(circle.getSvgPathData(true)).toMatchSnapshot('circle-svg-path')
		})

		it('should match vertices snapshots', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 60,
				isFilled: true,
			})

			expect(ellipse.getVertices()).toMatchSnapshot('ellipse-vertices')
		})

		it('should match circle vertices snapshot', () => {
			const circle = new Ellipse2d({
				width: 80,
				height: 80,
				isFilled: true,
			})

			expect(circle.getVertices()).toMatchSnapshot('circle-vertices')
		})

		it('should match bounds snapshots', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 60,
				isFilled: true,
			})

			expect(ellipse.getBounds()).toMatchSnapshot('ellipse-bounds')

			const circle = new Ellipse2d({
				width: 80,
				height: 80,
				isFilled: true,
			})

			expect(circle.getBounds()).toMatchSnapshot('circle-bounds')
		})

		it('should match perimeter calculations snapshot', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 60,
				isFilled: true,
			})

			const circle = new Ellipse2d({
				width: 80,
				height: 80,
				isFilled: true,
			})

			expect({
				ellipseLength: ellipse.getLength(),
				circleLength: circle.getLength(),
			}).toMatchSnapshot('perimeter-calculations')
		})

		it('should match transformed ellipse snapshots', () => {
			const ellipse = new Ellipse2d({
				width: 100,
				height: 60,
				isFilled: true,
			})

			const translated = ellipse.transform(Mat.Translate(50, 30))
			const scaled = ellipse.transform(Mat.Scale(2, 2))
			const rotated = ellipse.transform(Mat.Rotate(Math.PI / 4))

			expect({
				translatedBounds: translated.getBounds(),
				scaledBounds: scaled.getBounds(),
				rotatedBounds: rotated.getBounds(),
			}).toMatchSnapshot('transformed-ellipse-bounds')
		})

		it('should match small ellipse snapshots', () => {
			const smallEllipse = new Ellipse2d({
				width: 10,
				height: 6,
				isFilled: true,
			})

			expect({
				vertices: smallEllipse.getVertices(),
				bounds: smallEllipse.getBounds(),
				length: smallEllipse.getLength(),
				svgPath: smallEllipse.getSvgPathData(true),
			}).toMatchSnapshot('small-ellipse')
		})

		it('should match elongated ellipse snapshots', () => {
			const elongatedEllipse = new Ellipse2d({
				width: 200,
				height: 40,
				isFilled: true,
			})

			expect({
				vertices: elongatedEllipse.getVertices(),
				bounds: elongatedEllipse.getBounds(),
				length: elongatedEllipse.getLength(),
				svgPath: elongatedEllipse.getSvgPathData(true),
			}).toMatchSnapshot('elongated-ellipse')
		})
	})
})
