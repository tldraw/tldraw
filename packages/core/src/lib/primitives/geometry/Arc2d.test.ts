import { Vec } from '../Vec'
import { Arc2d } from './Arc2d'

// A quarter circle of radius 10 centred at the origin, from (10, 0) clockwise (in screen
// space, i.e. with increasing angle) to (0, 10).
const quarter = () =>
	new Arc2d({
		center: new Vec(0, 0),
		start: new Vec(10, 0),
		end: new Vec(0, 10),
		sweepFlag: 1,
		largeArcFlag: 0,
	})

// The complementary three-quarter arc between the same points, going the other way round.
const threeQuarter = () =>
	new Arc2d({
		center: new Vec(0, 0),
		start: new Vec(10, 0),
		end: new Vec(0, 10),
		sweepFlag: 0,
		largeArcFlag: 1,
	})

function expectVec(actual: Vec, expected: { x: number; y: number }) {
	expect(actual.x).toBeCloseTo(expected.x)
	expect(actual.y).toBeCloseTo(expected.y)
}

describe('Arc2d construction', () => {
	it('is never closed or filled', () => {
		expect(quarter()).toMatchObject({ isClosed: false, isFilled: false })
	})

	it('throws when start and end are the same point', () => {
		expect(
			() =>
				new Arc2d({
					center: new Vec(0, 0),
					start: new Vec(10, 0),
					end: new Vec(10, 0),
					sweepFlag: 1,
					largeArcFlag: 0,
				})
		).toThrow('Arc must have different start and end points.')
	})
})

describe('Arc2d.getLength', () => {
	it('is the arc measure times the radius', () => {
		expect(quarter().length).toBeCloseTo((Math.PI / 2) * 10)
		expect(threeQuarter().length).toBeCloseTo(((3 * Math.PI) / 2) * 10)
	})

	it('is half a circumference for a semicircle in either direction', () => {
		const semi = new Arc2d({
			center: new Vec(25, 25),
			start: new Vec(25, 50),
			end: new Vec(25, 0),
			sweepFlag: 1,
			largeArcFlag: 1,
		})
		expect(semi.length).toBeCloseTo(Math.PI * 25)
	})
})

describe('Arc2d.getVertices', () => {
	it('samples at least eight segments from start to end', () => {
		const { vertices } = quarter()
		expect(vertices.length).toBe(9)
		expectVec(vertices[0], { x: 10, y: 0 })
		expectVec(vertices[4], { x: 10 / Math.SQRT2, y: 10 / Math.SQRT2 })
		expectVec(vertices[8], { x: 0, y: 10 })
	})

	it('keeps every vertex on the circle', () => {
		for (const v of quarter().vertices) {
			expect(Vec.Dist(v, new Vec(0, 0))).toBeCloseTo(10)
		}
	})

	it('walks the long way round for a large arc', () => {
		const { vertices } = threeQuarter()
		expect(vertices.length).toBe(9)
		expectVec(vertices[0], { x: 10, y: 0 })
		// the midpoint of the long arc is opposite the midpoint of the short arc
		expectVec(vertices[4], { x: -10 / Math.SQRT2, y: -10 / Math.SQRT2 })
		expectVec(vertices[8], { x: 0, y: 10 })
	})

	it('samples more vertices for longer arcs', () => {
		const big = new Arc2d({
			center: new Vec(0, 0),
			start: new Vec(100, 0),
			end: new Vec(0, 100),
			sweepFlag: 1,
			largeArcFlag: 0,
		})
		// length is 50π ≈ 157, one vertex per 20 units -> 8 segments
		expect(big.vertices.length).toBe(9)
		const bigger = new Arc2d({
			center: new Vec(0, 0),
			start: new Vec(200, 0),
			end: new Vec(0, 200),
			sweepFlag: 1,
			largeArcFlag: 0,
		})
		// length is 100π ≈ 314 -> 16 segments
		expect(bigger.vertices.length).toBe(17)
	})
})

describe('Arc2d.bounds', () => {
	it('is the box around the sampled vertices', () => {
		const { bounds } = quarter()
		expect(bounds.x).toBeCloseTo(0)
		expect(bounds.y).toBeCloseTo(0)
		expect(bounds.w).toBeCloseTo(10)
		expect(bounds.h).toBeCloseTo(10)
	})
})

describe('Arc2d.nearestPoint', () => {
	it('projects radially onto the arc when the angle is within the sweep', () => {
		expectVec(quarter().nearestPoint(new Vec(5, 5)), { x: 10 / Math.SQRT2, y: 10 / Math.SQRT2 })
		expectVec(quarter().nearestPoint(new Vec(20, 20)), {
			x: 10 / Math.SQRT2,
			y: 10 / Math.SQRT2,
		})
	})

	it('returns the start point for angles before the arc', () => {
		expect(quarter().nearestPoint(new Vec(20, -5))).toMatchObject({ x: 10, y: 0 })
		expect(quarter().nearestPoint(new Vec(20, 0))).toMatchObject({ x: 10, y: 0 })
	})

	it('returns the end point for angles after the arc', () => {
		expect(quarter().nearestPoint(new Vec(-5, 20))).toMatchObject({ x: 0, y: 10 })
		expect(quarter().nearestPoint(new Vec(0, 20))).toMatchObject({ x: 0, y: 10 })
	})

	it('returns the start point for the centre itself', () => {
		expect(quarter().nearestPoint(new Vec(0, 0))).toMatchObject({ x: 10, y: 0 })
	})

	it('projects onto the long arc', () => {
		expectVec(threeQuarter().nearestPoint(new Vec(-20, 0)), { x: -10, y: 0 })
		expectVec(threeQuarter().nearestPoint(new Vec(0, -3)), { x: 0, y: -10 })
		// a point in the gap of the long arc snaps to the nearer end point
		expect(threeQuarter().nearestPoint(new Vec(20, 5))).toMatchObject({ x: 10, y: 0 })
	})
})

describe('Arc2d.distanceToPoint', () => {
	it('measures to the arc or its end points', () => {
		expect(quarter().distanceToPoint(new Vec(20, 20))).toBeCloseTo(Math.hypot(20, 20) - 10)
		expect(quarter().distanceToPoint(new Vec(20, 0))).toBe(10)
		expect(quarter().distanceToPoint(new Vec(0, 0))).toBe(10)
	})

	it('is never negative because an arc has no interior', () => {
		expect(quarter().distanceToPoint(new Vec(1, 1), true)).toBeGreaterThan(0)
	})
})

describe('Arc2d.hitTestPoint', () => {
	it('hits points on the arc within the margin', () => {
		expect(quarter().hitTestPoint(new Vec(10 / Math.SQRT2, 10 / Math.SQRT2), 0.001)).toBe(true)
		expect(quarter().hitTestPoint(new Vec(10, 0))).toBe(true)
		expect(quarter().hitTestPoint(new Vec(5, 5), 3)).toBe(true)
		expect(quarter().hitTestPoint(new Vec(5, 5), 2)).toBe(false)
	})

	it('does not hit the sector inside the arc even with hitInside', () => {
		expect(quarter().hitTestPoint(new Vec(5, 5), 0, true)).toBe(false)
	})
})

describe('Arc2d.hitTestLineSegment', () => {
	it('hits a segment crossing the arc', () => {
		expect(quarter().hitTestLineSegment(new Vec(5, 0), new Vec(5, 20))).toBe(true)
	})

	it('misses a segment crossing the circle outside the arc', () => {
		// crosses the circle at (-5, 8.66), which is at 120° and not on the quarter arc
		expect(quarter().hitTestLineSegment(new Vec(-5, 0), new Vec(-5, 20))).toBe(false)
		// but it is on the complementary arc
		expect(threeQuarter().hitTestLineSegment(new Vec(-5, 0), new Vec(-5, 20))).toBe(true)
	})

	it('misses a segment that does not reach the circle', () => {
		expect(quarter().hitTestLineSegment(new Vec(20, 20), new Vec(30, 30))).toBe(false)
		expect(quarter().hitTestLineSegment(new Vec(1, 1), new Vec(2, 2))).toBe(false)
	})

	// Locks in current behaviour, see #10555.
	it('hits crossings just beyond the end points (known quirk)', () => {
		// (5, -8.66) is at -60°, off the quarter arc, but getPointInArcT clamps it to the start
		expect(quarter().hitTestLineSegment(new Vec(5, -20), new Vec(5, 0))).toBe(true)
	})

	it('checks both directions of the long arc', () => {
		expect(threeQuarter().hitTestLineSegment(new Vec(5, -20), new Vec(5, 0))).toBe(true)
		expect(threeQuarter().hitTestLineSegment(new Vec(5, 0), new Vec(5, 20))).toBe(false)
	})
})

describe('Arc2d.getSvgPathData', () => {
	it('emits a move and an arc command with the flags', () => {
		expect(quarter().getSvgPathData()).toBe('M10, 0 A10 10 0 0 1 0, 10')
		expect(threeQuarter().getSvgPathData()).toBe('M10, 0 A10 10 0 1 0 0, 10')
	})

	it('omits the move command when not first', () => {
		expect(quarter().getSvgPathData(false)).toBe(' A10 10 0 0 1 0, 10')
	})

	it('rounds coordinates to two decimals', () => {
		const arc = new Arc2d({
			center: new Vec(0, 0),
			start: new Vec(10, 0),
			end: new Vec(10 / Math.SQRT2, 10 / Math.SQRT2),
			sweepFlag: 1,
			largeArcFlag: 0,
		})
		expect(arc.getSvgPathData()).toBe('M10, 0 A10 10 0 0 1 7.07, 7.07')
	})

	it('does not mutate the stored points', () => {
		const start = new Vec(10, 0)
		const end = new Vec(10 / Math.SQRT2, 10 / Math.SQRT2)
		const arc = new Arc2d({ center: new Vec(0, 0), start, end, sweepFlag: 1, largeArcFlag: 0 })
		arc.getSvgPathData()
		expect(start).toMatchObject({ x: 10, y: 0 })
		expect(end).toMatchObject({ x: 10 / Math.SQRT2, y: 10 / Math.SQRT2 })
	})
})
