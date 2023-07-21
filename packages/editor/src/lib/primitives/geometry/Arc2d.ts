import { Vec2d } from '../Vec2d'
import { intersectLineSegmentCircle } from '../intersect'
import { PI, PI2, shortAngleDist } from '../utils'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'
import { getVerticesCountForLength } from './geometry-constants'

/** @public */
export class Arc2d extends Geometry2d {
	_center: Vec2d
	radius: number
	start: Vec2d
	end: Vec2d

	measure: number
	length: number
	angleStart: number
	angleEnd: number

	constructor(
		config: Omit<Geometry2dOptions, 'isFilled' | 'isClosed'> & {
			center: Vec2d
			radius: number
			start: Vec2d
			end: Vec2d
			sweepFlag: number
			largeArcFlag: number
		}
	) {
		super({ ...config, isFilled: false, isClosed: false })
		const { center, radius, sweepFlag, largeArcFlag, start, end } = config
		if (start.equals(end)) throw Error(`Arc must have different start and end points.`)

		// ensure that the start and end are clockwise
		this.angleStart = Vec2d.Angle(center, start)
		this.angleEnd = Vec2d.Angle(center, end)
		this.measure = getArcMeasure(this.angleStart, this.angleEnd, sweepFlag, largeArcFlag)
		this.length = this.measure * radius

		this.start = start
		this.end = end

		this._center = center
		this.radius = radius
	}

	nearestPoint(point: Vec2d): Vec2d {
		const { _center, measure, radius, angleEnd, angleStart, start: A, end: B } = this
		const t = getPointInArcT(measure, angleStart, angleEnd, _center.angle(point))
		if (t <= 0) return A
		if (t >= 1) return B

		// Get the point (P) on the arc, then pick the nearest of A, B, and P
		const P = _center.clone().add(point.clone().sub(_center).uni().mul(radius))

		let distance = Infinity
		let nearest: Vec2d | undefined
		for (const pt of [A, B, P]) {
			if (point.dist(pt) < distance) {
				nearest = pt
				distance = point.dist(pt)
			}
		}

		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	hitTestLineSegment(A: Vec2d, B: Vec2d, _zoom: number): boolean {
		const { _center, radius, measure, angleStart, angleEnd } = this
		const intersection = intersectLineSegmentCircle(A, B, _center, radius)
		if (intersection === null) return false

		return intersection.some((p) => {
			const result = getPointInArcT(measure, angleStart, angleEnd, _center.angle(p))
			return result >= 0 && result <= 1
		})
	}

	getVertices(): Vec2d[] {
		const { _center, measure, length, radius, angleStart } = this
		const vertices: Vec2d[] = []

		for (let i = 0, n = getVerticesCountForLength(Math.abs(length)); i < n + 1; i++) {
			const t = (i / n) * measure
			const angle = angleStart + t
			vertices.push(_center.clone().add(new Vec2d(Math.cos(angle), Math.sin(angle)).mul(radius)))
		}

		return vertices
	}
}

/**
 * Returns the t value of the point on the arc.
 *
 * @param mAB The measure of the arc from A to B, negative if counter-clockwise
 * @param A The angle from center to arc's start point (A) on the circle
 * @param B The angle from center to arc's end point (B) on the circle
 * @param P The point on the circle (P) to find the t value for
 *
 * @returns The t value of the point on the arc, with 0 being the start and 1 being the end
 *
 * @public
 */
function getPointInArcT(mAB: number, A: number, B: number, P: number): number {
	let mAP: number
	if (Math.abs(mAB) > PI) {
		mAP = shortAngleDist(A, P)
		const mPB = shortAngleDist(P, B)
		if (Math.abs(mAP) < Math.abs(mPB)) {
			return mAP / mAB
		} else {
			return (mAB - mPB) / mAB
		}
	} else {
		mAP = shortAngleDist(A, P)
		return mAP / mAB
	}
}

/**
 * Get the measure of an arc.
 *
 * @param A The angle from center to arc's start point (A) on the circle
 * @param B The angle from center to arc's end point (B) on the circle
 * @param sweepFlag 1 if the arc is clockwise, 0 if counter-clockwise
 * @param largeArcFlag 1 if the arc is greater than 180 degrees, 0 if less than 180 degrees
 *
 * @returns The measure of the arc, negative if counter-clockwise
 *
 * @public
 */
function getArcMeasure(A: number, B: number, sweepFlag: number, largeArcFlag: number) {
	const m = ((2 * ((B - A) % PI2)) % PI2) - ((B - A) % PI2)
	if (!largeArcFlag) return m
	return (PI2 - Math.abs(m)) * (sweepFlag ? 1 : -1)
}
