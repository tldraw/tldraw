import { Geometry2d } from '../Geometry2d'
import { Vec2d } from '../Vec2d'
import { intersectLineSegmentCircle } from '../intersect'

/** @public */
export class Arc2d extends Geometry2d {
	_center: Vec2d
	radius: number
	start: Vec2d
	end: Vec2d

	margin: number
	ab: number
	ac: number

	constructor(config: { center: Vec2d; radius: number; start: Vec2d; end: Vec2d; margin: number }) {
		super()
		const { margin, center, radius, start, end } = config
		if (start.equals(end)) throw Error(`Arc must have different start and end points.`)

		// ensure that the start and end are clockwise
		const _ab = Vec2d.Angle(center, start)
		const _ac = Vec2d.Angle(center, end)
		this.start = _ab < _ac ? start : end
		this.end = _ac < _ab ? end : start

		this.ab = Vec2d.Angle(center, start)
		this.ac = Vec2d.Angle(center, end)

		this._center = center
		this.radius = radius
		this.margin = margin
		this.isClosed = false
	}

	nearestPoint(point: Vec2d): Vec2d {
		const { _center, radius, ac, ab } = this
		const angle = _center.angle(point)
		if (angle < ab) return this.start.clone()
		if (angle > ac) return this.end.clone()
		return _center.clone().add(point.clone().sub(_center).uni().mul(radius))
	}

	hitTestLineSegment(A: Vec2d, B: Vec2d): boolean {
		const { _center, radius, ac, ab } = this
		const intersection = intersectLineSegmentCircle(A, B, _center, radius)
		if (intersection === null) return false
		return intersection.some((p) => {
			const angle = _center.angle(p)
			return angle >= ab && angle <= ac
		})
	}

	getVertices(): Vec2d[] {
		const { _center, radius, ac, ab } = this

		const vertices: Vec2d[] = []

		const delta = ac - ab
		const length = radius * delta

		for (let i = 0, n = Math.max(8, Math.floor(Math.abs(length) / 32)); i < n + 1; i++) {
			const t = i / n
			const angle = ab + t * delta
			vertices.push(_center.clone().add(new Vec2d(Math.cos(angle), Math.sin(angle)).mul(radius)))
		}

		return vertices
	}
}
