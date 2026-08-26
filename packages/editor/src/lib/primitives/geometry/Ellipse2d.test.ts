import { perimeterOfEllipse } from '../utils'
import { Vec } from '../Vec'
import { Edge2d } from './Edge2d'
import { Ellipse2d } from './Ellipse2d'
import { getVerticesCountForArcLength } from './geometry-constants'

// A 100x50 ellipse: centre (50, 25), rx = 50, ry = 25
const ellipse = () => new Ellipse2d({ width: 100, height: 50, isFilled: false })
const filled = () => new Ellipse2d({ width: 100, height: 50, isFilled: true })

function expectOnEllipse(p: Vec, cx: number, cy: number, rx: number, ry: number) {
	const dx = (p.x - cx) / rx
	const dy = (p.y - cy) / ry
	expect(dx * dx + dy * dy).toBeCloseTo(1, 6)
}

describe('Ellipse2d construction', () => {
	it('is always closed and keeps the fill flag from config', () => {
		expect(ellipse()).toMatchObject({ isClosed: true, isFilled: false })
		expect(filled()).toMatchObject({ isClosed: true, isFilled: true })
	})

	it('passes through the other geometry options', () => {
		const e = new Ellipse2d({
			width: 10,
			height: 10,
			isFilled: true,
			isLabel: true,
			isInternal: true,
			debugColor: 'red',
			ignore: true,
			excludeFromShapeBounds: true,
		})
		expect(e).toMatchObject({
			isLabel: true,
			isInternal: true,
			debugColor: 'red',
			ignore: true,
			excludeFromShapeBounds: true,
		})
	})
})

describe('Ellipse2d.getVertices', () => {
	it('samples one vertex per 20 units of perimeter, starting at the rightmost point', () => {
		const e = ellipse()
		const { vertices } = e
		expect(vertices.length).toBe(getVerticesCountForArcLength(perimeterOfEllipse(50, 25)))
		expect(vertices.length).toBe(13)
		expect(vertices[0]).toMatchObject({ x: 100, y: 25 })
	})

	it('places every vertex on the ellipse and inside the bounds', () => {
		const { vertices, bounds } = ellipse()
		for (const v of vertices) {
			expectOnEllipse(v, 50, 25, 50, 25)
			expect(bounds.containsPoint(v)).toBe(true)
		}
	})

	it('walks the ellipse in the positive angular direction', () => {
		const { vertices } = ellipse()
		// second vertex is one step (2π/13) clockwise in screen space, so below the first
		expect(vertices[1].x).toBeLessThan(100)
		expect(vertices[1].y).toBeGreaterThan(25)
	})

	it('falls back to the minimum vertex count for a tiny ellipse', () => {
		const { vertices } = new Ellipse2d({ width: 1, height: 1, isFilled: false })
		expect(vertices.length).toBe(8)
	})

	it('does not produce NaNs for a zero size ellipse', () => {
		const e = new Ellipse2d({ width: 0, height: 0, isFilled: false })
		expect(e.vertices.length).toBe(8)
		for (const v of e.vertices) {
			expect(Number.isFinite(v.x)).toBe(true)
			expect(Number.isFinite(v.y)).toBe(true)
		}
		expect(e.bounds).toMatchObject({ x: 0, y: 0, w: 0, h: 0 })
	})

	it('has a NaN length for a zero size ellipse (known quirk)', () => {
		// perimeterOfEllipse divides by (rx + ry) ** 2, which is zero here
		expect(new Ellipse2d({ width: 0, height: 0, isFilled: false }).getLength()).toBeNaN()
	})
})

describe('Ellipse2d.edges', () => {
	it('connects consecutive vertices and closes back to the first', () => {
		const e = ellipse()
		const { edges, vertices } = e
		expect(edges.length).toBe(vertices.length)
		expect(edges[0]).toBeInstanceOf(Edge2d)
		expect(edges[0].vertices).toEqual([vertices[0], vertices[1]])
		expect(edges[edges.length - 1].vertices).toEqual([vertices[vertices.length - 1], vertices[0]])
	})

	it('caches the edges', () => {
		const e = ellipse()
		expect(e.edges).toBe(e.edges)
	})
})

describe('Ellipse2d.bounds', () => {
	it('is the width by height box at the origin', () => {
		expect(ellipse().bounds).toMatchObject({ x: 0, y: 0, w: 100, h: 50 })
		expect(ellipse().center).toMatchObject({ x: 50, y: 25 })
	})

	it('is not affected by the polygon approximation', () => {
		// the bounds come from the config, not from the sampled vertices
		const e = new Ellipse2d({ width: 3, height: 7, isFilled: false })
		expect(e.bounds).toMatchObject({ x: 0, y: 0, w: 3, h: 7 })
	})
})

describe('Ellipse2d.getLength', () => {
	it("uses Ramanujan's perimeter approximation", () => {
		expect(ellipse().length).toBeCloseTo(242.21, 1)
		expect(ellipse().length).toBeCloseTo(perimeterOfEllipse(50, 25))
	})

	it('matches a circle circumference when width equals height', () => {
		expect(new Ellipse2d({ width: 100, height: 100, isFilled: false }).length).toBeCloseTo(
			Math.PI * 100
		)
	})
})

describe('Ellipse2d.area', () => {
	it('is the area of the inscribed polygon', () => {
		const e = ellipse()
		const n = e.vertices.length
		expect(e.area).toBeCloseTo((n / 2) * 50 * 25 * Math.sin((2 * Math.PI) / n), 5)
		expect(e.area).toBeLessThan(Math.PI * 50 * 25)
	})
})

describe('Ellipse2d.nearestPoint', () => {
	it('returns the vertex when it is the nearest point', () => {
		expect(ellipse().nearestPoint(new Vec(150, 25))).toMatchObject({ x: 100, y: 25 })
	})

	it('returns a point on the edge polygon nearest to the point', () => {
		const e = ellipse()
		const p = e.nearestPoint(new Vec(50, -10))
		expect(Vec.Dist(p, new Vec(50, 0))).toBeLessThan(1.5)
		expect(e.hitTestPoint(p, 0.001)).toBe(true)
	})

	it('accepts plain objects', () => {
		expect(ellipse().nearestPoint({ x: 150, y: 25 })).toMatchObject({ x: 100, y: 25 })
	})
})

describe('Ellipse2d.distanceToPoint', () => {
	it('is positive outside', () => {
		expect(ellipse().distanceToPoint(new Vec(150, 25))).toBe(50)
		expect(filled().distanceToPoint(new Vec(150, 25))).toBe(50)
	})

	it('is zero on a vertex', () => {
		expect(ellipse().distanceToPoint(new Vec(100, 25))).toBe(0)
	})

	it('is negative inside only when filled or hitInside', () => {
		const unfilledDist = ellipse().distanceToPoint(new Vec(50, 25))
		expect(unfilledDist).toBeGreaterThan(0)
		expect(filled().distanceToPoint(new Vec(50, 25))).toBe(-unfilledDist)
		expect(ellipse().distanceToPoint(new Vec(50, 25), true)).toBe(-unfilledDist)
	})
})

describe('Ellipse2d.hitTestPoint', () => {
	it('hits the interior only when filled or hitInside', () => {
		expect(filled().hitTestPoint(new Vec(50, 25))).toBe(true)
		expect(ellipse().hitTestPoint(new Vec(50, 25))).toBe(false)
		expect(ellipse().hitTestPoint(new Vec(50, 25), 0, true)).toBe(true)
	})

	it('misses points outside', () => {
		expect(filled().hitTestPoint(new Vec(150, 25))).toBe(false)
		expect(ellipse().hitTestPoint(new Vec(150, 25))).toBe(false)
	})

	it('misses the bounding box corners, which are outside the ellipse', () => {
		expect(filled().hitTestPoint(new Vec(1, 1))).toBe(false)
		expect(filled().hitTestPoint(new Vec(99, 49))).toBe(false)
	})

	it('hits the edge', () => {
		expect(ellipse().hitTestPoint(new Vec(100, 25))).toBe(true)
	})

	it('respects the margin', () => {
		expect(ellipse().hitTestPoint(new Vec(105, 25), 5)).toBe(true)
		expect(ellipse().hitTestPoint(new Vec(105, 25), 4)).toBe(false)
		expect(ellipse().hitTestPoint(new Vec(95, 25), 5)).toBe(true)
	})
})

describe('Ellipse2d.hitTestLineSegment', () => {
	it('hits a segment crossing the edge', () => {
		expect(ellipse().hitTestLineSegment(new Vec(50, -10), new Vec(50, 60))).toBe(true)
		expect(ellipse().hitTestLineSegment(new Vec(90, 25), new Vec(110, 25))).toBe(true)
	})

	it('misses a segment entirely outside', () => {
		expect(ellipse().hitTestLineSegment(new Vec(150, 0), new Vec(150, 50))).toBe(false)
	})

	it('misses a segment entirely inside, even when filled', () => {
		expect(ellipse().hitTestLineSegment(new Vec(40, 25), new Vec(60, 25))).toBe(false)
		expect(filled().hitTestLineSegment(new Vec(40, 25), new Vec(60, 25))).toBe(false)
	})

	it('misses a segment that cuts through a bounding box corner only', () => {
		expect(ellipse().hitTestLineSegment(new Vec(0, 0), new Vec(5, 5))).toBe(false)
	})
})

describe('Ellipse2d.intersectLineSegment', () => {
	it('returns both crossings of a horizontal line through the centre', () => {
		const hits = ellipse().intersectLineSegment(new Vec(-10, 25), new Vec(110, 25))
		expect(hits.length).toBe(2)
		expect(hits.map((h) => h.y)).toEqual([25, 25])
		const xs = hits.map((h) => h.x).sort((a, b) => a - b)
		// the leftmost point is not a vertex, so the polygon edge sits slightly inside the ellipse
		expect(xs[0]).toBeGreaterThanOrEqual(0)
		expect(xs[0]).toBeLessThan(2)
		expect(xs[1]).toBe(100)
	})
})

describe('Ellipse2d.getSvgPathData', () => {
	it('draws two arcs starting from the leftmost point', () => {
		expect(ellipse().getSvgPathData(true)).toBe('M0,25 a50,25,0,1,1,100,0a50,25,0,1,1,-100,0')
	})

	it('omits the move command when not first', () => {
		expect(ellipse().getSvgPathData()).toBe(' a50,25,0,1,1,100,0a50,25,0,1,1,-100,0')
		expect(ellipse().getSvgPathData(false)).toBe(ellipse().getSvgPathData())
	})
})
