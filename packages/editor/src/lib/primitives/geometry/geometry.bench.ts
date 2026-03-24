import { bench, describe } from 'vitest'
import { Vec } from '../Vec'
import { Arc2d } from './Arc2d'
import { Circle2d } from './Circle2d'
import { Edge2d } from './Edge2d'
import { Polyline2d } from './Polyline2d'
import { Rectangle2d } from './Rectangle2d'

// --- Vec line segment utilities ---

const lsA = new Vec(0, 0)
const lsB = new Vec(100, 50)
const lsP = new Vec(30, 60)

describe('Vec line segment', () => {
	bench('NearestPointOnLineSegment', () => {
		Vec.NearestPointOnLineSegment(lsA, lsB, lsP, true)
	})

	bench('DistanceToLineSegment', () => {
		Vec.DistanceToLineSegment(lsA, lsB, lsP, true)
	})
})

// --- Vec utilities ---

const vecA = new Vec(3, 4)
const vecB = new Vec(-1, 2)
const lineOrigin = new Vec(10, 10)
const lineDir = new Vec(0.7071, 0.7071) // ~unit vector at 45°
const lineTestP = new Vec(20, 15)

describe('Vec utilities', () => {
	bench('Lrp', () => {
		Vec.Lrp(lsA, lsB, 0.35)
	})

	bench('AngleBetween', () => {
		Vec.AngleBetween(vecA, vecB)
	})

	bench('NearestPointOnLineThroughPoint', () => {
		Vec.NearestPointOnLineThroughPoint(lineOrigin, lineDir, lineTestP)
	})

	bench('DistanceToLineThroughPoint', () => {
		Vec.DistanceToLineThroughPoint(lineOrigin, lineDir, lineTestP)
	})
})

// --- Intersections ---

import { intersectLineSegmentCircle, intersectLineSegmentLineSegment } from '../intersect'

const intA1 = new Vec(0, 0)
const intA2 = new Vec(100, 100)
const intB1 = new Vec(100, 0)
const intB2 = new Vec(0, 100)
const intB1Miss = new Vec(200, 0)
const intB2Miss = new Vec(200, 100)
const intCenter = new Vec(50, 50)

describe('Intersections', () => {
	bench('lineSegment-lineSegment (hit)', () => {
		intersectLineSegmentLineSegment(intA1, intA2, intB1, intB2)
	})

	bench('lineSegment-lineSegment (miss)', () => {
		intersectLineSegmentLineSegment(intA1, intA2, intB1Miss, intB2Miss)
	})

	bench('lineSegment-circle (hit)', () => {
		intersectLineSegmentCircle(intA1, intA2, intCenter, 30)
	})

	bench('lineSegment-circle (miss)', () => {
		intersectLineSegmentCircle(intA1, intA2, intCenter, 5)
	})
})

// --- Edge2d ---

const edge = new Edge2d({ start: new Vec(0, 0), end: new Vec(100, 50) })
const edgePoint = new Vec(30, 60)

describe('Edge2d', () => {
	bench('nearestPoint', () => {
		edge.nearestPoint(edgePoint)
	})

	bench('distanceToPoint', () => {
		edge.distanceToPoint(edgePoint)
	})
})

// --- Circle2d ---

const circle = new Circle2d({ radius: 50, isFilled: true })
const circlePoint = new Vec(80, 60)
const circlePointInside = new Vec(50, 50)

describe('Circle2d', () => {
	bench('nearestPoint', () => {
		circle.nearestPoint(circlePoint)
	})

	bench('distanceToPoint', () => {
		circle.distanceToPoint(circlePoint)
	})

	bench('hitTestPoint (outside)', () => {
		circle.hitTestPoint(circlePoint, 5)
	})

	bench('hitTestPoint (inside)', () => {
		circle.hitTestPoint(circlePointInside, 5, true)
	})
})

// --- Arc2d ---

const arc = new Arc2d({
	center: new Vec(50, 50),
	start: new Vec(100, 50),
	end: new Vec(50, 100),
	sweepFlag: 1,
	largeArcFlag: 0,
})
const arcPoint = new Vec(90, 90)

describe('Arc2d', () => {
	bench('nearestPoint', () => {
		arc.nearestPoint(arcPoint)
	})
})

// --- Polyline2d (20 segments) ---

const polyPoints: Vec[] = []
for (let i = 0; i <= 20; i++) {
	const t = i / 20
	polyPoints.push(new Vec(t * 200, Math.sin(t * Math.PI * 2) * 50 + 50))
}
const polyline = new Polyline2d({ points: polyPoints })
const polyPoint = new Vec(100, 80)

describe('Polyline2d', () => {
	bench('nearestPoint', () => {
		polyline.nearestPoint(polyPoint)
	})

	bench('distanceToPoint', () => {
		polyline.distanceToPoint(polyPoint)
	})
})

// --- Rectangle2d (Geometry2d base) ---

const rect = new Rectangle2d({ width: 100, height: 80, isFilled: true })
const rectPointOutside = new Vec(120, 40)
const rectPointInside = new Vec(50, 40)

describe('Rectangle2d (Geometry2d)', () => {
	bench('hitTestPoint (outside)', () => {
		rect.hitTestPoint(rectPointOutside, 5)
	})

	bench('hitTestPoint (inside)', () => {
		rect.hitTestPoint(rectPointInside, 5, true)
	})

	bench('distanceToPoint (outside)', () => {
		rect.distanceToPoint(rectPointOutside)
	})

	bench('distanceToPoint (inside)', () => {
		rect.distanceToPoint(rectPointInside, true)
	})
})
