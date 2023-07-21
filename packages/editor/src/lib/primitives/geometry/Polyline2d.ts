import { Vec2d } from '../Vec2d'
import { Edge2d } from './Edge2d'
import { Geometry2d } from './Geometry2d'

/** @public */
export class Polyline2d extends Geometry2d {
	points: Vec2d[]

	constructor(config: { margin: number; points: Vec2d[] }) {
		super()
		const { margin, points } = config

		this.margin = margin
		this.points = points
		this.isClosed = false
	}

	_segments?: Edge2d[]

	get segments() {
		if (!this._segments) {
			this._segments = []
			const { vertices, margin } = this
			for (let i = 0, n = vertices.length - 1; i < n; i++) {
				const start = vertices[i]
				const end = vertices[i + 1]
				this._segments.push(new Edge2d({ start, end, margin }))
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
		return this.points
	}

	nearestPoint(A: Vec2d): Vec2d {
		let nearest: Vec2d | undefined
		let dist = Infinity

		if (this.points.length === 1) {
			return this.points[0]
		}

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

	hitTestLineSegment(A: Vec2d, B: Vec2d, zoom: number): boolean {
		return this.segments.some((edge) => edge.hitTestLineSegment(A, B, zoom))
	}
}
