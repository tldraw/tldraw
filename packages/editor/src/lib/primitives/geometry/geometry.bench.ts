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
