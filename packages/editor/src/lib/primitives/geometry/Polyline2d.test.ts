import { Vec } from '../Vec'
import { Polygon2d } from './Polygon2d'
import { Polyline2d } from './Polyline2d'

// An L shape: right along the top for 100, then down for 100
const points = () => [new Vec(0, 0), new Vec(100, 0), new Vec(100, 100)]
const polyline = () => new Polyline2d({ points: points() })

describe('Polyline2d construction', () => {
	it('is open and unfilled', () => {
		expect(polyline()).toMatchObject({ isClosed: false, isFilled: false })
	})

	it('passes through the other options', () => {
		const p = new Polyline2d({ points: points(), isLabel: true, debugColor: 'red', ignore: true })
		expect(p).toMatchObject({ isLabel: true, debugColor: 'red', ignore: true })
	})

	it('throws with fewer than two points', () => {
		expect(() => new Polyline2d({ points: [] })).toThrow(
			'Polyline2d: points must be an array of at least 2 points'
		)
		expect(() => new Polyline2d({ points: [new Vec(0, 0)] })).toThrow(
			'Polyline2d: points must be an array of at least 2 points'
		)
	})
})

describe('Polyline2d.getVertices', () => {
	it('returns the points as given', () => {
		const pts = points()
		expect(new Polyline2d({ points: pts }).vertices).toBe(pts)
	})
})

describe('Polyline2d.bounds', () => {
	it('spans the points', () => {
		expect(polyline().bounds).toMatchObject({ x: 0, y: 0, w: 100, h: 100 })
		expect(polyline().center).toMatchObject({ x: 50, y: 50 })
	})

	it('handles offset points', () => {
		const p = new Polyline2d({ points: [new Vec(10, 20), new Vec(30, -5)] })
		expect(p.bounds).toMatchObject({ x: 10, y: -5, w: 20, h: 25 })
	})
})

describe('Polyline2d.getLength', () => {
	it('sums the segment lengths without closing', () => {
		expect(polyline().length).toBe(200)
	})

	it('is zero for coincident points', () => {
		expect(new Polyline2d({ points: [new Vec(5, 5), new Vec(5, 5)] }).length).toBe(0)
	})
})

describe('Polyline2d.area', () => {
	it('is zero because the shape is open', () => {
		expect(polyline().area).toBe(0)
	})
})

describe('Polyline2d.nearestPoint', () => {
	it('projects onto the nearest segment', () => {
		expect(polyline().nearestPoint(new Vec(50, 10))).toMatchObject({ x: 50, y: 0 })
		expect(polyline().nearestPoint(new Vec(110, 50))).toMatchObject({ x: 100, y: 50 })
		expect(polyline().nearestPoint(new Vec(90, 50))).toMatchObject({ x: 100, y: 50 })
	})

	it('clamps to the end points', () => {
		expect(polyline().nearestPoint(new Vec(-10, -10))).toMatchObject({ x: 0, y: 0 })
		expect(polyline().nearestPoint(new Vec(150, 150))).toMatchObject({ x: 100, y: 100 })
	})

	it('prefers the earlier segment on a tie', () => {
		expect(polyline().nearestPoint(new Vec(50, 50))).toMatchObject({ x: 50, y: 0 })
	})

	it('does not use the closing segment', () => {
		// the closing segment (100, 100) -> (0, 0) would pass through (25, 25)
		expect(polyline().nearestPoint(new Vec(20, 30))).toMatchObject({ x: 20, y: 0 })
	})

	it('handles zero length segments', () => {
		const p = new Polyline2d({ points: [new Vec(5, 5), new Vec(5, 5)] })
		expect(p.nearestPoint(new Vec(10, 10))).toMatchObject({ x: 5, y: 5 })
	})

	it('returns a new vector rather than one of the points', () => {
		const pts = points()
		const p = new Polyline2d({ points: pts })
		const nearest = p.nearestPoint(new Vec(-10, -10))
		expect(nearest).toEqual(pts[0])
		expect(nearest).not.toBe(pts[0])
	})
})

describe('Polyline2d.distanceToPoint', () => {
	it('is the distance to the nearest segment', () => {
		expect(polyline().distanceToPoint(new Vec(50, 10))).toBe(10)
		expect(polyline().distanceToPoint(new Vec(50, 50))).toBe(50)
		expect(polyline().distanceToPoint(new Vec(-3, -4))).toBe(5)
	})

	it('is never negative for an open polyline, even with hitInside', () => {
		expect(polyline().distanceToPoint(new Vec(90, 10), true)).toBe(10)
	})
})

describe('Polyline2d.hitTestPoint', () => {
	it('hits points on the line', () => {
		expect(polyline().hitTestPoint(new Vec(50, 0))).toBe(true)
		expect(polyline().hitTestPoint(new Vec(100, 100))).toBe(true)
	})

	it('respects the margin', () => {
		expect(polyline().hitTestPoint(new Vec(50, 10), 10)).toBe(true)
		expect(polyline().hitTestPoint(new Vec(50, 10), 9)).toBe(false)
	})

	it('ignores hitInside because the shape is open', () => {
		expect(polyline().hitTestPoint(new Vec(90, 10), 0, true)).toBe(false)
	})
})

describe('Polyline2d.hitTestLineSegment', () => {
	it('hits a segment crossing the line', () => {
		expect(polyline().hitTestLineSegment(new Vec(50, -10), new Vec(50, 10))).toBe(true)
		expect(polyline().hitTestLineSegment(new Vec(90, 50), new Vec(110, 50))).toBe(true)
	})

	it('misses a segment inside the corner that does not cross', () => {
		expect(polyline().hitTestLineSegment(new Vec(50, 10), new Vec(90, 90))).toBe(false)
	})

	it('misses a segment crossing only the closing segment', () => {
		expect(polyline().hitTestLineSegment(new Vec(20, 30), new Vec(30, 20))).toBe(false)
	})

	it('respects the distance from a vertex', () => {
		expect(polyline().hitTestLineSegment(new Vec(100, -10), new Vec(120, -10), 10)).toBe(true)
		expect(polyline().hitTestLineSegment(new Vec(100, -10), new Vec(120, -10), 9)).toBe(false)
	})

	// Locks in current behaviour, see #10556.
	it('measures the distance from the vertices, not the edges (known quirk)', () => {
		// the segment is 10 units from the middle of the top edge but 41 from the nearest vertex
		expect(polyline().hitTestLineSegment(new Vec(40, 10), new Vec(60, 10), 10)).toBe(false)
		expect(polyline().hitTestLineSegment(new Vec(40, 10), new Vec(60, 10), 42)).toBe(true)
	})
})

describe('Polyline2d.intersectLineSegment', () => {
	it('does not intersect the closing segment', () => {
		expect(polyline().intersectLineSegment(new Vec(50, -10), new Vec(50, 10))).toEqual([
			{ x: 50, y: 0, z: 1 },
		])
		expect(polyline().intersectLineSegment(new Vec(20, 30), new Vec(30, 20))).toEqual([])
	})
})

describe('Polyline2d.interpolateAlongEdge', () => {
	it('walks along the segments', () => {
		expect(polyline().interpolateAlongEdge(0)).toMatchObject({ x: 0, y: 0 })
		expect(polyline().interpolateAlongEdge(0.25)).toMatchObject({ x: 50, y: 0 })
		expect(polyline().interpolateAlongEdge(0.75)).toMatchObject({ x: 100, y: 50 })
		expect(polyline().interpolateAlongEdge(1)).toMatchObject({ x: 100, y: 100 })
	})

	it('is inverted by uninterpolateAlongEdge', () => {
		expect(polyline().uninterpolateAlongEdge(new Vec(50, 0))).toBe(0.25)
		expect(polyline().uninterpolateAlongEdge(new Vec(100, 50))).toBe(0.75)
		expect(polyline().uninterpolateAlongEdge(new Vec(120, 50))).toBe(0.75)
	})
})

describe('Polyline2d.getSvgPathData', () => {
	it('emits a move followed by line commands', () => {
		expect(polyline().getSvgPathData()).toBe('M 0 0 L 100 0 L 100 100')
	})
})

describe('Polyline2d when closed (via Polygon2d)', () => {
	const closed = (isFilled = false) => new Polygon2d({ points: points(), isFilled })

	it('uses the closing segment for the nearest point', () => {
		expect(closed().nearestPoint(new Vec(20, 30))).toMatchObject({ x: 25, y: 25 })
		expect(closed().length).toBeCloseTo(200 + Math.hypot(100, 100))
	})

	it('returns a negative distance inside when filled or hitInside', () => {
		expect(closed().distanceToPoint(new Vec(90, 10))).toBe(10)
		expect(closed().distanceToPoint(new Vec(90, 10), true)).toBe(-10)
		expect(closed(true).distanceToPoint(new Vec(90, 10))).toBe(-10)
	})

	it('hits the interior when filled', () => {
		expect(closed(true).hitTestPoint(new Vec(90, 10))).toBe(true)
		expect(closed().hitTestPoint(new Vec(90, 10))).toBe(false)
		expect(closed().hitTestPoint(new Vec(90, 10), 0, true)).toBe(true)
	})

	it('hits segments crossing the closing segment', () => {
		expect(closed().hitTestLineSegment(new Vec(20, 30), new Vec(30, 20))).toBe(true)
	})
})
