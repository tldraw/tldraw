import {
	angleDistance,
	approximately,
	approximatelyLte,
	areAnglesCompatible,
	average,
	canonicalizeRotation,
	centerOfCircleFromThreePoints,
	clamp,
	clampRadians,
	clockwiseAngleDist,
	counterClockwiseAngleDist,
	degreesToRadians,
	getArcMeasure,
	getPointInArcT,
	getPointOnCircle,
	getPointsOnArc,
	getPolygonVertices,
	HALF_PI,
	isSafeFloat,
	perimeterOfEllipse,
	PI,
	PI2,
	pointInPolygon,
	precise,
	radiansToDegrees,
	rangeIntersection,
	rangesOverlap,
	shortAngleDist,
	snapAngle,
	toDomPrecision,
	toFixed,
	toPrecision,
} from './utils'
import { Vec } from './Vec'

describe('getPointInArcT', () => {
	it('should return 0 for the start of the arc', () => {
		const mAB = Math.PI / 2 // 90 degrees
		const A = 0 // Start angle
		const B = Math.PI / 2 // End angle
		const P = 0 // Point angle, same as start
		expect(getPointInArcT(mAB, A, B, P)).toBe(0)
	})

	it('should return 1 for the end of the arc', () => {
		const mAB = Math.PI / 2 // 90 degrees
		const A = 0 // Start angle
		const B = Math.PI / 2 // End angle
		const P = Math.PI / 2 // Point angle, same as end
		expect(getPointInArcT(mAB, A, B, P)).toBe(1)
	})

	it('should return 0.5 for the midpoint of the arc', () => {
		const mAB = Math.PI // 180 degrees
		const A = 0 // Start angle
		const B = Math.PI // End angle
		const P = Math.PI / 2 // Point angle, midpoint
		expect(getPointInArcT(mAB, A, B, P)).toBe(0.5)
	})

	it('should handle negative arcs correctly', () => {
		const mAB = -Math.PI / 2 // -90 degrees, counter-clockwise
		const A = Math.PI / 2 // Start angle
		const B = 0 // End angle
		const P = Math.PI / 4 // Point angle, quarter way
		expect(getPointInArcT(mAB, A, B, P)).toBe(0.5)
	})

	it('should return correct t value for arcs larger than PI', () => {
		const mAB = Math.PI * 1.5 // 270 degrees
		const A = 0 // Start angle
		const B = -Math.PI / 2 // End angle, going counter-clockwise
		const P = -Math.PI / 4 // Point angle, halfway
		expect(getPointInArcT(mAB, A, B, P)).toBe(7 / 6)
	})

	it('should handle edge case where measurement to center is negative but measure to points near the end are positive', () => {
		const mAB = -2.8 // Arc measure
		const A = 0 // Start angle
		const B = 2.2 // End angle
		const P = 1.1 // Point angle, should be near the end
		expect(getPointInArcT(mAB, A, B, P)).toBe(0)
	})

	it('should handle edge case where measurement to center is negative but measure to points near the end are positive with other endpoint', () => {
		const mAB = 0 // Arc measure
		const A = 0 // Start angle
		const B = 2.2 // End angle
		const P = 1.1 // Point angle, should be near the end
		expect(getPointInArcT(mAB, A, B, P)).toBe(1)
	})
})

describe('areAnglesCompatible', () => {
	it('treats angles a multiple of PI/2 apart as compatible regardless of sign', () => {
		expect(areAnglesCompatible(-Math.PI / 4, Math.PI / 4)).toBe(true)
		expect(areAnglesCompatible(Math.PI / 2 - 1e-9, 0)).toBe(true)
		expect(areAnglesCompatible(Math.PI, -Math.PI / 2)).toBe(true)
		expect(areAnglesCompatible(0, Math.PI / 3)).toBe(false)
	})
})

describe('precise and average', () => {
	it('formats a point to DOM precision with a trailing space', () => {
		expect(precise({ x: 1.23456789, y: 2 })).toBe('1.2346,2 ')
		expect(precise(new Vec(-0.00004, 10))).toBe('0,10 ')
	})

	it('formats the midpoint of two points', () => {
		expect(average({ x: 0, y: 0 }, { x: 10, y: 5 })).toBe('5,2.5 ')
		expect(average({ x: 1.11111, y: 0 }, { x: 2.22222, y: 0 })).toBe('1.6667,0 ')
	})
})

describe('clamp', () => {
	it('clamps to a minimum when no max is given', () => {
		expect(clamp(0, 1)).toBe(1)
		expect(clamp(5, 1)).toBe(5)
		expect(clamp(-5, 0)).toBe(0)
	})

	it('clamps into a range', () => {
		expect(clamp(0, 1, 10)).toBe(1)
		expect(clamp(11, 1, 10)).toBe(10)
		expect(clamp(5, 1, 10)).toBe(5)
	})
})

describe('toPrecision', () => {
	it('rounds to ten decimal places by default', () => {
		expect(toPrecision(1.23456789012345)).toBe(1.2345678901)
	})

	it('accepts a custom precision', () => {
		expect(toPrecision(1.23456, 100)).toBe(1.23)
	})

	it('returns 0 for falsy input', () => {
		expect(toPrecision(0)).toBe(0)
		expect(toPrecision(NaN)).toBe(0)
	})
})

describe('approximately and approximatelyLte', () => {
	it('compares within the default tolerance', () => {
		expect(approximately(1, 1.0000001)).toBe(true)
		expect(approximately(1, 1.1)).toBe(false)
		expect(approximately(1, 1.05, 0.1)).toBe(true)
	})

	it('treats nearly-equal values as less than or equal', () => {
		expect(approximatelyLte(1, 2)).toBe(true)
		expect(approximatelyLte(2, 1)).toBe(false)
		expect(approximatelyLte(1.0000001, 1)).toBe(true)
	})
})

describe('perimeterOfEllipse', () => {
	it('matches the circumference of a circle when the radii are equal', () => {
		expect(perimeterOfEllipse(5, 5)).toBeCloseTo(2 * PI * 5, 10)
	})

	it('approximates the perimeter of an ellipse', () => {
		expect(perimeterOfEllipse(10, 5)).toBeCloseTo(48.442, 2)
	})
})

describe('angle helpers', () => {
	it('canonicalizes rotations into [0, 2PI)', () => {
		expect(canonicalizeRotation(-HALF_PI)).toBeCloseTo(PI2 - HALF_PI, 10)
		expect(canonicalizeRotation(3 * PI)).toBeCloseTo(PI, 10)
		expect(canonicalizeRotation(PI / 4)).toBe(PI / 4)
		expect(Object.is(canonicalizeRotation(-PI2), 0)).toBe(true)
		expect(Object.is(canonicalizeRotation(0), 0)).toBe(true)
	})

	it('measures clockwise and counter-clockwise angle distances', () => {
		expect(clockwiseAngleDist(0, HALF_PI)).toBeCloseTo(HALF_PI, 10)
		expect(clockwiseAngleDist(HALF_PI, 0)).toBeCloseTo(3 * HALF_PI, 10)
		expect(clockwiseAngleDist(-HALF_PI, 0)).toBeCloseTo(HALF_PI, 10)
		expect(counterClockwiseAngleDist(0, HALF_PI)).toBeCloseTo(3 * HALF_PI, 10)
		expect(counterClockwiseAngleDist(HALF_PI, 0)).toBeCloseTo(HALF_PI, 10)
	})

	it('picks the direction of travel from the sign in angleDistance', () => {
		expect(angleDistance(0, HALF_PI, -1)).toBeCloseTo(HALF_PI, 10)
		expect(angleDistance(0, HALF_PI, 1)).toBeCloseTo(3 * HALF_PI, 10)
	})

	it('finds the signed short distance between two angles', () => {
		expect(shortAngleDist(0, HALF_PI)).toBeCloseTo(HALF_PI, 10)
		expect(shortAngleDist(HALF_PI, 0)).toBeCloseTo(-HALF_PI, 10)
		expect(shortAngleDist(0, 3 * HALF_PI)).toBeCloseTo(-HALF_PI, 10)
	})

	it('clamps radians into [0, 2PI)', () => {
		expect(clampRadians(-HALF_PI)).toBeCloseTo(3 * HALF_PI, 10)
		expect(clampRadians(3 * PI)).toBeCloseTo(PI, 10)
		expect(clampRadians(PI / 4)).toBeCloseTo(PI / 4, 10)
	})

	it('converts between degrees and radians', () => {
		expect(degreesToRadians(180)).toBe(PI)
		expect(degreesToRadians(90)).toBe(HALF_PI)
		expect(degreesToRadians(-45)).toBe(-PI / 4)
		expect(radiansToDegrees(PI)).toBe(180)
		expect(radiansToDegrees(HALF_PI)).toBe(90)
		expect(radiansToDegrees(-PI / 4)).toBe(-45)
		expect(radiansToDegrees(degreesToRadians(33))).toBeCloseTo(33, 10)
	})
})

describe('snapAngle', () => {
	it('snaps to the nearest segment and returns a value in (-PI, PI]', () => {
		expect(snapAngle(0.1, 4)).toBeCloseTo(0, 10)
		expect(snapAngle(-0.1, 4)).toBeCloseTo(0, 10)
		expect(snapAngle(HALF_PI + 0.1, 4)).toBeCloseTo(HALF_PI, 10)
		expect(snapAngle(PI - 0.1, 4)).toBeCloseTo(PI, 10)
		expect(snapAngle(PI + 0.1, 4)).toBeCloseTo(PI, 10)
		expect(snapAngle(-HALF_PI + 0.1, 4)).toBeCloseTo(-HALF_PI, 10)
	})

	it('uses the segment count to size the snap increments', () => {
		expect(snapAngle(PI / 4 + 0.05, 8)).toBeCloseTo(PI / 4, 10)
		expect(snapAngle(PI / 4 + 0.05, 4)).toBeCloseTo(HALF_PI, 10)
	})
})

describe('getPointOnCircle', () => {
	it('returns points on the perimeter at the given angle', () => {
		const center = { x: 10, y: 10 }
		expect(getPointOnCircle(center, 5, 0)).toMatchObject({ x: 15, y: 10 })
		const quarter = getPointOnCircle(center, 5, HALF_PI)
		expect(quarter.x).toBeCloseTo(10, 10)
		expect(quarter.y).toBeCloseTo(15, 10)
		const half = getPointOnCircle(center, 5, PI)
		expect(half.x).toBeCloseTo(5, 10)
		expect(half.y).toBeCloseTo(10, 10)
	})
})

describe('getPolygonVertices', () => {
	it('places a square with its first vertex at the top', () => {
		const verts = getPolygonVertices(100, 100, 4)
		const expected = [
			[50, 0],
			[100, 50],
			[50, 100],
			[0, 50],
		]
		expect(verts).toHaveLength(4)
		verts.forEach((v, i) => {
			expect(v.x).toBeCloseTo(expected[i][0], 10)
			expect(v.y).toBeCloseTo(expected[i][1], 10)
		})
	})

	it('stretches the vertices so they fill the requested bounds', () => {
		const verts = getPolygonVertices(100, 100, 3)
		const expected = [
			[50, 0],
			[100, 100],
			[0, 100],
		]
		verts.forEach((v, i) => {
			expect(v.x).toBeCloseTo(expected[i][0], 10)
			expect(v.y).toBeCloseTo(expected[i][1], 10)
		})
	})

	it('keeps every vertex inside the bounds for any side count', () => {
		for (const sides of [3, 5, 6, 7, 12]) {
			for (const v of getPolygonVertices(200, 80, sides)) {
				expect(v.x).toBeGreaterThanOrEqual(-1e-9)
				expect(v.x).toBeLessThanOrEqual(200 + 1e-9)
				expect(v.y).toBeGreaterThanOrEqual(-1e-9)
				expect(v.y).toBeLessThanOrEqual(80 + 1e-9)
			}
		}
	})

	it('returns no vertices for zero sides', () => {
		expect(getPolygonVertices(100, 100, 0)).toEqual([])
	})
})

describe('ranges', () => {
	it('detects overlapping ranges with exclusive endpoints', () => {
		expect(rangesOverlap(0, 10, 5, 15)).toBe(true)
		expect(rangesOverlap(5, 6, 0, 10)).toBe(true)
		expect(rangesOverlap(0, 10, 10, 20)).toBe(false)
		expect(rangesOverlap(0, 10, 20, 30)).toBe(false)
	})

	it('returns the intersection of two ranges or null', () => {
		expect(rangeIntersection(0, 10, 5, 15)).toEqual([5, 10])
		expect(rangeIntersection(0, 10, 2, 3)).toEqual([2, 3])
		expect(rangeIntersection(0, 10, 10, 20)).toEqual([10, 10])
		expect(rangeIntersection(0, 10, 20, 30)).toBeNull()
	})
})

describe('pointInPolygon', () => {
	const square = [
		{ x: 0, y: 0 },
		{ x: 10, y: 0 },
		{ x: 10, y: 10 },
		{ x: 0, y: 10 },
	]
	const lShape = [
		{ x: 0, y: 0 },
		{ x: 10, y: 0 },
		{ x: 10, y: 5 },
		{ x: 5, y: 5 },
		{ x: 5, y: 10 },
		{ x: 0, y: 10 },
	]

	it('detects points inside and outside a convex polygon', () => {
		expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true)
		expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false)
		expect(pointInPolygon({ x: 5, y: -1 }, square)).toBe(false)
	})

	it('treats a vertex as inside', () => {
		expect(pointInPolygon({ x: 10, y: 10 }, square)).toBe(true)
	})

	it('handles concave polygons', () => {
		expect(pointInPolygon({ x: 2, y: 7 }, lShape)).toBe(true)
		expect(pointInPolygon({ x: 7, y: 2 }, lShape)).toBe(true)
		expect(pointInPolygon({ x: 7, y: 7 }, lShape)).toBe(false)
	})

	it('returns false for an empty polygon', () => {
		expect(pointInPolygon({ x: 0, y: 0 }, [])).toBe(false)
	})
})

describe('rounding helpers', () => {
	it('rounds to four decimal places for the DOM', () => {
		expect(toDomPrecision(1.23456789)).toBe(1.2346)
		expect(toDomPrecision(-0.00004)).toBe(-0)
	})

	it('rounds to two decimal places', () => {
		expect(toFixed(1.236)).toBe(1.24)
		expect(toFixed(9.874)).toBe(9.87)
		expect(toFixed(3)).toBe(3)
	})

	it('flags floats beyond the safe integer range', () => {
		expect(isSafeFloat(123.456)).toBe(true)
		expect(isSafeFloat(-1e15)).toBe(true)
		expect(isSafeFloat(Number.MAX_SAFE_INTEGER)).toBe(false)
		expect(isSafeFloat(-Number.MAX_SAFE_INTEGER - 1)).toBe(false)
		expect(isSafeFloat(Infinity)).toBe(false)
	})
})

describe('getArcMeasure', () => {
	it('returns the short arc when the large arc flag is off', () => {
		expect(getArcMeasure(0, HALF_PI, 1, 0)).toBeCloseTo(HALF_PI, 10)
		expect(getArcMeasure(HALF_PI, 0, 1, 0)).toBeCloseTo(-HALF_PI, 10)
		expect(getArcMeasure(0, 3 * HALF_PI, 1, 0)).toBeCloseTo(-HALF_PI, 10)
	})

	it('returns the long arc signed by the sweep flag when the large arc flag is on', () => {
		expect(getArcMeasure(0, HALF_PI, 1, 1)).toBeCloseTo(3 * HALF_PI, 10)
		expect(getArcMeasure(0, HALF_PI, 0, 1)).toBeCloseTo(-3 * HALF_PI, 10)
	})
})

describe('centerOfCircleFromThreePoints', () => {
	it('finds the center of the unit circle', () => {
		const center = centerOfCircleFromThreePoints({ x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 })
		expect(center!.x).toBeCloseTo(0, 10)
		expect(center!.y).toBeCloseTo(0, 10)
	})

	it('finds an offset center', () => {
		const center = centerOfCircleFromThreePoints({ x: 10, y: 5 }, { x: 5, y: 10 }, { x: 0, y: 5 })
		expect(center!.x).toBeCloseTo(5, 10)
		expect(center!.y).toBeCloseTo(5, 10)
	})

	it('returns null for collinear points', () => {
		expect(centerOfCircleFromThreePoints({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull()
	})
})

describe('getPointsOnArc', () => {
	it('returns just the endpoints when there is no center', () => {
		const result = getPointsOnArc({ x: 1, y: 2 }, { x: 3, y: 4 }, null, 10, 5)
		expect(result).toEqual([new Vec(1, 2), new Vec(3, 4)])
	})

	it('spaces points evenly along the arc from start to end', () => {
		const result = getPointsOnArc({ x: 10, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 0 }, 10, 3)
		const expected = [
			[10, 0],
			[10 * Math.SQRT1_2, 10 * Math.SQRT1_2],
			[0, 10],
		]
		expect(result).toHaveLength(3)
		result.forEach((p, i) => {
			expect(p.x).toBeCloseTo(expected[i][0], 10)
			expect(p.y).toBeCloseTo(expected[i][1], 10)
		})
	})

	it('always sweeps in the increasing-angle direction', () => {
		const result = getPointsOnArc({ x: 0, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 0 }, 10, 3)
		expect(result[1].x).toBeCloseTo(-10 * Math.SQRT1_2, 10)
		expect(result[1].y).toBeCloseTo(-10 * Math.SQRT1_2, 10)
		expect(result[2].x).toBeCloseTo(10, 10)
		expect(result[2].y).toBeCloseTo(0, 10)
	})
})
