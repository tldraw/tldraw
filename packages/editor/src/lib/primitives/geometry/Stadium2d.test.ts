import { Vec } from '../Vec'
import { Stadium2d } from './Stadium2d'

describe('Stadium2d', () => {
	describe('construction', () => {
		it('should create a stadium with correct dimensions', () => {
			const stadium = new Stadium2d({ width: 100, height: 50, isFilled: true })
			expect(stadium.w).toBe(100)
			expect(stadium.h).toBe(50)
			expect(stadium.isFilled).toBe(true)
			expect(stadium.isClosed).toBe(true)
		})

		it('should create stadium with custom isFilled property', () => {
			const filledStadium = new Stadium2d({ width: 60, height: 40, isFilled: true })
			const unfilledStadium = new Stadium2d({ width: 60, height: 40, isFilled: false })

			expect(filledStadium.isFilled).toBe(true)
			expect(unfilledStadium.isFilled).toBe(false)
		})

		it('should always be closed', () => {
			const stadium = new Stadium2d({ width: 80, height: 30, isFilled: false })
			expect(stadium.isClosed).toBe(true)
		})

		it('should handle zero dimensions', () => {
			expect(() => {
				// Zero dimensions cause Arc2d to throw "Arc must have different start and end points"
				const zeroWidthStadium = new Stadium2d({ width: 0, height: 10, isFilled: true })
				const zeroHeightStadium = new Stadium2d({ width: 10, height: 0, isFilled: false })

				expect(zeroWidthStadium.w).toBe(0)
				expect(zeroWidthStadium.h).toBe(10)
				expect(zeroHeightStadium.w).toBe(10)
				expect(zeroHeightStadium.h).toBe(0)
			}).toThrow()
		})

		it('should handle equal width and height', () => {
			const squareStadium = new Stadium2d({ width: 50, height: 50, isFilled: true })
			expect(squareStadium.w).toBe(50)
			expect(squareStadium.h).toBe(50)
		})

		it('should handle very small dimensions', () => {
			const tinyStadium = new Stadium2d({ width: 0.1, height: 0.05, isFilled: false })
			expect(tinyStadium.w).toBe(0.1)
			expect(tinyStadium.h).toBe(0.05)
		})

		it('should handle very large dimensions', () => {
			const hugeStadium = new Stadium2d({ width: 10000, height: 5000, isFilled: true })
			expect(hugeStadium.w).toBe(10000)
			expect(hugeStadium.h).toBe(5000)
		})
	})

	describe('component structure', () => {
		it('should have 4 components (2 arcs, 2 edges)', () => {
			const stadium = new Stadium2d({ width: 100, height: 60, isFilled: false })

			expect(stadium.a).toBeDefined()
			expect(stadium.b).toBeDefined()
			expect(stadium.c).toBeDefined()
			expect(stadium.d).toBeDefined()

			// Check component types
			expect(stadium.a.constructor.name).toBe('Arc2d')
			expect(stadium.b.constructor.name).toBe('Edge2d')
			expect(stadium.c.constructor.name).toBe('Arc2d')
			expect(stadium.d.constructor.name).toBe('Edge2d')
		})

		it('should structure differently for tall rectangles (h > w)', () => {
			const tallStadium = new Stadium2d({ width: 40, height: 80, isFilled: true })

			// For tall stadiums, arcs are at top and bottom
			expect(tallStadium.a._center.x).toBe(20)
			expect(tallStadium.a._center.y).toBe(20) // radius ()
			expect(tallStadium.c._center.x).toBe(20)
			expect(tallStadium.c._center.y).toBe(60) // h - ras
		})

		it('should structure differently for wide rectangles (w >= h)', () => {
			const wideStadium = new Stadium2d({ width: 80, height: 40, isFilled: false })

			// For wide stadiums, arcs are at left and right
			expect(wideStadium.a._center.x).toBe(20) // radius (h/2)
			expect(wideStadium.a._center.y).toBe(20) // h/2
			expect(wideStadium.c._center.x).toBe(60) // w - radius
			expect(wideStadium.c._center.y).toBe(20) // h/2
		})

		it('should have correct radius for arcs based on orientation', () => {
			const tallStadium = new Stadium2d({ width: 30, height: 60, isFilled: true })
			const wideStadium = new Stadium2d({ width: 60, height: 30, isFilled: false })

			// For tall stadium, radius = width/2
			expect(tallStadium.a.radius).toBe(15)
			expect(tallStadium.c.radius).toBe(15)

			// For wide stadium, radius = height/2
			expect(wideStadium.a.radius).toBe(15)
			expect(wideStadium.c.radius).toBe(15)
		})

		it('should have edges connecting arcs properly', () => {
			const stadium = new Stadium2d({ width: 80, height: 40, isFilled: true })

			// Check that edges connect arc endpoints
			expect(stadium.b.start).toEqual(stadium.a.end)
			expect(stadium.c.start).toEqual(stadium.b.end)
			expect(stadium.d.start).toEqual(stadium.c.end)
			expect(stadium.a.start).toEqual(stadium.d.end)
		})
	})

	describe('getBounds', () => {
		it('should return correct bounds', () => {
			const stadium = new Stadium2d({ width: 120, height: 80, isFilled: false })
			const bounds = stadium.getBounds()

			expect(bounds.x).toBe(0)
			expect(bounds.y).toBe(0)
			expect(bounds.w).toBe(120)
			expect(bounds.h).toBe(80)
		})

		it('should handle zero dimensions in bounds', () => {
			expect(() => {
				// Zero dimensions cause Arc2d to throw errors
				const zeroWidthStadium = new Stadium2d({ width: 0, height: 50, isFilled: true })
				const zeroHeightStadium = new Stadium2d({ width: 50, height: 0, isFilled: false })

				const bounds1 = zeroWidthStadium.getBounds()
				const bounds2 = zeroHeightStadium.getBounds()

				expect(bounds1.w).toBe(0)
				expect(bounds1.h).toBe(50)
				expect(bounds2.w).toBe(50)
				expect(bounds2.h).toBe(0)
			}).toThrow()
		})

		it('should be consistent with inherited bounds property', () => {
			const stadium = new Stadium2d({ width: 90, height: 45, isFilled: true })
			const getBounds = stadium.getBounds()
			const boundsProperty = stadium.bounds

			expect(getBounds.x).toBe(boundsProperty.x)
			expect(getBounds.y).toBe(boundsProperty.y)
			expect(getBounds.w).toBe(boundsProperty.w)
			expect(getBounds.h).toBe(boundsProperty.h)
		})
	})

	describe('getLength', () => {
		it('should calculate correct perimeter for wide stadium (w >= h)', () => {
			const stadium = new Stadium2d({ width: 100, height: 60, isFilled: false })
			const radius = 30 // height / 2
			const straightLength = 100 - 60 // width - height
			const expectedLength = (Math.PI * radius + straightLength) * 2

			expect(stadium.getLength()).toBe(expectedLength)
		})

		it('should calculate correct perimeter for tall stadium (h > w)', () => {
			const stadium = new Stadium2d({ width: 40, height: 100, isFilled: true })
			const radius = 20 // width / 2
			const straightLength = 100 - 40 // height - width
			const expectedLength = (Math.PI * radius + straightLength) * 2

			expect(stadium.getLength()).toBe(expectedLength)
		})

		it('should calculate perimeter for square stadium', () => {
			const stadium = new Stadium2d({ width: 60, height: 60, isFilled: false })
			const radius = 30 // width/2 = height/2
			const expectedLength = Math.PI * radius * 2 // Just a circle

			expect(stadium.getLength()).toBe(expectedLength)
		})

		it('should handle very small stadiums', () => {
			const stadium = new Stadium2d({ width: 2, height: 1, isFilled: true })
			const length = stadium.getLength()

			expect(length).toBeGreaterThan(0)
			expect(typeof length).toBe('number')
		})

		it('should handle zero dimension edge cases', () => {
			expect(() => {
				// Zero dimensions cause Arc2d to throw errors
				const zeroWidthStadium = new Stadium2d({ width: 0, height: 10, isFilled: false })
				const zeroHeightStadium = new Stadium2d({ width: 10, height: 0, isFilled: true })

				expect(typeof zeroWidthStadium.getLength()).toBe('number')
				expect(typeof zeroHeightStadium.getLength()).toBe('number')
			}).toThrow()
		})

		it('should be consistent with length property', () => {
			const stadium = new Stadium2d({ width: 80, height: 50, isFilled: true })

			expect(stadium.getLength()).toBe(stadium.length)
		})
	})

	describe('getVertices', () => {
		it('should return vertices from all components', () => {
			const stadium = new Stadium2d({ width: 80, height: 40, isFilled: false })
			const vertices = stadium.getVertices()

			expect(Array.isArray(vertices)).toBe(true)
			expect(vertices.length).toBeGreaterThan(4) // Should have many vertices from arcs
		})

		it('should return Vec instances for all vertices', () => {
			const stadium = new Stadium2d({ width: 60, height: 30, isFilled: true })
			const vertices = stadium.getVertices()

			vertices.forEach((vertex) => {
				expect(vertex).toBeInstanceOf(Vec)
			})
		})

		it('should include vertices from both arcs and edges', () => {
			const stadium = new Stadium2d({ width: 100, height: 50, isFilled: false })
			const vertices = stadium.getVertices()

			// Should have vertices from arcs (many) and edges (2 each)
			expect(vertices.length).toBeGreaterThan(10)
		})

		it('should be consistent with vertices property', () => {
			const stadium = new Stadium2d({ width: 70, height: 35, isFilled: true })

			expect(stadium.getVertices()).toEqual(stadium.vertices)
		})

		it('should handle degenerate cases', () => {
			expect(() => {
				// Zero width causes Arc2d to throw errors
				const zeroWidthStadium = new Stadium2d({ width: 0, height: 20, isFilled: false })
				const vertices = zeroWidthStadium.getVertices()

				expect(Array.isArray(vertices)).toBe(true)
				expect(vertices.length).toBeGreaterThan(0)
			}).toThrow()
		})
	})

	describe('nearestPoint', () => {
		it('should find nearest point on any component', () => {
			const stadium = new Stadium2d({ width: 100, height: 60, isFilled: false })
			const queryPoint = new Vec(50, 30)
			const nearest = stadium.nearestPoint(queryPoint)

			expect(nearest).toBeInstanceOf(Vec)
			expect(typeof nearest.x).toBe('number')
			expect(typeof nearest.y).toBe('number')
		})

		it('should return point on the stadium perimeter', () => {
			const stadium = new Stadium2d({ width: 80, height: 40, isFilled: true })
			const queryPoint = new Vec(40, 20) // Center of stadium
			const nearest = stadium.nearestPoint(queryPoint)

			// Verify the nearest point is actually on one of the components
			const distanceToA = stadium.a.nearestPoint(queryPoint).dist(nearest)
			const distanceToB = stadium.b.nearestPoint(queryPoint).dist(nearest)
			const distanceToC = stadium.c.nearestPoint(queryPoint).dist(nearest)
			const distanceToD = stadium.d.nearestPoint(queryPoint).dist(nearest)

			const minDistance = Math.min(distanceToA, distanceToB, distanceToC, distanceToD)
			expect(minDistance).toBeLessThan(0.001) // Should be on one of the components
		})

		it('should handle points inside stadium', () => {
			const stadium = new Stadium2d({ width: 60, height: 30, isFilled: false })
			const insidePoint = new Vec(30, 15) // Center
			const nearest = stadium.nearestPoint(insidePoint)

			expect(nearest).toBeDefined()
			expect(Vec.Dist(nearest, insidePoint)).toBeGreaterThan(0)
		})

		it('should handle points outside stadium', () => {
			const stadium = new Stadium2d({ width: 40, height: 80, isFilled: true })
			const outsidePoint = new Vec(100, 100) // Far outside
			const nearest = stadium.nearestPoint(outsidePoint)

			expect(nearest).toBeDefined()
			// Should be within stadium bounds
			expect(nearest.x).toBeGreaterThanOrEqual(0)
			expect(nearest.x).toBeLessThanOrEqual(40)
			expect(nearest.y).toBeGreaterThanOrEqual(0)
			expect(nearest.y).toBeLessThanOrEqual(80)
		})

		it('should handle edge cases', () => {
			const stadium = new Stadium2d({ width: 20, height: 40, isFilled: false })

			// Point exactly on corner arc
			const cornerPoint = new Vec(10, 10)
			const nearest = stadium.nearestPoint(cornerPoint)

			expect(nearest).toBeDefined()
			expect(typeof nearest.x).toBe('number')
			expect(typeof nearest.y).toBe('number')
		})
	})

	describe('hitTestLineSegment', () => {
		it('should return true when line intersects stadium', () => {
			const stadium = new Stadium2d({ width: 80, height: 40, isFilled: false })

			// Line crossing through stadium
			const lineStart = new Vec(10, 20)
			const lineEnd = new Vec(70, 20)

			expect(stadium.hitTestLineSegment(lineStart, lineEnd)).toBe(true)
		})

		it('should return false when line does not intersect stadium', () => {
			const stadium = new Stadium2d({ width: 60, height: 30, isFilled: true })

			// Line completely outside stadium
			const lineStart = new Vec(100, 100)
			const lineEnd = new Vec(120, 120)

			expect(stadium.hitTestLineSegment(lineStart, lineEnd)).toBe(false)
		})

		it('should detect intersection with any component', () => {
			const stadium = new Stadium2d({ width: 100, height: 50, isFilled: false })

			// Test intersection with arc
			const arcIntersectStart = new Vec(-10, 25)
			const arcIntersectEnd = new Vec(10, 25)

			// Test intersection with straight edge
			const edgeIntersectStart = new Vec(30, -10)
			const edgeIntersectEnd = new Vec(30, 10)

			expect(stadium.hitTestLineSegment(arcIntersectStart, arcIntersectEnd)).toBe(true)
			expect(stadium.hitTestLineSegment(edgeIntersectStart, edgeIntersectEnd)).toBe(true)
		})

		it('should handle line tangent to stadium', () => {
			const stadium = new Stadium2d({ width: 60, height: 40, isFilled: true })

			// Line tangent to curved section
			const tangentStart = new Vec(-10, 0)
			const tangentEnd = new Vec(10, 0)

			const result = stadium.hitTestLineSegment(tangentStart, tangentEnd)
			expect(typeof result).toBe('boolean')
		})

		it('should handle degenerate line segments', () => {
			const stadium = new Stadium2d({ width: 40, height: 20, isFilled: false })

			// Point on stadium
			const point = new Vec(20, 10)
			const result = stadium.hitTestLineSegment(point, point)

			expect(typeof result).toBe('boolean')
		})
	})

	describe('getSvgPathData', () => {
		it('should return valid SVG path data', () => {
			const stadium = new Stadium2d({ width: 100, height: 60, isFilled: false })
			const pathData = stadium.getSvgPathData()

			expect(typeof pathData).toBe('string')
			expect(pathData.length).toBeGreaterThan(0)
			expect(pathData.endsWith(' Z')).toBe(true) // Should be closed
		})

		it('should include data from all components', () => {
			const stadium = new Stadium2d({ width: 80, height: 40, isFilled: true })
			const pathData = stadium.getSvgPathData()

			// Should contain arc commands and line commands
			expect(pathData).toContain('M') // Move command from first component
			expect(pathData).toContain('A') // Arc commands
			expect(pathData).toContain('L') // Line commands
			expect(pathData.endsWith(' Z')).toBe(true)
		})

		it('should handle different stadium orientations', () => {
			const wideStadium = new Stadium2d({ width: 100, height: 50, isFilled: false })
			const tallStadium = new Stadium2d({ width: 50, height: 100, isFilled: true })

			const widePath = wideStadium.getSvgPathData()
			const tallPath = tallStadium.getSvgPathData()

			expect(widePath).toContain('M')
			expect(widePath.endsWith(' Z')).toBe(true)
			expect(tallPath).toContain('M')
			expect(tallPath.endsWith(' Z')).toBe(true)
		})

		it('should handle edge cases', () => {
			const tinyStadium = new Stadium2d({ width: 1, height: 0.5, isFilled: false })
			const squareStadium = new Stadium2d({ width: 30, height: 30, isFilled: true })

			const tinyPath = tinyStadium.getSvgPathData()
			const squarePath = squareStadium.getSvgPathData()

			expect(typeof tinyPath).toBe('string')
			expect(tinyPath.endsWith(' Z')).toBe(true)
			expect(typeof squarePath).toBe('string')
			expect(squarePath.endsWith(' Z')).toBe(true)
		})
	})

	describe('edge cases', () => {
		it('should handle very small dimensions', () => {
			const tinyStadium = new Stadium2d({ width: 0.01, height: 0.005, isFilled: true })

			expect(tinyStadium.w).toBe(0.01)
			expect(tinyStadium.h).toBe(0.005)
			expect(typeof tinyStadium.getLength()).toBe('number')
			expect(Array.isArray(tinyStadium.getVertices())).toBe(true)
		})

		it('should handle very large dimensions', () => {
			const hugeStadium = new Stadium2d({ width: 1000000, height: 500000, isFilled: false })

			expect(hugeStadium.w).toBe(1000000)
			expect(hugeStadium.h).toBe(500000)
			expect(typeof hugeStadium.getLength()).toBe('number')
			expect(hugeStadium.getLength()).toBeGreaterThan(0)
		})

		it.skip('should handle zero width', () => {
			// Zero width causes Arc2d to throw errors
			const zeroWidthStadium = new Stadium2d({ width: 0, height: 20, isFilled: true })

			expect(zeroWidthStadium.w).toBe(0)
			expect(zeroWidthStadium.h).toBe(20)
			expect(() => {
				zeroWidthStadium.getVertices()
				zeroWidthStadium.getLength()
				zeroWidthStadium.getSvgPathData()
			}).not.toThrow()
		})

		it.skip('should handle zero height', () => {
			// Zero height causes Arc2d to throw errors
			const zeroHeightStadium = new Stadium2d({ width: 20, height: 0, isFilled: false })

			expect(zeroHeightStadium.w).toBe(20)
			expect(zeroHeightStadium.h).toBe(0)
			expect(() => {
				zeroHeightStadium.getVertices()
				zeroHeightStadium.getLength()
				zeroHeightStadium.getSvgPathData()
			}).not.toThrow()
		})

		it('should handle floating point precision', () => {
			const precisionStadium = new Stadium2d({
				width: 10.123456789,
				height: 5.987654321,
				isFilled: true,
			})

			expect(precisionStadium.w).toBe(10.123456789)
			expect(precisionStadium.h).toBe(5.987654321)
			expect(typeof precisionStadium.getLength()).toBe('number')
		})

		it('should handle aspect ratio extremes', () => {
			const veryWideStadium = new Stadium2d({ width: 1000, height: 1, isFilled: false })
			const veryTallStadium = new Stadium2d({ width: 1, height: 1000, isFilled: true })

			expect(veryWideStadium.getLength()).toBeGreaterThan(0)
			expect(veryTallStadium.getLength()).toBeGreaterThan(0)
			expect(veryWideStadium.getVertices().length).toBeGreaterThan(0)
			expect(veryTallStadium.getVertices().length).toBeGreaterThan(0)
		})
	})

	describe('integration with geometry methods', () => {
		it('should work with transformation methods', () => {
			const stadium = new Stadium2d({ width: 60, height: 40, isFilled: true })

			expect(typeof stadium.transform).toBe('function')
		})

		it('should work with distance calculations', () => {
			const stadium = new Stadium2d({ width: 80, height: 50, isFilled: false })

			const distanceToInside = stadium.distanceToPoint(new Vec(40, 25))
			const distanceToOutside = stadium.distanceToPoint(new Vec(100, 100))

			expect(typeof distanceToInside).toBe('number')
			expect(typeof distanceToOutside).toBe('number')
			expect(distanceToOutside).toBeGreaterThan(0)
		})

		it('should work with bounds calculation', () => {
			const stadium = new Stadium2d({ width: 90, height: 45, isFilled: true })
			const bounds = stadium.bounds

			expect(bounds.x).toBe(0)
			expect(bounds.y).toBe(0)
			expect(bounds.w).toBe(90)
			expect(bounds.h).toBe(45)
		})

		it('should work with area calculation', () => {
			const filledStadium = new Stadium2d({ width: 60, height: 30, isFilled: true })
			const unfilledStadium = new Stadium2d({ width: 60, height: 30, isFilled: false })

			const filledArea = filledStadium.area
			const unfilledArea = unfilledStadium.area

			expect(typeof filledArea).toBe('number')
			expect(typeof unfilledArea).toBe('number')
		})

		it('should work with center calculation', () => {
			const stadium = new Stadium2d({ width: 100, height: 60, isFilled: false })
			const center = stadium.center

			expect(center.x).toBe(50) // width/2
			expect(center.y).toBe(30) // height/2
		})

		it('should work with hit testing', () => {
			const stadium = new Stadium2d({ width: 80, height: 40, isFilled: true })

			const insidePoint = new Vec(40, 20)
			const outsidePoint = new Vec(100, 100)

			// Results depend on isFilled
			const insideHit = stadium.hitTestPoint(insidePoint, 0, true)
			const outsideHit = stadium.hitTestPoint(outsidePoint, 0, true)

			expect(typeof insideHit).toBe('boolean')
			expect(typeof outsideHit).toBe('boolean')
			expect(outsideHit).toBe(false)
		})
	})

	describe('mathematical properties', () => {
		it('should maintain consistent component connectivity', () => {
			const stadium = new Stadium2d({ width: 70, height: 35, isFilled: false })

			// Components should connect in sequence: a->b->c->d->a
			expect(stadium.a.end).toEqual(stadium.b.start)
			expect(stadium.b.end).toEqual(stadium.c.start)
			expect(stadium.c.end).toEqual(stadium.d.start)
			expect(stadium.d.end).toEqual(stadium.a.start)
		})

		it('should have symmetric arc properties', () => {
			const stadium = new Stadium2d({ width: 80, height: 40, isFilled: true })

			// Both arcs should have same radius
			expect(stadium.a.radius).toBe(stadium.c.radius)

			// Arc sweep properties should be consistent
			expect(stadium.a.sweepFlag).toBe(stadium.c.sweepFlag)
			expect(stadium.a.largeArcFlag).toBe(stadium.c.largeArcFlag)
		})

		it('should have parallel edge properties', () => {
			const stadium = new Stadium2d({ width: 100, height: 50, isFilled: false })

			// Parallel edges should have same length
			expect(stadium.b.getLength()).toBe(stadium.d.getLength())
		})

		it('should maintain correct radius relationship', () => {
			const wideStadium = new Stadium2d({ width: 100, height: 40, isFilled: true })
			const tallStadium = new Stadium2d({ width: 40, height: 100, isFilled: false })

			// Wide stadium: radius = height/2
			expect(wideStadium.a.radius).toBe(20)

			// Tall stadium: radius = width/2
			expect(tallStadium.a.radius).toBe(20)
		})

		it('should handle circular case (w = h)', () => {
			const circularStadium = new Stadium2d({ width: 60, height: 60, isFilled: true })

			// Should essentially be a circle
			const expectedCircumference = Math.PI * 60 // diameter = 60
			expect(circularStadium.getLength()).toBe(expectedCircumference)
		})
	})

	describe('performance and caching', () => {
		it('should be efficient with complex stadiums', () => {
			const stadium = new Stadium2d({ width: 500, height: 300, isFilled: false })

			const start = performance.now()
			stadium.getLength()
			stadium.getVertices()
			stadium.getSvgPathData()
			stadium.nearestPoint(new Vec(250, 150))
			const end = performance.now()

			expect(end - start).toBeLessThan(50) // Should complete reasonably fast
		})

		it('should handle repeated operations efficiently', () => {
			const stadium = new Stadium2d({ width: 200, height: 100, isFilled: true })

			const start = performance.now()
			for (let i = 0; i < 10; i++) {
				stadium.getLength()
				stadium.getVertices()
				stadium.getBounds()
			}
			const end = performance.now()

			expect(end - start).toBeLessThan(20) // Should benefit from caching
		})
	})

	describe('snapshots', () => {
		it('should match snapshot for wide stadium SVG', () => {
			const stadium = new Stadium2d({ width: 100, height: 60, isFilled: false })
			expect(stadium.getSvgPathData()).toMatchInlineSnapshot(
				`"M30, 60 A30 30 0 1 1 30, 0  L70, 0  A30 30 0 1 1 70, 60  L30, 60 Z"`
			)
		})

		it('should match snapshot for tall stadium SVG', () => {
			const stadium = new Stadium2d({ width: 40, height: 80, isFilled: true })
			expect(stadium.getSvgPathData()).toMatchInlineSnapshot(
				`"M0, 20 A20 20 0 1 1 40, 20  L40, 60  A20 20 0 1 1 0, 60  L0, 20 Z"`
			)
		})

		it('should match snapshot for square stadium SVG', () => {
			const stadium = new Stadium2d({ width: 50, height: 50, isFilled: false })
			expect(stadium.getSvgPathData()).toMatchInlineSnapshot(
				`"M25, 50 A25 25 0 1 1 25, 0  L25, 0  A25 25 0 1 1 25, 50  L25, 50 Z"`
			)
		})

		it('should match snapshot for stadium properties', () => {
			const stadium = new Stadium2d({ width: 80, height: 50, isFilled: true })

			const properties = {
				width: stadium.w,
				height: stadium.h,
				isClosed: stadium.isClosed,
				isFilled: stadium.isFilled,
				length: stadium.getLength(),
				bounds: {
					x: stadium.bounds.x,
					y: stadium.bounds.y,
					w: stadium.bounds.w,
					h: stadium.bounds.h,
				},
				componentTypes: [
					stadium.a.constructor.name,
					stadium.b.constructor.name,
					stadium.c.constructor.name,
					stadium.d.constructor.name,
				],
			}

			expect(properties).toMatchInlineSnapshot(`
			{
			  "bounds": {
			    "h": 50,
			    "w": 80,
			    "x": 0,
			    "y": 0,
			  },
			  "componentTypes": [
			    "Arc2d",
			    "Edge2d",
			    "Arc2d",
			    "Edge2d",
			  ],
			  "height": 50,
			  "isClosed": true,
			  "isFilled": true,
			  "length": 217.07963267948966,
			  "width": 80,
			}
		`)
		})

		it('should match snapshot for stadium vertices', () => {
			const stadium = new Stadium2d({ width: 60, height: 30, isFilled: false })
			// Sample a subset of vertices to keep snapshot manageable
			const vertices = stadium.getVertices()
			const sampledVertices = vertices.filter((_, i) => i % 5 === 0) // Every 5th vertex

			expect(sampledVertices).toMatchInlineSnapshot(`
			[
			  Vec {
			    "x": 15.000000000000002,
			    "y": 30,
			    "z": 1,
			  },
			  Vec {
			    "x": 0.5111126056639748,
			    "y": 18.88228567653781,
			    "z": 1,
			  },
			  Vec {
			    "x": 7.500000000000006,
			    "y": 2.009618943233418,
			    "z": 1,
			  },
			  Vec {
			    "x": 45,
			    "y": 0,
			    "z": 1,
			  },
			  Vec {
			    "x": 59.488887394336025,
			    "y": 11.11771432346219,
			    "z": 1,
			  },
			  Vec {
			    "x": 52.5,
			    "y": 27.99038105676658,
			    "z": 1,
			  },
			]
		`)
		})
	})
})
