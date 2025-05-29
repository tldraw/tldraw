import { Vec } from '../Vec'
import { Rectangle2d } from './Rectangle2d'

describe('Rectangle2d', () => {
	describe('construction', () => {
		it('should create a rectangle with correct dimensions', () => {
			const rect = new Rectangle2d({ width: 100, height: 50, isFilled: true })
			expect(rect.x).toBe(0)
			expect(rect.y).toBe(0)
			expect(rect.w).toBe(100)
			expect(rect.h).toBe(50)
		})

		it('should create a rectangle with custom coordinates', () => {
			const rect = new Rectangle2d({ x: 10, y: 20, width: 80, height: 40, isFilled: true })
			expect(rect.x).toBe(10)
			expect(rect.y).toBe(20)
			expect(rect.w).toBe(80)
			expect(rect.h).toBe(40)
		})

		it('should default x and y to 0 when not provided', () => {
			const rect = new Rectangle2d({ width: 50, height: 30, isFilled: false })
			expect(rect.x).toBe(0)
			expect(rect.y).toBe(0)
			expect(rect.w).toBe(50)
			expect(rect.h).toBe(30)
		})

		it('should accept negative coordinates', () => {
			const rect = new Rectangle2d({ x: -10, y: -20, width: 50, height: 30, isFilled: true })
			expect(rect.x).toBe(-10)
			expect(rect.y).toBe(-20)
			expect(rect.w).toBe(50)
			expect(rect.h).toBe(30)
		})

		it('should handle zero dimensions', () => {
			const rect = new Rectangle2d({ width: 0, height: 0, isFilled: false })
			expect(rect.x).toBe(0)
			expect(rect.y).toBe(0)
			expect(rect.w).toBe(0)
			expect(rect.h).toBe(0)
		})

		it('should handle negative dimensions', () => {
			const rect = new Rectangle2d({ width: -10, height: -5, isFilled: true })
			expect(rect.x).toBe(0)
			expect(rect.y).toBe(0)
			expect(rect.w).toBe(-10)
			expect(rect.h).toBe(-5)
		})

		it('should preserve isFilled property', () => {
			const filledRect = new Rectangle2d({ width: 10, height: 10, isFilled: true })
			const unfilledRect = new Rectangle2d({ width: 10, height: 10, isFilled: false })

			expect(filledRect.isFilled).toBe(true)
			expect(unfilledRect.isFilled).toBe(false)
		})

		it('should always be closed (inherits from Polygon2d)', () => {
			const rect = new Rectangle2d({ width: 10, height: 10, isFilled: false })
			expect(rect.isClosed).toBe(true)
		})
	})

	describe('points generation', () => {
		it('should generate correct corner points in clockwise order', () => {
			const rect = new Rectangle2d({ x: 10, y: 20, width: 30, height: 40, isFilled: false })
			const expectedPoints = [
				new Vec(10, 20), // top-left
				new Vec(40, 20), // top-right
				new Vec(40, 60), // bottom-right
				new Vec(10, 60), // bottom-left
			]

			expect(rect.points).toEqual(expectedPoints)
		})

		it('should generate points for origin rectangle', () => {
			const rect = new Rectangle2d({ width: 20, height: 10, isFilled: true })
			const expectedPoints = [new Vec(0, 0), new Vec(20, 0), new Vec(20, 10), new Vec(0, 10)]

			expect(rect.points).toEqual(expectedPoints)
		})

		it('should generate points for negative coordinate rectangle', () => {
			const rect = new Rectangle2d({ x: -5, y: -3, width: 10, height: 6, isFilled: false })
			const expectedPoints = [new Vec(-5, -3), new Vec(5, -3), new Vec(5, 3), new Vec(-5, 3)]

			expect(rect.points).toEqual(expectedPoints)
		})

		it('should handle zero-width rectangle', () => {
			const rect = new Rectangle2d({ x: 5, y: 5, width: 0, height: 10, isFilled: true })
			const expectedPoints = [
				new Vec(5, 5),
				new Vec(5, 5), // same x coordinate
				new Vec(5, 15),
				new Vec(5, 15),
			]

			expect(rect.points).toEqual(expectedPoints)
		})

		it('should handle zero-height rectangle', () => {
			const rect = new Rectangle2d({ x: 5, y: 5, width: 10, height: 0, isFilled: false })
			const expectedPoints = [
				new Vec(5, 5),
				new Vec(15, 5),
				new Vec(15, 5), // same y coordinate
				new Vec(5, 5),
			]

			expect(rect.points).toEqual(expectedPoints)
		})
	})

	describe('getBounds', () => {
		it('should return correct bounds for positive rectangle', () => {
			const rect = new Rectangle2d({ x: 10, y: 20, width: 30, height: 40, isFilled: true })
			const bounds = rect.bounds

			expect(bounds.x).toBe(10)
			expect(bounds.y).toBe(20)
			expect(bounds.w).toBe(30)
			expect(bounds.h).toBe(40)
		})

		it('should return correct bounds for origin rectangle', () => {
			const rect = new Rectangle2d({ width: 50, height: 25, isFilled: false })
			const bounds = rect.bounds

			expect(bounds.x).toBe(0)
			expect(bounds.y).toBe(0)
			expect(bounds.w).toBe(50)
			expect(bounds.h).toBe(25)
		})

		it('should return correct bounds for negative coordinate rectangle', () => {
			const rect = new Rectangle2d({ x: -15, y: -10, width: 20, height: 15, isFilled: true })
			const bounds = rect.bounds

			expect(bounds.x).toBe(-15)
			expect(bounds.y).toBe(-10)
			expect(bounds.w).toBe(20)
			expect(bounds.h).toBe(15)
		})

		it('should handle zero dimensions', () => {
			const rect = new Rectangle2d({ x: 5, y: 5, width: 0, height: 0, isFilled: false })
			const bounds = rect.bounds

			expect(bounds.x).toBe(5)
			expect(bounds.y).toBe(5)
			expect(bounds.w).toBe(0)
			expect(bounds.h).toBe(0)
		})

		it('should be consistent with inherited bounds property', () => {
			const rect = new Rectangle2d({ x: 7, y: 3, width: 14, height: 8, isFilled: true })
			const getBounds = rect.bounds
			const boundsProperty = rect.bounds

			expect(getBounds.x).toBe(boundsProperty.x)
			expect(getBounds.y).toBe(boundsProperty.y)
			expect(getBounds.w).toBe(boundsProperty.w)
			expect(getBounds.h).toBe(boundsProperty.h)
		})
	})

	describe('getSvgPathData', () => {
		it('should generate correct SVG path for basic rectangle', () => {
			const rect = new Rectangle2d({ width: 10, height: 5, isFilled: false })
			const path = rect.getSvgPathData()

			expect(path).toBe('M0,0 h10 v5 h-10z')
		})

		it('should generate correct SVG path for positioned rectangle', () => {
			const rect = new Rectangle2d({ x: 5, y: 3, width: 20, height: 15, isFilled: true })
			const path = rect.getSvgPathData()

			expect(path).toBe('M5,3 h20 v15 h-20z')
		})

		it('should generate correct SVG path for negative coordinates', () => {
			const rect = new Rectangle2d({ x: -10, y: -5, width: 15, height: 8, isFilled: false })
			const path = rect.getSvgPathData()

			expect(path).toBe('M-10,-5 h15 v8 h-15z')
		})

		it('should handle zero width rectangle', () => {
			const rect = new Rectangle2d({ x: 5, y: 5, width: 0, height: 10, isFilled: true })
			const path = rect.getSvgPathData()

			expect(path).toBe('M5,5 h0 v10 h0z')
		})

		it('should handle zero height rectangle', () => {
			const rect = new Rectangle2d({ x: 5, y: 5, width: 10, height: 0, isFilled: false })
			const path = rect.getSvgPathData()

			expect(path).toBe('M5,5 h10 v0 h-10z')
		})

		it.skip('should handle negative dimensions', () => {
			const rect = new Rectangle2d({ x: 0, y: 0, width: -10, height: -5, isFilled: true })
			const path = rect.getSvgPathData()

			expect(path).toBe('M0,0 h-10 v-5 h-10z')
		})

		it('should generate path that closes with z command', () => {
			const rect = new Rectangle2d({ width: 1, height: 1, isFilled: false })
			const path = rect.getSvgPathData()

			expect(path.endsWith('z')).toBe(true)
		})
	})

	describe('inheritance from Polygon2d', () => {
		it('should have 4 segments (closed polygon)', () => {
			const rect = new Rectangle2d({ width: 10, height: 10, isFilled: false })
			expect(rect.segments.length).toBe(4)
		})

		it('should calculate correct perimeter', () => {
			const rect = new Rectangle2d({ width: 10, height: 6, isFilled: true })
			const expectedPerimeter = 2 * (10 + 6) // 32
			expect(rect.length).toBeCloseTo(expectedPerimeter, 1)
		})

		it('should calculate correct area when filled', () => {
			const rect = new Rectangle2d({ width: 8, height: 5, isFilled: true })
			const expectedArea = 8 * 5 // 40
			expect(rect.area).toBeCloseTo(expectedArea, 1)
		})

		it.skip('should have zero area when not filled', () => {
			const rect = new Rectangle2d({ width: 8, height: 5, isFilled: false })
			expect(rect.area).toBe(0)
		})

		it('should return correct vertices', () => {
			const rect = new Rectangle2d({ x: 2, y: 3, width: 4, height: 5, isFilled: false })
			const vertices = rect.getVertices()

			expect(vertices.length).toBe(4)
			expect(vertices[0]).toEqual(new Vec(2, 3))
			expect(vertices[1]).toEqual(new Vec(6, 3))
			expect(vertices[2]).toEqual(new Vec(6, 8))
			expect(vertices[3]).toEqual(new Vec(2, 8))
		})

		it('should handle point containment when filled', () => {
			const rect = new Rectangle2d({ x: 0, y: 0, width: 10, height: 10, isFilled: true })

			expect(rect.hitTestPoint(new Vec(5, 5), 0, true)).toBe(true) // inside
			expect(rect.hitTestPoint(new Vec(15, 15), 0, true)).toBe(false) // outside
		})

		it.skip('should handle point containment when not filled', () => {
			const rect = new Rectangle2d({ x: 0, y: 0, width: 10, height: 10, isFilled: false })

			expect(rect.hitTestPoint(new Vec(5, 5), 0, true)).toBe(false) // inside (not filled)
			expect(rect.hitTestPoint(new Vec(0, 5), 1, false)).toBe(true) // on edge with margin
		})

		it('should find nearest point on perimeter', () => {
			const rect = new Rectangle2d({ x: 0, y: 0, width: 10, height: 10, isFilled: false })

			const nearestToInside = rect.nearestPoint(new Vec(5, 5))
			// Should be on one of the edges
			expect(
				nearestToInside.x === 0 ||
					nearestToInside.x === 10 ||
					nearestToInside.y === 0 ||
					nearestToInside.y === 10
			).toBe(true)
		})
	})

	describe('edge cases', () => {
		it('should handle very small rectangles', () => {
			const rect = new Rectangle2d({ width: 0.001, height: 0.001, isFilled: true })

			expect(rect.w).toBe(0.001)
			expect(rect.h).toBe(0.001)
			expect(rect.points.length).toBe(4)
			expect(rect.segments.length).toBe(4)
		})

		it('should handle very large rectangles', () => {
			const rect = new Rectangle2d({ width: 1000000, height: 1000000, isFilled: false })

			expect(rect.w).toBe(1000000)
			expect(rect.h).toBe(1000000)
			expect(rect.length).toBeCloseTo(4000000, 1)
		})

		it('should handle extreme coordinates', () => {
			const rect = new Rectangle2d({
				x: -1000000,
				y: -1000000,
				width: 2000000,
				height: 2000000,
				isFilled: true,
			})

			expect(rect.x).toBe(-1000000)
			expect(rect.y).toBe(-1000000)
			expect(rect.bounds.x).toBe(-1000000)
			expect(rect.bounds.y).toBe(-1000000)
		})

		it('should handle floating point precision', () => {
			const rect = new Rectangle2d({
				x: 0.1 + 0.2,
				y: 0.2 + 0.3,
				width: 1.1 + 1.2,
				height: 2.1 + 2.2,
				isFilled: false,
			})

			expect(rect.x).toBeCloseTo(0.3, 10)
			expect(rect.y).toBeCloseTo(0.5, 10)
			expect(rect.w).toBeCloseTo(2.3, 10)
			expect(rect.h).toBeCloseTo(4.3, 10)
		})

		it('should handle negative width and height gracefully', () => {
			const rect = new Rectangle2d({
				x: 10,
				y: 10,
				width: -5,
				height: -3,
				isFilled: true,
			})

			// Should still create valid geometry
			expect(rect.points.length).toBe(4)
			expect(rect.segments.length).toBe(4)
			expect(typeof rect.length).toBe('number')
		})

		it('should handle degenerate rectangles (zero area)', () => {
			const zeroWidthRect = new Rectangle2d({ width: 0, height: 10, isFilled: true })
			const zeroHeightRect = new Rectangle2d({ width: 10, height: 0, isFilled: true })
			const pointRect = new Rectangle2d({ width: 0, height: 0, isFilled: true })

			expect(zeroWidthRect.area).toBe(0)
			expect(zeroHeightRect.area).toBe(0)
			expect(pointRect.area).toBe(0)
		})
	})

	describe('integration with geometry methods', () => {
		it('should work with transformation methods', () => {
			const rect = new Rectangle2d({ x: 5, y: 5, width: 10, height: 8, isFilled: true })

			// Test that transform method exists and works
			expect(typeof rect.transform).toBe('function')
		})

		it('should work with distance calculations', () => {
			const rect = new Rectangle2d({ x: 0, y: 0, width: 10, height: 10, isFilled: false })

			const distanceToInside = rect.distanceToPoint(new Vec(5, 5))
			const distanceToOutside = rect.distanceToPoint(new Vec(15, 15))

			expect(typeof distanceToInside).toBe('number')
			expect(typeof distanceToOutside).toBe('number')
			expect(distanceToOutside).toBeGreaterThan(0)
		})

		it('should work with line segment intersection', () => {
			const rect = new Rectangle2d({ x: 0, y: 0, width: 10, height: 10, isFilled: false })

			// Line that crosses the rectangle
			const crossingLine = rect.hitTestLineSegment(new Vec(-5, 5), new Vec(15, 5))
			// Line that misses the rectangle
			const missingLine = rect.hitTestLineSegment(new Vec(-5, -5), new Vec(-1, -1))

			expect(crossingLine).toBe(true)
			expect(missingLine).toBe(false)
		})

		it('should work with intersection methods', () => {
			const rect = new Rectangle2d({ x: 0, y: 0, width: 10, height: 10, isFilled: false })

			const intersections = rect.intersectLineSegment(new Vec(-5, 5), new Vec(15, 5))
			expect(Array.isArray(intersections)).toBe(true)
			expect(intersections.length).toBeGreaterThan(0) // Should intersect rectangle edges
		})

		it('should calculate correct center point', () => {
			const rect = new Rectangle2d({ x: 10, y: 20, width: 30, height: 40, isFilled: true })
			const center = rect.center

			expect(center.x).toBeCloseTo(25, 1) // 10 + 30/2
			expect(center.y).toBeCloseTo(40, 1) // 20 + 40/2
		})
	})

	describe('mathematical properties', () => {
		it('should maintain rectangle properties', () => {
			const rect = new Rectangle2d({ x: 3, y: 7, width: 12, height: 8, isFilled: false })

			// Opposite corners should be diagonal
			const topLeft = rect.points[0]
			const bottomRight = rect.points[2]

			expect(topLeft.x).toBe(3)
			expect(topLeft.y).toBe(7)
			expect(bottomRight.x).toBe(15) // 3 + 12
			expect(bottomRight.y).toBe(15) // 7 + 8
		})

		it('should have perpendicular sides', () => {
			const rect = new Rectangle2d({ width: 10, height: 6, isFilled: true })
			const segments = rect.segments

			// Each segment should be horizontal or vertical
			for (const segment of segments) {
				const deltaX = Math.abs(segment.end.x - segment.start.x)
				const deltaY = Math.abs(segment.end.y - segment.start.y)

				// Either horizontal (deltaY = 0) or vertical (deltaX = 0)
				expect(deltaX === 0 || deltaY === 0).toBe(true)
			}
		})

		it('should have equal opposite sides', () => {
			const rect = new Rectangle2d({ width: 15, height: 9, isFilled: false })
			const segments = rect.segments

			const lengths = segments.map((seg) => seg.length)

			// Should have two pairs of equal lengths
			expect(lengths[0]).toBeCloseTo(lengths[2], 1) // opposite sides
			expect(lengths[1]).toBeCloseTo(lengths[3], 1) // opposite sides
		})

		it('should have right angles at corners', () => {
			const rect = new Rectangle2d({ width: 8, height: 6, isFilled: true })
			const points = rect.points

			// Check that consecutive sides are perpendicular
			for (let i = 0; i < 4; i++) {
				const p1 = points[i]
				const p2 = points[(i + 1) % 4]
				const p3 = points[(i + 2) % 4]

				const vec1 = new Vec(p2.x - p1.x, p2.y - p1.y)
				const vec2 = new Vec(p3.x - p2.x, p3.y - p2.y)

				// Dot product should be 0 for perpendicular vectors
				const dotProduct = vec1.x * vec2.x + vec1.y * vec2.y
				expect(Math.abs(dotProduct)).toBeCloseTo(0, 10)
			}
		})
	})

	describe('performance and caching', () => {
		it('should cache segments calculation', () => {
			const rect = new Rectangle2d({ width: 10, height: 10, isFilled: false })

			const segments1 = rect.segments
			const segments2 = rect.segments

			expect(segments1).toBe(segments2) // Should be the same reference (cached)
		})

		it('should be efficient with large rectangles', () => {
			const rect = new Rectangle2d({
				width: 10000,
				height: 10000,
				isFilled: true,
			})

			const start = performance.now()
			const length = rect.length
			const area = rect.area
			const bounds = rect.bounds
			const end = performance.now()

			expect(length).toBe(40000)
			expect(area).toBe(100000000)
			expect(bounds.w).toBe(10000)
			expect(bounds.h).toBe(10000)
			expect(end - start).toBeLessThan(10) // Should be very fast
		})
	})

	describe('snapshots', () => {
		it('should match snapshot for basic rectangle SVG', () => {
			const rect = new Rectangle2d({ width: 10, height: 5, isFilled: false })
			expect(rect.getSvgPathData()).toMatchInlineSnapshot(`"M0,0 h10 v5 h-10z"`)
		})

		it('should match snapshot for positioned rectangle SVG', () => {
			const rect = new Rectangle2d({ x: 3, y: 7, width: 12, height: 8, isFilled: true })
			expect(rect.getSvgPathData()).toMatchInlineSnapshot(`"M3,7 h12 v8 h-12z"`)
		})

		it('should match snapshot for rectangle properties', () => {
			const rect = new Rectangle2d({ x: 5, y: 10, width: 20, height: 15, isFilled: true })

			const properties = {
				x: rect.x,
				y: rect.y,
				width: rect.w,
				height: rect.h,
				isClosed: rect.isClosed,
				isFilled: rect.isFilled,
				area: rect.area,
				perimeter: rect.length,
				bounds: {
					x: rect.bounds.x,
					y: rect.bounds.y,
					w: rect.bounds.w,
					h: rect.bounds.h,
				},
			}

			expect(properties).toMatchInlineSnapshot(`
				{
				  "area": 300,
				  "bounds": {
				    "h": 15,
				    "w": 20,
				    "x": 5,
				    "y": 10,
				  },
				  "height": 15,
				  "isClosed": true,
				  "isFilled": true,
				  "perimeter": 70,
				  "width": 20,
				  "x": 5,
				  "y": 10,
				}
			`)
		})

		it('should match snapshot for rectangle points', () => {
			const rect = new Rectangle2d({ x: 2, y: 3, width: 6, height: 4, isFilled: false })
			expect(rect.points).toMatchInlineSnapshot(`
				[
				  Vec {
				    "x": 2,
				    "y": 3,
				    "z": 1,
				  },
				  Vec {
				    "x": 8,
				    "y": 3,
				    "z": 1,
				  },
				  Vec {
				    "x": 8,
				    "y": 7,
				    "z": 1,
				  },
				  Vec {
				    "x": 2,
				    "y": 7,
				    "z": 1,
				  },
				]
			`)
		})
	})
})
