import { Vec } from '../Vec'
import { CubicBezier2d } from './CubicBezier2d'
import { Polyline2d } from './Polyline2d'

// A symmetric arch from (0, 0) to (100, 0) whose control points pull it up to y = 75 at t = 0.5
const arch = (resolution?: number) =>
	new CubicBezier2d({
		start: new Vec(0, 0),
		cp1: new Vec(0, 100),
		cp2: new Vec(100, 100),
		end: new Vec(100, 0),
		resolution,
	})

// Control points on the line y = x, so the curve is the straight segment (0,0) -> (30,30)
const straight = () =>
	new CubicBezier2d({
		start: new Vec(0, 0),
		cp1: new Vec(10, 10),
		cp2: new Vec(20, 20),
		end: new Vec(30, 30),
	})

describe('CubicBezier2d construction', () => {
	it('is an open, unfilled polyline', () => {
		const b = arch()
		expect(b).toBeInstanceOf(Polyline2d)
		expect(b).toMatchObject({ isClosed: false, isFilled: false })
	})
})

describe('CubicBezier2d.GetAtT', () => {
	it('returns the end points at t = 0 and t = 1', () => {
		expect(CubicBezier2d.GetAtT(arch(), 0)).toMatchObject({ x: 0, y: 0 })
		expect(CubicBezier2d.GetAtT(arch(), 1)).toMatchObject({ x: 100, y: 0 })
	})

	it('returns the weighted control point average in between', () => {
		// 0.125 a + 0.375 b + 0.375 c + 0.125 d
		expect(CubicBezier2d.GetAtT(arch(), 0.5)).toMatchObject({ x: 50, y: 75 })
		const p = CubicBezier2d.GetAtT(arch(), 0.4)
		expect(p.x).toBeCloseTo(35.2)
		expect(p.y).toBeCloseTo(72)
	})
})

describe('CubicBezier2d.getVertices', () => {
	it('samples resolution + 1 points along the curve', () => {
		const { vertices } = arch()
		expect(vertices.length).toBe(11)
		expect(vertices[0]).toMatchObject({ x: 0, y: 0 })
		expect(vertices[5]).toMatchObject({ x: 50, y: 75 })
		expect(vertices[10]).toMatchObject({ x: 100, y: 0 })
	})

	it('honours a custom resolution', () => {
		const { vertices } = arch(4)
		expect(vertices.length).toBe(5)
		expect(vertices[2]).toMatchObject({ x: 50, y: 75 })
	})

	it('is symmetric for symmetric control points', () => {
		const { vertices } = arch()
		for (let i = 0; i < 5; i++) {
			expect(vertices[i].x).toBeCloseTo(100 - vertices[10 - i].x)
			expect(vertices[i].y).toBeCloseTo(vertices[10 - i].y)
		}
	})
})

describe('CubicBezier2d.bounds', () => {
	it('spans the sampled vertices', () => {
		expect(arch().bounds).toMatchObject({ x: 0, y: 0, w: 100, h: 75 })
		expect(arch().center).toMatchObject({ x: 50, y: 37.5 })
	})
})

describe('CubicBezier2d.getLength', () => {
	it('equals the chord for a straight curve', () => {
		expect(straight().length).toBeCloseTo(Math.hypot(30, 30))
	})

	it('sums sampled chords at the given precision', () => {
		const b = arch()
		expect(b.getLength(undefined, 1)).toBe(100)
		expect(b.getLength(undefined, 2)).toBeCloseTo(2 * Math.hypot(50, 75))
	})

	it('gets longer with finer sampling of a curved path', () => {
		const b = arch()
		expect(b.getLength(undefined, 2)).toBeLessThan(b.getLength(undefined, 32))
		expect(b.length).toBe(b.getLength(undefined, 32))
	})
})

describe('CubicBezier2d.nearestPoint', () => {
	it('returns the peak vertex for a point above the arch', () => {
		expect(arch().nearestPoint(new Vec(50, 100))).toMatchObject({ x: 50, y: 75 })
	})

	it('clamps to the end points', () => {
		expect(arch().nearestPoint(new Vec(-10, 0))).toMatchObject({ x: 0, y: 0 })
		expect(arch().nearestPoint(new Vec(110, 0))).toMatchObject({ x: 100, y: 0 })
	})

	it('projects onto the straight curve', () => {
		const p = straight().nearestPoint(new Vec(20, 10))
		expect(p.x).toBeCloseTo(15)
		expect(p.y).toBeCloseTo(15)
	})
})

describe('CubicBezier2d.distanceToPoint', () => {
	it('measures to the sampled polyline', () => {
		expect(arch().distanceToPoint(new Vec(50, 100))).toBe(25)
		expect(arch().distanceToPoint(new Vec(-10, 0))).toBe(10)
		expect(straight().distanceToPoint(new Vec(20, 10))).toBeCloseTo(Math.hypot(5, 5))
	})

	it('is always positive, even under the arch with hitInside', () => {
		expect(arch().distanceToPoint(new Vec(50, 30), true)).toBeGreaterThan(0)
	})
})

describe('CubicBezier2d.hitTestPoint', () => {
	it('hits points on the curve', () => {
		expect(arch().hitTestPoint(new Vec(50, 75))).toBe(true)
		expect(arch().hitTestPoint(new Vec(0, 0))).toBe(true)
	})

	it('respects the margin', () => {
		expect(arch().hitTestPoint(new Vec(50, 80), 5)).toBe(true)
		expect(arch().hitTestPoint(new Vec(50, 80), 4)).toBe(false)
	})

	it('does not hit the area under the arch', () => {
		expect(arch().hitTestPoint(new Vec(50, 30))).toBe(false)
		expect(arch().hitTestPoint(new Vec(50, 30), 0, true)).toBe(false)
	})
})

describe('CubicBezier2d.hitTestLineSegment', () => {
	it('hits a segment crossing the curve', () => {
		expect(arch().hitTestLineSegment(new Vec(50, 0), new Vec(50, 100))).toBe(true)
	})

	it('misses a segment away from the curve', () => {
		expect(arch().hitTestLineSegment(new Vec(200, 0), new Vec(200, 100))).toBe(false)
	})

	it('respects the distance', () => {
		expect(arch().hitTestLineSegment(new Vec(0, 80), new Vec(100, 80), 5)).toBe(true)
		expect(arch().hitTestLineSegment(new Vec(0, 80), new Vec(100, 80), 4)).toBe(false)
	})
})

describe('CubicBezier2d.getSvgPathData', () => {
	it('emits a move and a cubic command', () => {
		expect(arch().getSvgPathData()).toBe('M 0, 0  C0, 100 100, 100 100, 0')
	})

	it('omits the move command when not first', () => {
		expect(arch().getSvgPathData(false)).toBe(' C0, 100 100, 100 100, 0')
	})

	it('rounds coordinates to two decimals', () => {
		const b = new CubicBezier2d({
			start: new Vec(0.123, 0),
			cp1: new Vec(1.006, 2),
			cp2: new Vec(3, 4.999),
			end: new Vec(10, 10),
		})
		expect(b.getSvgPathData()).toBe('M 0.12, 0  C1.01, 2 3, 5 10, 10')
	})

	it('does not mutate the stored points', () => {
		const start = new Vec(0.123, 0)
		const cp1 = new Vec(1.006, 2)
		const cp2 = new Vec(3, 4.999)
		const end = new Vec(10, 10.005)
		const b = new CubicBezier2d({ start, cp1, cp2, end })
		b.getSvgPathData()
		expect(start).toMatchObject({ x: 0.123, y: 0 })
		expect(cp1).toMatchObject({ x: 1.006, y: 2 })
		expect(cp2).toMatchObject({ x: 3, y: 4.999 })
		expect(end).toMatchObject({ x: 10, y: 10.005 })
	})
})
