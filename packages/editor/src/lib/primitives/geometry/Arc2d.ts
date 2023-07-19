import { Geometry2d } from '../Geometry2d'
import { Vec2d } from '../Vec2d'
import { intersectLineSegmentCircle } from '../intersect'
import { PI2, angleDelta, longAngleDist, shortAngleDist } from '../utils'

/** @public */
export class Arc2d extends Geometry2d {
	_center: Vec2d
	radius: number
	start: Vec2d
	end: Vec2d

	delta: number
	margin: number
	angleStart: number
	angleEnd: number
	sweepFlag: number
	largeArcFlag: number

	constructor(config: {
		center: Vec2d
		radius: number
		start: Vec2d
		end: Vec2d
		sweepFlag: number
		largeArcFlag: number
		margin: number
	}) {
		super()
		const { margin, center, radius, sweepFlag, largeArcFlag, start, end } = config
		if (start.equals(end)) throw Error(`Arc must have different start and end points.`)

		// ensure that the start and end are clockwise
		this.angleStart = Vec2d.Angle(center, start)
		this.angleEnd = Vec2d.Angle(center, end)
		this.delta = angleDelta(this.angleStart, this.angleEnd)
		this.sweepFlag = sweepFlag
		this.largeArcFlag = largeArcFlag

		this.start = start
		this.end = end

		this._center = center
		this.radius = radius
		this.margin = margin
		this.isClosed = false
	}

	nearestPoint(point: Vec2d): Vec2d {
		const { _center, largeArcFlag, sweepFlag, radius, angleEnd, angleStart } = this
		const result = isPointOnArc(angleStart, angleEnd, _center.angle(point), sweepFlag, largeArcFlag)
		if (result <= 0 || result >= 1) {
			const ds = point.dist(this.start)
			const de = point.dist(this.end)
			return ds < de ? this.start : this.end
		}
		return _center.clone().add(point.clone().sub(_center).uni().mul(radius))
	}

	hitTestLineSegment(A: Vec2d, B: Vec2d): boolean {
		const { _center, radius, sweepFlag, angleStart, largeArcFlag, angleEnd } = this
		const intersection = intersectLineSegmentCircle(A, B, _center, radius)
		if (intersection === null) return false

		return intersection.some((p) => {
			return isPointOnArc(angleStart, angleEnd, _center.angle(p), sweepFlag, largeArcFlag)
		})
	}

	getVertices(): Vec2d[] {
		const { _center, delta, sweepFlag, largeArcFlag, radius, angleStart } = this
		const vertices: Vec2d[] = []
		const d =
			largeArcFlag && sweepFlag ? PI2 + delta : largeArcFlag && !sweepFlag ? -(PI2 - delta) : delta
		const length = Math.abs(radius * Math.abs(d))
		const n = Math.max(8, Math.floor(length / 32))

		for (let i = 0; i < n + 1; i++) {
			const t = i / n
			const angle = angleStart + d * t
			vertices.push(_center.clone().add(new Vec2d(Math.cos(angle), Math.sin(angle)).mul(radius)))
		}

		return vertices
	}
}

function isPointOnArc(
	angleStart: number,
	angleEnd: number,
	anglePoint: number,
	sweepFlag: number,
	largeArcFlag: number
) {
	if (largeArcFlag) {
		if (sweepFlag) {
			const ab = Math.abs(longAngleDist(angleStart, angleEnd))
			const ag = shortAngleDist(angleStart, anglePoint)
			const bg = shortAngleDist(anglePoint, angleEnd)
			if (Math.abs(ag) < Math.abs(bg)) {
				return ag / ab
			} else {
				return (ab - bg) / ab
			}
		} else {
			const ab = Math.abs(longAngleDist(angleEnd, angleStart))
			const ag = shortAngleDist(anglePoint, angleStart)
			const bg = shortAngleDist(angleEnd, anglePoint)
			if (Math.abs(ag) < Math.abs(bg)) {
				return ag / ab
			} else {
				return (ab - bg) / ab
			}
		}
	} else {
		if (sweepFlag) {
			const ab = shortAngleDist(angleEnd, angleStart)
			const ac = shortAngleDist(anglePoint, angleStart)
			return ac / ab
		} else {
			const ab = shortAngleDist(angleStart, angleEnd)
			const ac = shortAngleDist(angleStart, anglePoint)
			return ac / ab
		}
	}
}
