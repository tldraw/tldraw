import { Mat } from '../Mat'
import { Vec } from '../Vec'
import { Edge2d } from './Edge2d'

describe('Edge2d', () => {
	describe('construction', () => {
		it('should create an edge with start and end points', () => {
			const start = new Vec(10, 20)
			const end = new Vec(30, 40)
			const edge = new Edge2d({ start, end })

			expect(edge.start).toEqual(start)
			expect(edge.end).toEqual(end)
		})

		it('should initialize with correct isClosed and isFilled values', () => {
			const start = new Vec(0, 0)
			const end = new Vec(10, 10)
			const edge = new Edge2d({ start, end })

			expect(edge.isClosed).toBe(false)
			expect(edge.isFilled).toBe(false)
		})

		it('should calculate correct delta vector from start to end', () => {
			const start = new Vec(10, 20)
			const end = new Vec(30, 40)
			const edge = new Edge2d({ start, end })

			// Delta should be start - end = (10, 20) - (30, 40) = (-20, -20)
			expect(edge.d.x).toBe(-20)
			expect(edge.d.y).toBe(-20)
		})

		it('should calculate correct unit vector', () => {
			const start = new Vec(0, 0)
			const end = new Vec(30, 40)
			const edge = new Edge2d({ start, end })

			// For a 3-4-5 triangle, unit vector should be normalized
			const expectedLength = Math.sqrt(30 * 30 + 40 * 40) // 50
			expect(edge.u.x).toBeCloseTo(-30 / expectedLength, 10)
			expect(edge.u.y).toBeCloseTo(-40 / expectedLength, 10)
		})

		it('should calculate correct unit length', () => {
			const start = new Vec(0, 0)
			const end = new Vec(30, 40)
			const edge = new Edge2d({ start, end })

			// Unit length should be the length of the unit vector
			expect(edge.ul).toBeCloseTo(1, 10)
		})

		it('should handle zero-length edge', () => {
			const point = new Vec(10, 10)
			const edge = new Edge2d({ start: point, end: point })

			expect(edge.start).toEqual(point)
			expect(edge.end).toEqual(point)
			expect(edge.d.x).toBe(0)
			expect(edge.d.y).toBe(0)
			expect(edge.ul).toBe(0)
		})
	})

	describe('getLength', () => {
		it('should return correct length for horizontal edge', () => {
			const start = new Vec(10, 20)
			const end = new Vec(50, 20)
			const edge = new Edge2d({ start, end })

			expect(edge.length).toBe(40)
		})

		it('should return correct length for vertical edge', () => {
			const start = new Vec(15, 10)
			const end = new Vec(15, 30)
			const edge = new Edge2d({ start, end })

			expect(edge.length).toBe(20)
		})

		it('should return correct length for diagonal edge', () => {
			const start = new Vec(0, 0)
			const end = new Vec(30, 40)
			const edge = new Edge2d({ start, end })

			// Using 3-4-5 triangle, length should be 50
			expect(edge.length).toBe(50)
		})

		it('should return 0 for edge with same start and end points', () => {
			const point = new Vec(25, 35)
			const edge = new Edge2d({ start: point, end: point })

			expect(edge.length).toBe(0)
		})
	})

	describe('midPoint', () => {
		it('should return correct midpoint for horizontal edge', () => {
			const start = new Vec(10, 20)
			const end = new Vec(50, 20)
			const edge = new Edge2d({ start, end })
			const midpoint = edge.midPoint

			expect(midpoint.x).toBe(30) // (10 + 50) / 2
			expect(midpoint.y).toBe(20) // same y coordinate
		})

		it('should return correct midpoint for vertical edge', () => {
			const start = new Vec(15, 10)
			const end = new Vec(15, 30)
			const edge = new Edge2d({ start, end })
			const midpoint = edge.midPoint

			expect(midpoint.x).toBe(15) // same x coordinate
			expect(midpoint.y).toBe(20) // (10 + 30) / 2
		})

		it('should return correct midpoint for diagonal edge', () => {
			const start = new Vec(0, 0)
			const end = new Vec(40, 60)
			const edge = new Edge2d({ start, end })
			const midpoint = edge.midPoint

			expect(midpoint.x).toBe(20) // (0 + 40) / 2
			expect(midpoint.y).toBe(30) // (0 + 60) / 2
		})

		it('should return start point when start and end are the same', () => {
			const point = new Vec(25, 35)
			const edge = new Edge2d({ start: point, end: point })
			const midpoint = edge.midPoint

			expect(midpoint.x).toBe(25)
			expect(midpoint.y).toBe(35)
			expect(midpoint).toEqual(point)
		})
	})

	describe('getVertices', () => {
		it('should return array containing start and end points', () => {
			const start = new Vec(10, 20)
			const end = new Vec(30, 40)
			const edge = new Edge2d({ start, end })
			const vertices = edge.vertices

			expect(vertices).toHaveLength(2)
			expect(vertices[0]).toEqual(start)
			expect(vertices[1]).toEqual(end)
		})

		it('should return points in correct order', () => {
			const start = new Vec(5, 15)
			const end = new Vec(25, 35)
			const edge = new Edge2d({ start, end })
			const vertices = edge.vertices

			expect(vertices[0]).toEqual(start)
			expect(vertices[1]).toEqual(end)
		})
	})

	describe('nearestPoint', () => {
		it('should return start point when start and end are the same', () => {
			const point = new Vec(10, 10)
			const edge = new Edge2d({ start: point, end: point })
			const nearest = edge.nearestPoint(new Vec(50, 50))

			expect(nearest).toEqual(point)
		})

		it('should return start point when unit vector has zero length', () => {
			const start = new Vec(10, 10)
			const end = new Vec(10, 10)
			const edge = new Edge2d({ start, end })
			const nearest = edge.nearestPoint(new Vec(50, 50))

			expect(nearest).toEqual(start)
		})

		it('should return start point when nearest point is before start', () => {
			const start = new Vec(10, 10)
			const end = new Vec(20, 10)
			const edge = new Edge2d({ start, end })
			const testPoint = new Vec(5, 10) // Point before start
			const nearest = edge.nearestPoint(testPoint)

			expect(nearest).toEqual(start)
		})

		it('should return end point when nearest point is after end', () => {
			const start = new Vec(10, 10)
			const end = new Vec(20, 10)
			const edge = new Edge2d({ start, end })
			const testPoint = new Vec(25, 10) // Point after end
			const nearest = edge.nearestPoint(testPoint)

			expect(nearest).toEqual(end)
		})

		it('should return correct point when nearest point is within bounds', () => {
			const start = new Vec(0, 0)
			const end = new Vec(10, 0)
			const edge = new Edge2d({ start, end })
			const testPoint = new Vec(5, 5) // Point above middle of edge
			const nearest = edge.nearestPoint(testPoint)

			expect(nearest.x).toBe(5)
			expect(nearest.y).toBe(0)
		})

		it('should handle horizontal edges correctly', () => {
			const start = new Vec(10, 20)
			const end = new Vec(30, 20)
			const edge = new Edge2d({ start, end })
			const testPoint = new Vec(20, 30) // Point above horizontal edge
			const nearest = edge.nearestPoint(testPoint)

			expect(nearest.x).toBe(20)
			expect(nearest.y).toBe(20)
		})

		it('should handle vertical edges correctly', () => {
			const start = new Vec(15, 10)
			const end = new Vec(15, 30)
			const edge = new Edge2d({ start, end })
			const testPoint = new Vec(25, 20) // Point to the right of vertical edge
			const nearest = edge.nearestPoint(testPoint)

			expect(nearest.x).toBe(15)
			expect(nearest.y).toBe(20)
		})

		it('should handle diagonal edges correctly', () => {
			const start = new Vec(0, 0)
			const end = new Vec(10, 10)
			const edge = new Edge2d({ start, end })
			const testPoint = new Vec(5, 0) // Point below diagonal
			const nearest = edge.nearestPoint(testPoint)

			expect(nearest.x).toBeCloseTo(2.5, 10)
			expect(nearest.y).toBeCloseTo(2.5, 10)
		})
	})

	describe('getSvgPathData', () => {
		it('should generate correct path data with first=true', () => {
			const start = new Vec(10.123, 20.456)
			const end = new Vec(30.789, 40.111)
			const edge = new Edge2d({ start, end })
			const pathData = edge.getSvgPathData(true)

			expect(pathData).toBe(`M${start.toFixed()} L${end.toFixed()}`)
			expect(pathData).toContain('M10.12, 20.46')
			expect(pathData).toContain('L30.79, 40.11')
		})

		it('should generate correct path data with first=false', () => {
			const start = new Vec(10.123, 20.456)
			const end = new Vec(30.789, 40.111)
			const edge = new Edge2d({ start, end })
			const pathData = edge.getSvgPathData(false)

			expect(pathData).toBe(` L${end.toFixed()}`)
			expect(pathData).toContain('L30.79, 40.11')
			expect(pathData).not.toContain('M')
		})

		it('should use correct number precision in output', () => {
			const start = new Vec(1.23456789, 9.87654321)
			const end = new Vec(5.55555555, 7.77777777)
			const edge = new Edge2d({ start, end })
			const pathData = edge.getSvgPathData(true)

			// toFixed() should round to 2 decimal places
			expect(pathData).toContain('1.23, 9.88')
			expect(pathData).toContain('5.56, 7.78')
		})
	})

	describe('inherited geometry operations', () => {
		describe('hitTestPoint', () => {
			it('should return true when point is on the edge', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })
				const pointOnEdge = new Vec(5, 0)

				expect(edge.hitTestPoint(pointOnEdge)).toBe(true)
			})

			it('should return true when point is within margin of edge', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })
				const pointNearEdge = new Vec(5, 1) // 1 unit away from edge

				expect(edge.hitTestPoint(pointNearEdge, 1.5)).toBe(true)
				expect(edge.hitTestPoint(pointNearEdge, 0.5)).toBe(false)
			})

			it('should return false when point is far from edge', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })
				const farPoint = new Vec(5, 10)

				expect(edge.hitTestPoint(farPoint)).toBe(false)
				expect(edge.hitTestPoint(farPoint, 5)).toBe(false)
			})

			it('should handle hitInside parameter correctly', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })
				const point = new Vec(5, 0)

				// Edge2d is not closed or filled, so hitInside should not affect result
				expect(edge.hitTestPoint(point, 0, false)).toBe(true)
				expect(edge.hitTestPoint(point, 0, true)).toBe(true)
			})
		})

		describe('distanceToPoint', () => {
			it('should return 0 when point is on the edge', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })
				const pointOnEdge = new Vec(5, 0)

				expect(edge.distanceToPoint(pointOnEdge)).toBeCloseTo(0, 10)
			})

			it('should return correct distance when point is off the edge', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })
				const pointOffEdge = new Vec(5, 3)

				expect(edge.distanceToPoint(pointOffEdge)).toBeCloseTo(3, 10)
			})

			it('should handle hitInside parameter correctly', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })
				const point = new Vec(5, 3)

				// Edge2d is not closed or filled, so hitInside should not affect result
				expect(edge.distanceToPoint(point, false)).toBeCloseTo(3, 10)
				expect(edge.distanceToPoint(point, true)).toBeCloseTo(3, 10)
			})
		})

		describe('intersectLineSegment', () => {
			it('should return intersection point when lines cross', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })
				const lineStart = new Vec(5, -5)
				const lineEnd = new Vec(5, 5)

				const intersections = edge.intersectLineSegment(lineStart, lineEnd)
				expect(intersections).toHaveLength(1)
				expect(intersections[0].x).toBeCloseTo(5, 10)
				expect(intersections[0].y).toBeCloseTo(0, 10)
			})

			it('should return empty array when lines are parallel', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })
				const lineStart = new Vec(0, 5)
				const lineEnd = new Vec(10, 5)

				const intersections = edge.intersectLineSegment(lineStart, lineEnd)
				expect(intersections).toHaveLength(0)
			})

			it('should return empty array when lines do not intersect', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })
				const lineStart = new Vec(15, -5)
				const lineEnd = new Vec(15, 5)

				const intersections = edge.intersectLineSegment(lineStart, lineEnd)
				expect(intersections).toHaveLength(0)
			})
		})

		describe('transform', () => {
			it('should correctly transform start and end points', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })

				// Translation matrix
				const transformedEdge = edge.transform(Mat.Translate(5, 3))
				const transformedVertices = transformedEdge.vertices

				expect(transformedVertices[0].x).toBeCloseTo(5, 10)
				expect(transformedVertices[0].y).toBeCloseTo(3, 10)
				expect(transformedVertices[1].x).toBeCloseTo(15, 10)
				expect(transformedVertices[1].y).toBeCloseTo(3, 10)
			})

			it('should maintain edge properties after transformation', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })

				const transformedEdge = edge.transform(Mat.Identity())

				expect(transformedEdge.isClosed).toBe(false)
				expect(transformedEdge.isFilled).toBe(false)
			})

			it('should handle rotation correctly', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 0)
				const edge = new Edge2d({ start, end })

				// 90 degree rotation matrix
				const transformedEdge = edge.transform(Mat.Rotate(Math.PI / 2))
				const transformedVertices = transformedEdge.vertices

				expect(transformedVertices[0].x).toBeCloseTo(0, 10)
				expect(transformedVertices[0].y).toBeCloseTo(0, 10)
				expect(transformedVertices[1].x).toBeCloseTo(0, 10)
				expect(transformedVertices[1].y).toBeCloseTo(10, 10)
			})

			it('should handle uniform scaling correctly', () => {
				const start = new Vec(0, 0)
				const end = new Vec(10, 5)
				const edge = new Edge2d({ start, end })

				// Uniform scale by 2x
				const transformedEdge = edge.transform(Mat.Scale(2, 2))
				const transformedVertices = transformedEdge.vertices

				expect(transformedVertices[0].x).toBeCloseTo(0, 10)
				expect(transformedVertices[0].y).toBeCloseTo(0, 10)
				expect(transformedVertices[1].x).toBeCloseTo(20, 10)
				expect(transformedVertices[1].y).toBeCloseTo(10, 10)
			})

			it('should handle translation correctly', () => {
				const start = new Vec(1, 2)
				const end = new Vec(3, 4)
				const edge = new Edge2d({ start, end })

				// Translation by (10, 20)
				const transformedEdge = edge.transform(Mat.Translate(10, 20))
				const transformedVertices = transformedEdge.vertices

				expect(transformedVertices[0].x).toBeCloseTo(11, 10)
				expect(transformedVertices[0].y).toBeCloseTo(22, 10)
				expect(transformedVertices[1].x).toBeCloseTo(13, 10)
				expect(transformedVertices[1].y).toBeCloseTo(24, 10)
			})
		})

		describe('getBounds', () => {
			it('should return correct bounds for horizontal edge', () => {
				const start = new Vec(10, 20)
				const end = new Vec(30, 20)
				const edge = new Edge2d({ start, end })
				const bounds = edge.bounds

				expect(bounds.x).toBe(10)
				expect(bounds.y).toBe(20)
				expect(bounds.w).toBe(20)
				expect(bounds.h).toBe(0)
			})

			it('should return correct bounds for vertical edge', () => {
				const start = new Vec(15, 10)
				const end = new Vec(15, 30)
				const edge = new Edge2d({ start, end })
				const bounds = edge.bounds

				expect(bounds.x).toBe(15)
				expect(bounds.y).toBe(10)
				expect(bounds.w).toBe(0)
				expect(bounds.h).toBe(20)
			})

			it('should return correct bounds for diagonal edge', () => {
				const start = new Vec(5, 10)
				const end = new Vec(25, 30)
				const edge = new Edge2d({ start, end })
				const bounds = edge.bounds

				expect(bounds.x).toBe(5)
				expect(bounds.y).toBe(10)
				expect(bounds.w).toBe(20)
				expect(bounds.h).toBe(20)
			})

			it('should return zero-size bounds when start and end are the same', () => {
				const point = new Vec(15, 25)
				const edge = new Edge2d({ start: point, end: point })
				const bounds = edge.bounds

				expect(bounds.x).toBe(15)
				expect(bounds.y).toBe(25)
				expect(bounds.w).toBe(0)
				expect(bounds.h).toBe(0)
			})
		})
	})

	describe('snapshots', () => {
		it('should match SVG path data snapshots', () => {
			const edge = new Edge2d({
				start: new Vec(10, 20),
				end: new Vec(50, 40),
			})

			expect(edge.getSvgPathData(true)).toMatchSnapshot('edge-svg-path-first')
			expect(edge.getSvgPathData(false)).toMatchSnapshot('edge-svg-path-not-first')
		})

		it('should match vertices snapshots', () => {
			const edge = new Edge2d({
				start: new Vec(10, 20),
				end: new Vec(50, 40),
			})

			expect(edge.vertices).toMatchSnapshot('edge-vertices')
		})

		it('should match horizontal edge snapshots', () => {
			const horizontalEdge = new Edge2d({
				start: new Vec(0, 15),
				end: new Vec(100, 15),
			})

			expect({
				vertices: horizontalEdge.vertices,
				bounds: horizontalEdge.bounds,
				length: horizontalEdge.length,
				midPoint: horizontalEdge.midPoint,
				svgPath: horizontalEdge.getSvgPathData(true),
			}).toMatchSnapshot('horizontal-edge')
		})

		it('should match vertical edge snapshots', () => {
			const verticalEdge = new Edge2d({
				start: new Vec(25, 0),
				end: new Vec(25, 80),
			})

			expect({
				vertices: verticalEdge.vertices,
				bounds: verticalEdge.bounds,
				length: verticalEdge.length,
				midPoint: verticalEdge.midPoint,
				svgPath: verticalEdge.getSvgPathData(true),
			}).toMatchSnapshot('vertical-edge')
		})

		it('should match diagonal edge snapshots', () => {
			const diagonalEdge = new Edge2d({
				start: new Vec(0, 0),
				end: new Vec(30, 40),
			})

			expect({
				vertices: diagonalEdge.vertices,
				bounds: diagonalEdge.bounds,
				length: diagonalEdge.length,
				midPoint: diagonalEdge.midPoint,
				svgPath: diagonalEdge.getSvgPathData(true),
				delta: diagonalEdge.d,
				unitVector: diagonalEdge.u,
				unitLength: diagonalEdge.ul,
			}).toMatchSnapshot('diagonal-edge')
		})

		it('should match zero-length edge snapshots', () => {
			const zeroLengthEdge = new Edge2d({
				start: new Vec(15, 25),
				end: new Vec(15, 25),
			})

			expect({
				vertices: zeroLengthEdge.vertices,
				bounds: zeroLengthEdge.bounds,
				length: zeroLengthEdge.length,
				midPoint: zeroLengthEdge.midPoint,
				svgPath: zeroLengthEdge.getSvgPathData(true),
				delta: zeroLengthEdge.d,
				unitVector: zeroLengthEdge.u,
				unitLength: zeroLengthEdge.ul,
			}).toMatchSnapshot('zero-length-edge')
		})

		it('should match transformed edge snapshots', () => {
			const edge = new Edge2d({
				start: new Vec(10, 10),
				end: new Vec(30, 20),
			})

			const translated = edge.transform(Mat.Translate(50, 30))
			const scaled = edge.transform(Mat.Scale(2, 2))
			const rotated = edge.transform(Mat.Rotate(Math.PI / 4))

			expect({
				translatedVertices: translated.vertices,
				translatedBounds: translated.bounds,
				scaledVertices: scaled.vertices,
				scaledBounds: scaled.bounds,
				rotatedVertices: rotated.vertices,
				rotatedBounds: rotated.bounds,
			}).toMatchSnapshot('transformed-edges')
		})

		it('should match nearest point calculations snapshots', () => {
			const edge = new Edge2d({
				start: new Vec(0, 0),
				end: new Vec(20, 20),
			})

			const nearestPoints = {
				beforeStart: edge.nearestPoint(new Vec(-10, -5)),
				onEdge: edge.nearestPoint(new Vec(10, 15)),
				afterEnd: edge.nearestPoint(new Vec(30, 25)),
				perpendicular: edge.nearestPoint(new Vec(10, 0)),
			}

			expect(nearestPoints).toMatchSnapshot('nearest-points')
		})

		it('should match edge properties snapshots', () => {
			const longEdge = new Edge2d({
				start: new Vec(0, 0),
				end: new Vec(100, 75),
			})

			const shortEdge = new Edge2d({
				start: new Vec(5, 8),
				end: new Vec(7, 12),
			})

			expect({
				longEdge: {
					length: longEdge.length,
					delta: longEdge.d,
					unitVector: longEdge.u,
					unitLength: longEdge.ul,
					bounds: longEdge.bounds,
				},
				shortEdge: {
					length: shortEdge.length,
					delta: shortEdge.d,
					unitVector: shortEdge.u,
					unitLength: shortEdge.ul,
					bounds: shortEdge.bounds,
				},
			}).toMatchSnapshot('edge-properties')
		})
	})
})
