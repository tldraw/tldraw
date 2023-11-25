import { Vec2d } from '../Vec2d'
import { Edge2d } from './Edge2d'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class Polyline2d extends Geometry2d {
	points: Vec2d[]

	constructor(config: Omit<Geometry2dOptions, 'isFilled' | 'isClosed'> & { points: Vec2d[] }) {
		super({ isClosed: false, isFilled: false, ...config })
		const { points } = config
		this.points = points
	}

	_segments?: Edge2d[]

	// eslint-disable-next-line no-restricted-syntax
	get segments() {
		if (!this._segments) {
			this._segments = []
			const { vertices } = this
			for (let i = 0, n = vertices.length - 1; i < n; i++) {
				const start = vertices[i]
				const end = vertices[i + 1]
				this._segments.push(new Edge2d({ start, end }))
			}

			if (this.isClosed) {
				this._segments.push(new Edge2d({ start: vertices[vertices.length - 1], end: vertices[0] }))
			}
		}

		return this._segments
	}

	_length?: number

	// eslint-disable-next-line no-restricted-syntax
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
		const { segments } = this
		let nearest = this.points[0]
		let dist = Infinity

		let p: Vec2d // current point on segment
		let d: number // distance from A to p
		for (let i = 0; i < segments.length; i++) {
			p = segments[i].nearestPoint(A)
			d = p.dist(A)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}

		return nearest
	}

	hitTestLineSegment(A: Vec2d, B: Vec2d, zoom: number): boolean {
		return this.segments.some((edge) => edge.hitTestLineSegment(A, B, zoom))
	}
}
