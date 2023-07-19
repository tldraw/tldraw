import { Geometry2d } from '../Geometry2d'
import { Vec2d } from '../Vec2d'
import { intersectLineSegmentCircle } from '../intersect'
import { PI2 } from '../utils'

/** @public */
export class Arc2d extends Geometry2d {
	_center: Vec2d
	radius: number
	start: Vec2d
	end: Vec2d

	margin: number
	angleStart: number
	angleEnd: number
	sweepFlag: number

	constructor(config: {
		center: Vec2d
		radius: number
		start: Vec2d
		end: Vec2d
		sweepFlag: number
		margin: number
	}) {
		super()
		const { margin, center, radius, sweepFlag, start, end } = config
		if (start.equals(end)) throw Error(`Arc must have different start and end points.`)

		// ensure that the start and end are clockwise
		this.angleStart = Vec2d.Angle(center, start)
		this.angleEnd = Vec2d.Angle(center, end)
		this.sweepFlag = sweepFlag

		this.start = start
		this.end = end

		this._center = center
		this.radius = radius
		this.margin = margin
		this.isClosed = false
	}

	nearestPoint(point: Vec2d): Vec2d {
		const { _center, radius, angleEnd, angleStart } = this
		const angle = _center.angle(point)
		if (angle < angleStart) return this.start.clone()
		if (angle > angleEnd) return this.end.clone()
		return _center.clone().add(point.clone().sub(_center).uni().mul(radius))
	}

	hitTestLineSegment(A: Vec2d, B: Vec2d): boolean {
		const { _center, radius, angleEnd, angleStart } = this
		const intersection = intersectLineSegmentCircle(A, B, _center, radius)
		console.log(intersection)
		if (intersection === null) return false
		return intersection.some((p) => {
			const angle = _center.angle(p)
			return angle >= angleStart && angle <= angleEnd
		})
	}

	getVertices(): Vec2d[] {
		const { _center, sweepFlag, radius, angleEnd, angleStart } = this
		const vertices: Vec2d[] = []
		const delta = sweepFlag ? PI2 - (angleStart - angleEnd) : angleEnd - angleStart
		const length = Math.abs(radius * delta)
		const n = Math.max(8, Math.floor(length / 32))

		for (let i = 0; i < n + 1; i++) {
			const t = i / n
			const angle = angleStart + delta * t
			vertices.push(_center.clone().add(new Vec2d(Math.cos(angle), Math.sin(angle)).mul(radius)))
		}

		return vertices
	}
}
