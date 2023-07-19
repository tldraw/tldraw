import { Box2d } from '../Box2d'
import { Geometry2d } from '../Geometry2d'
import { Vec2d } from '../Vec2d'
import { intersectLineSegmentCircle } from '../intersect'
import { PI2 } from '../utils'

/** @public */
export class Circle2d extends Geometry2d {
	_center: Vec2d
	radius: number

	constructor(public config: { radius: number; margin: number; isFilled: boolean }) {
		super()
		const { radius, isFilled, margin } = config
		this._center = new Vec2d(radius, radius)
		this.margin = margin
		this.radius = radius
		this.isFilled = isFilled
		this.isClosed = true
	}

	override getBounds() {
		const { _center, radius } = this
		return new Box2d(_center.x - radius, _center.y - radius, radius * 2, radius * 2)
	}

	getVertices(): Vec2d[] {
		const { _center, radius } = this
		const perimeter = PI2 * radius
		const vertices: Vec2d[] = []
		for (let i = 0, n = Math.max(8, Math.floor(perimeter / 16)); i < n; i++) {
			const angle = (i / n) * PI2
			vertices.push(_center.clone().add(Vec2d.FromAngle(angle).mul(radius)))
		}
		return vertices
	}

	nearestPoint(point: Vec2d): Vec2d {
		const { _center, radius } = this
		return _center.clone().add(point.clone().sub(_center).uni().mul(radius))
	}

	hitTestLineSegment(A: Vec2d, B: Vec2d): boolean {
		const { _center, radius } = this
		return intersectLineSegmentCircle(A, B, _center, radius) !== null
	}
}
