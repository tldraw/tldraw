import { Vec } from '../Vec'
import { intersectLineSegmentCircle } from '../intersect'
import { getArcMeasure, getPointInArcT, getPointOnCircle } from '../utils'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'
import { getVerticesCountForLength } from './geometry-constants'

/** @public */
export class Arc2d extends Geometry2d {
	_center: Vec
	radius: number
	start: Vec
	end: Vec

	measure: number
	length: number
	angleStart: number
	angleEnd: number

	constructor(
		config: Omit<Geometry2dOptions, 'isFilled' | 'isClosed'> & {
			center: Vec
			radius: number
			start: Vec
			end: Vec
			sweepFlag: number
			largeArcFlag: number
		}
	) {
		super({ ...config, isFilled: false, isClosed: false })
		const { center, radius, sweepFlag, largeArcFlag, start, end } = config
		if (start.equals(end)) throw Error(`Arc must have different start and end points.`)

		// ensure that the start and end are clockwise
		this.angleStart = Vec.Angle(center, start)
		this.angleEnd = Vec.Angle(center, end)
		this.measure = getArcMeasure(this.angleStart, this.angleEnd, sweepFlag, largeArcFlag)
		this.length = this.measure * radius

		this.start = start
		this.end = end

		this._center = center
		this.radius = radius
	}

	nearestPoint(point: Vec): Vec {
		const { _center, measure, radius, angleEnd, angleStart, start: A, end: B } = this
		const t = getPointInArcT(measure, angleStart, angleEnd, _center.angle(point))
		if (t <= 0) return A
		if (t >= 1) return B

		// Get the point (P) on the arc, then pick the nearest of A, B, and P
		const P = _center.clone().add(point.clone().sub(_center).uni().mul(radius))

		let nearest: Vec | undefined
		let dist = Infinity
		let d: number
		for (const p of [A, B, P]) {
			d = Vec.Dist2(point, p)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	hitTestLineSegment(A: Vec, B: Vec): boolean {
		const { _center, radius, measure, angleStart, angleEnd } = this
		const intersection = intersectLineSegmentCircle(A, B, _center, radius)
		if (intersection === null) return false

		return intersection.some((p) => {
			const result = getPointInArcT(measure, angleStart, angleEnd, _center.angle(p))
			return result >= 0 && result <= 1
		})
	}

	getVertices(): Vec[] {
		const { _center, measure, length, radius, angleStart } = this
		const vertices: Vec[] = []

		for (let i = 0, n = getVerticesCountForLength(Math.abs(length)); i < n + 1; i++) {
			const t = (i / n) * measure
			const angle = angleStart + t
			vertices.push(getPointOnCircle(_center, radius, angle))
		}

		return vertices
	}
}
