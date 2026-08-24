import { Vec } from '../Vec'
import { Stadium2d } from './Stadium2d'

// A wide 100x50 stadium: semicircles of radius 25 centred at (25, 25) and (75, 25)
const wide = () => new Stadium2d({ width: 100, height: 50, isFilled: false })
const wideFilled = () => new Stadium2d({ width: 100, height: 50, isFilled: true })
// A tall 50x100 stadium: semicircles of radius 25 centred at (25, 25) and (25, 75)
const tall = () => new Stadium2d({ width: 50, height: 100, isFilled: false })

function expectVec(actual: Vec, expected: { x: number; y: number }) {
	expect(actual.x).toBeCloseTo(expected.x)
	expect(actual.y).toBeCloseTo(expected.y)
}

describe('Stadium2d construction', () => {
	it('is always closed and keeps the fill flag from config', () => {
		expect(wide()).toMatchObject({ isClosed: true, isFilled: false })
		expect(wideFilled()).toMatchObject({ isClosed: true, isFilled: true })
	})
})

describe('Stadium2d.bounds', () => {
	it('is the width by height box at the origin', () => {
		expect(wide().bounds).toMatchObject({ x: 0, y: 0, w: 100, h: 50 })
		expect(wide().center).toMatchObject({ x: 50, y: 25 })
		expect(tall().bounds).toMatchObject({ x: 0, y: 0, w: 50, h: 100 })
	})
})

describe('Stadium2d.getLength', () => {
	it('is two straight sides plus a full circle', () => {
		expect(wide().length).toBeCloseTo(2 * 50 + Math.PI * 50)
		expect(tall().length).toBeCloseTo(2 * 50 + Math.PI * 50)
	})

	it('is a circle circumference when width equals height', () => {
		expect(new Stadium2d({ width: 50, height: 50, isFilled: false }).length).toBeCloseTo(
			Math.PI * 50
		)
	})
})

describe('Stadium2d.getVertices', () => {
	it('concatenates the vertices of the two arcs and two edges', () => {
		const { vertices } = wide()
		// each semicircle samples the minimum 8 segments (9 vertices), each edge has 2
		expect(vertices.length).toBe(9 + 2 + 9 + 2)
		// left arc runs from the bottom to the top through the leftmost point
		expectVec(vertices[0], { x: 25, y: 50 })
		expectVec(vertices[4], { x: 0, y: 25 })
		expectVec(vertices[8], { x: 25, y: 0 })
		// top edge
		expect(vertices[9]).toMatchObject({ x: 25, y: 0 })
		expect(vertices[10]).toMatchObject({ x: 75, y: 0 })
		// right arc runs from the top to the bottom through the rightmost point
		expectVec(vertices[11], { x: 75, y: 0 })
		expectVec(vertices[15], { x: 100, y: 25 })
		expectVec(vertices[19], { x: 75, y: 50 })
		// bottom edge
		expect(vertices[20]).toMatchObject({ x: 75, y: 50 })
		expect(vertices[21]).toMatchObject({ x: 25, y: 50 })
	})

	it('keeps every vertex inside the bounds', () => {
		for (const s of [wide(), tall()]) {
			for (const v of s.vertices) {
				expect(v.x).toBeGreaterThanOrEqual(-1e-9)
				expect(v.y).toBeGreaterThanOrEqual(-1e-9)
				expect(v.x).toBeLessThanOrEqual(s.bounds.w + 1e-9)
				expect(v.y).toBeLessThanOrEqual(s.bounds.h + 1e-9)
			}
		}
	})

	it('starts a tall stadium with the top arc from left to right', () => {
		const { vertices } = tall()
		expectVec(vertices[0], { x: 0, y: 25 })
		expectVec(vertices[4], { x: 25, y: 0 })
		expectVec(vertices[8], { x: 50, y: 25 })
		expect(vertices[10]).toMatchObject({ x: 50, y: 75 })
		expectVec(vertices[15], { x: 25, y: 100 })
		expect(vertices[21]).toMatchObject({ x: 0, y: 25 })
	})
})

describe('Stadium2d.nearestPoint', () => {
	it('projects onto the straight edges', () => {
		expect(wide().nearestPoint(new Vec(50, -10))).toMatchObject({ x: 50, y: 0 })
		expect(wide().nearestPoint(new Vec(50, 60))).toMatchObject({ x: 50, y: 50 })
		expect(tall().nearestPoint(new Vec(-10, 50))).toMatchObject({ x: 0, y: 50 })
	})

	it('projects radially onto the arcs', () => {
		expectVec(wide().nearestPoint(new Vec(-10, 25)), { x: 0, y: 25 })
		expectVec(wide().nearestPoint(new Vec(110, 25)), { x: 100, y: 25 })
		expectVec(tall().nearestPoint(new Vec(25, -10)), { x: 25, y: 0 })
		// towards the top-left corner of the bounds the nearest point is on the arc, not the corner
		const p = wide().nearestPoint(new Vec(0, 0))
		expectVec(p, { x: 25 - 25 / Math.SQRT2, y: 25 - 25 / Math.SQRT2 })
	})

	it('projects from inside', () => {
		expect(wide().nearestPoint(new Vec(50, 20))).toMatchObject({ x: 50, y: 0 })
	})
})

describe('Stadium2d.distanceToPoint', () => {
	it('is positive outside', () => {
		expect(wide().distanceToPoint(new Vec(50, -10))).toBe(10)
		expect(wide().distanceToPoint(new Vec(-10, 25))).toBeCloseTo(10)
		expect(wideFilled().distanceToPoint(new Vec(50, -10))).toBe(10)
	})

	it('is negative inside only when filled or hitInside', () => {
		expect(wide().distanceToPoint(new Vec(50, 25))).toBe(25)
		expect(wideFilled().distanceToPoint(new Vec(50, 25))).toBe(-25)
		expect(wide().distanceToPoint(new Vec(50, 25), true)).toBe(-25)
	})

	it('measures to the arc inside the rounded corners', () => {
		// (5, 5) is inside the bounds but outside the left semicircle
		expect(wide().distanceToPoint(new Vec(5, 5))).toBeCloseTo(Math.hypot(20, 20) - 25)
		expect(wideFilled().distanceToPoint(new Vec(5, 5))).toBeCloseTo(Math.hypot(20, 20) - 25)
	})
})

describe('Stadium2d.hitTestPoint', () => {
	it('hits the interior only when filled or hitInside', () => {
		expect(wideFilled().hitTestPoint(new Vec(50, 25))).toBe(true)
		expect(wide().hitTestPoint(new Vec(50, 25))).toBe(false)
		expect(wide().hitTestPoint(new Vec(50, 25), 0, true)).toBe(true)
	})

	it('misses the rounded corners even when filled', () => {
		expect(wideFilled().hitTestPoint(new Vec(5, 5))).toBe(false)
		expect(wideFilled().hitTestPoint(new Vec(95, 45))).toBe(false)
	})

	it('hits the rounded corners within the margin', () => {
		const d = Math.hypot(20, 20) - 25 // ≈ 3.28
		expect(wide().hitTestPoint(new Vec(5, 5), d + 0.01)).toBe(true)
		expect(wide().hitTestPoint(new Vec(5, 5), d - 0.01)).toBe(false)
	})

	it('hits the straight edge and respects the margin', () => {
		expect(wide().hitTestPoint(new Vec(50, 0))).toBe(true)
		expect(wide().hitTestPoint(new Vec(50, -5), 5)).toBe(true)
		expect(wide().hitTestPoint(new Vec(50, -5), 4)).toBe(false)
	})
})

describe('Stadium2d.hitTestLineSegment', () => {
	it('hits a segment crossing a straight edge', () => {
		expect(wide().hitTestLineSegment(new Vec(50, -10), new Vec(50, 60))).toBe(true)
	})

	it('hits a segment crossing an arc', () => {
		expect(wide().hitTestLineSegment(new Vec(-10, 25), new Vec(10, 25))).toBe(true)
		// the diagonal from the bounds corner reaches the arc at t ≈ 7.3
		expect(wide().hitTestLineSegment(new Vec(0, 0), new Vec(10, 10))).toBe(true)
	})

	it('misses a segment that stays within a rounded corner gap', () => {
		expect(wide().hitTestLineSegment(new Vec(0, 0), new Vec(5, 5))).toBe(false)
	})

	it('misses segments entirely outside or entirely inside', () => {
		expect(wide().hitTestLineSegment(new Vec(110, 0), new Vec(110, 50))).toBe(false)
		expect(wideFilled().hitTestLineSegment(new Vec(40, 25), new Vec(45, 25))).toBe(false)
		expect(wideFilled().hitTestLineSegment(new Vec(45, 2), new Vec(55, 2))).toBe(false)
	})

	// Locks in current behaviour, see #10555.
	it('hits an interior segment that crosses the far side of an arc circle (known quirk)', () => {
		// (50, 25) is on the left arc's circle but opposite the arc itself; Arc2d clamps points on
		// the complementary arc to the nearest end point, so the crossing counts as a hit
		expect(wideFilled().hitTestLineSegment(new Vec(30, 25), new Vec(70, 25))).toBe(true)
	})
})

describe('Stadium2d.getSvgPathData', () => {
	it('draws arc, line, arc, line and closes', () => {
		expect(wide().getSvgPathData()).toBe(
			'M25, 50 A25 25 0 1 1 25, 0  L75, 0  A25 25 0 1 1 75, 50  L25, 50 Z'
		)
	})

	it('draws a tall stadium starting from the left of the top arc', () => {
		expect(tall().getSvgPathData()).toBe(
			'M0, 25 A25 25 0 1 1 50, 25  L50, 75  A25 25 0 1 1 0, 75  L0, 25 Z'
		)
	})
})
