import { BaseSegment2d } from './BaseSegment2d'
import { Box2d } from './Box2d'
import { Vec2d, VecLike } from './Vec2d'

/** @public */
export interface LineSegment2dModel {
	a: VecLike
	b: VecLike
	p: number
}

/** @public */
export class LineSegment2d extends BaseSegment2d<LineSegment2dModel> {
	constructor(public a: VecLike, public b: VecLike, p = 2) {
		super({ a, b, p })
		this.values.p = Math.max(10, Math.ceil(this.length / 20))
	}

	override get length() {
		return Vec2d.Dist(this.a, this.b)
	}

	get tangent() {
		return Vec2d.Tan(this.a, this.b)
	}

	get angle() {
		return Vec2d.Angle(this.a, this.b)
	}

	override get bounds() {
		return Box2d.FromPoints([this.a, this.b])
	}

	getX(t: number) {
		const { a, b } = this.values

		return a.x + (b.x - a.x) * t
	}

	getY(t: number) {
		const { a, b } = this.values

		return a.y + (b.y - a.y) * t
	}

	getPoint(t: number) {
		const { a, b } = this.values

		if (t <= 0) return Vec2d.From(a)
		if (t >= 1) return Vec2d.From(b)

		return Vec2d.Lrp(a, b, t)
	}

	getPath(head = true) {
		const { a, b } = this.values

		if (Vec2d.Equals(a, b)) return ''

		return head ? `M${a.x},${a.y}L${b.x},${b.y}` : `${b.x},${b.y}`
	}

	override getNormal() {
		const { a, b } = this.values

		return Vec2d.Sub(a, b).per().uni().toFixed()
	}

	/**
	 * Get the closest point on the segment to an arbitrary point.
	 *
	 * @param point - The arbitrary point.
	 * @public
	 */
	override getClosestPointTo(point: VecLike) {
		const { a, b } = this.values

		const closestPoint = Vec2d.NearestPointOnLineSegment(a, b, point)

		const closestDistance = closestPoint.dist(point)

		return { point: closestPoint, distance: closestDistance }
	}

	static Length(A: LineSegment2d) {
		return Vec2d.Dist(A.a, A.b)
	}

	static Tangent(A: LineSegment2d) {
		return Vec2d.Tan(A.a, A.b)
	}

	static Angle(A: LineSegment2d) {
		return Vec2d.Angle(A.a, A.b)
	}
}
