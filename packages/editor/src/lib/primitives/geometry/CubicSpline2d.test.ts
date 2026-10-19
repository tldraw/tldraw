import { Vec } from '../Vec'
import { CubicBezier2d } from './CubicBezier2d'
import { CubicSpline2d } from './CubicSpline2d'

// Three collinear points: the spline is the straight line from (0, 0) to (200, 0)
const line = () => new CubicSpline2d({ points: [new Vec(0, 0), new Vec(100, 0), new Vec(200, 0)] })

// A symmetric peak: (0, 0) up to (100, 100) and back down to (200, 0)
const peak = () =>
	new CubicSpline2d({ points: [new Vec(0, 0), new Vec(100, 100), new Vec(200, 0)] })

function expectVec(actual: Vec, expected: { x: number; y: number }) {
	expect(actual.x).toBeCloseTo(expected.x)
	expect(actual.y).toBeCloseTo(expected.y)
}

describe('CubicSpline2d construction', () => {
	it('is never closed or filled', () => {
		expect(line()).toMatchObject({ isClosed: false, isFilled: false })
	})
})

describe('CubicSpline2d.segments', () => {
	it('creates one bezier per pair of consecutive points', () => {
		const { segments } = line()
		expect(segments.length).toBe(2)
		expect(segments[0]).toBeInstanceOf(CubicBezier2d)
		expect(segments[0].vertices[0]).toMatchObject({ x: 0, y: 0 })
		expect(segments[0].vertices[10]).toMatchObject({ x: 100, y: 0 })
		expect(segments[1].vertices[0]).toMatchObject({ x: 100, y: 0 })
		expect(segments[1].vertices[10]).toMatchObject({ x: 200, y: 0 })
	})

	it('uses the end points as control points at the ends and Catmull-Rom style tangents between', () => {
		const { segments } = peak()
		// cp1 of the first segment is the first point; cp2 is pulled back from the second point
		// along the chord (p3 - p1) / 6 * 1.25
		expect(segments[0].getSvgPathData()).toBe('M 0, 0  C0, 0 58.33, 100 100, 100')
		expect(segments[1].getSvgPathData()).toBe('M 100, 100  C141.67, 100 200, 0 200, 0')
	})

	it('caches the segments', () => {
		const s = line()
		expect(s.segments).toBe(s.segments)
	})

	it('creates a single straight segment for two points', () => {
		const s = new CubicSpline2d({ points: [new Vec(0, 0), new Vec(100, 0)] })
		expect(s.segments.length).toBe(1)
		expect(s.segments[0].getSvgPathData()).toBe('M 0, 0  C0, 0 100, 0 100, 0')
		expect(s.length).toBeCloseTo(100)
	})

	it('has no segments for a single point', () => {
		const s = new CubicSpline2d({ points: [new Vec(5, 5)] })
		expect(s.segments).toEqual([])
		expect(s.vertices).toEqual([new Vec(5, 5)])
		expect(s.length).toBe(0)
		expect(() => s.nearestPoint(new Vec(0, 0))).toThrow('nearest point not found')
	})
})

describe('CubicSpline2d.getVertices', () => {
	it('concatenates the segment vertices and appends the final point', () => {
		const { vertices } = line()
		expect(vertices.length).toBe(11 + 11 + 1)
		expect(vertices[0]).toMatchObject({ x: 0, y: 0 })
		expect(vertices[10]).toMatchObject({ x: 100, y: 0 })
		expect(vertices[11]).toMatchObject({ x: 100, y: 0 })
		expect(vertices[22]).toMatchObject({ x: 200, y: 0 })
		for (const v of vertices) expect(v.y).toBe(0)
	})

	it('passes through every control point', () => {
		const { vertices } = peak()
		expect(vertices[0]).toMatchObject({ x: 0, y: 0 })
		expect(vertices[10]).toMatchObject({ x: 100, y: 100 })
		expect(vertices[22]).toMatchObject({ x: 200, y: 0 })
	})
})

describe('CubicSpline2d.bounds', () => {
	it('spans the vertices', () => {
		expect(line().bounds).toMatchObject({ x: 0, y: 0, w: 200, h: 0 })
		expect(peak().bounds).toMatchObject({ x: 0, y: 0, w: 200, h: 100 })
		expect(peak().center).toMatchObject({ x: 100, y: 50 })
	})
})

describe('CubicSpline2d.getLength', () => {
	it('sums the segment lengths', () => {
		const s = line()
		expect(s.length).toBeCloseTo(200)
		expect(s.length).toBeCloseTo(s.segments[0].length + s.segments[1].length)
	})

	it('is longer than the chord for a curved spline', () => {
		expect(peak().length).toBeGreaterThan(2 * Math.hypot(100, 100))
	})
})

describe('CubicSpline2d.nearestPoint', () => {
	it('projects onto the nearest segment', () => {
		expectVec(line().nearestPoint(new Vec(50, 10)), { x: 50, y: 0 })
		expectVec(line().nearestPoint(new Vec(150, -10)), { x: 150, y: 0 })
	})

	it('clamps to the end points', () => {
		expect(line().nearestPoint(new Vec(-10, 0))).toMatchObject({ x: 0, y: 0 })
		expect(line().nearestPoint(new Vec(210, 5))).toMatchObject({ x: 200, y: 0 })
	})

	it('returns the shared point where two segments meet', () => {
		expect(peak().nearestPoint(new Vec(100, 120))).toMatchObject({ x: 100, y: 100 })
	})
})

describe('CubicSpline2d.distanceToPoint', () => {
	it('is the distance to the nearest segment', () => {
		expect(line().distanceToPoint(new Vec(50, 10))).toBeCloseTo(10)
		expect(line().distanceToPoint(new Vec(150, -10))).toBeCloseTo(10)
		expect(peak().distanceToPoint(new Vec(100, 120))).toBe(20)
	})

	it('is never negative', () => {
		expect(peak().distanceToPoint(new Vec(100, 50), true)).toBeGreaterThan(0)
	})
})

describe('CubicSpline2d.hitTestPoint', () => {
	it('hits points on the spline within the margin', () => {
		expect(line().hitTestPoint(new Vec(50, 0), 0.001)).toBe(true)
		expect(line().hitTestPoint(new Vec(50, 10), 10)).toBe(true)
		expect(line().hitTestPoint(new Vec(50, 10), 9)).toBe(false)
	})

	it('does not hit the area under a peak', () => {
		expect(peak().hitTestPoint(new Vec(100, 50), 0, true)).toBe(false)
	})
})

describe('CubicSpline2d.hitTestLineSegment', () => {
	it('hits a segment crossing either bezier', () => {
		expect(line().hitTestLineSegment(new Vec(50, -10), new Vec(50, 10))).toBe(true)
		expect(line().hitTestLineSegment(new Vec(150, -10), new Vec(150, 10))).toBe(true)
	})

	it('misses a segment that does not reach the spline', () => {
		expect(line().hitTestLineSegment(new Vec(150, 5), new Vec(150, 10))).toBe(false)
		expect(line().hitTestLineSegment(new Vec(250, -10), new Vec(250, 10))).toBe(false)
	})
})

describe('CubicSpline2d.getSvgPathData', () => {
	it('chains the segment paths with a single move command', () => {
		expect(line().getSvgPathData()).toBe('M 0, 0  C0, 0 58.33, 0 100, 0 C141.67, 0 200, 0 200, 0')
	})

	it('is empty for a single point', () => {
		expect(new CubicSpline2d({ points: [new Vec(5, 5)] }).getSvgPathData()).toBe('')
	})
})
