import { Geometry2d } from '../Geometry2d'
import { Vec2d } from '../Vec2d'
import { CubicBezier2d } from './CubicBezier2d'

/** @public */
export class CubicSpline2d extends Geometry2d {
	points: Vec2d[]

	constructor(config: { points: Vec2d[]; isFilled: boolean; margin: number }) {
		super()
		const { margin, points, isFilled } = config

		this.margin = margin
		this.points = points
		this.isFilled = isFilled
	}

	_segments?: CubicBezier2d[]

	get segments() {
		if (!this._segments) {
			this._segments = []
			const { points, margin } = this

			const len = points.length
			const last = len - 2
			const k = 1.25

			for (let i = 0; i < len - 1; i++) {
				const p0 = i === 0 ? points[0] : points[i - 1],
					a = points[i],
					d = points[i + 1],
					b = i === 0 ? p0 : a.clone().add(d.clone().sub(p0).div(6)).mul(k),
					c =
						i === last
							? d
							: d
									.clone()
									.sub(points[i + 2].clone().sub(a).div(6))
									.mul(k)

				this._segments.push(new CubicBezier2d({ start: a, cp1: b, cp2: c, end: d, margin }))
			}
		}

		return this._segments
	}

	_length?: number

	get length() {
		if (!this._length) {
			this._length = this.segments.reduce((acc, segment) => acc + segment.length, 0)
		}
		return this._length
	}

	getVertices() {
		return this.segments.reduce((acc, segment) => {
			acc.concat(segment.vertices)
			return acc
		}, [] as Vec2d[])
	}

	nearestPoint(A: Vec2d): Vec2d {
		let nearest: Vec2d
		let dist = Infinity
		for (const edge of this.segments) {
			const p = edge.nearestPoint(A)
			const d = p.dist(A)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}
		return nearest!
	}

	hitTestLineSegment(A: Vec2d, B: Vec2d): boolean {
		return this.segments.some((segment) => segment.hitTestLineSegment(A, B))
	}
}
