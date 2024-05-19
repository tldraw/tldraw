import { Vec } from '../Vec'
import { Edge2d } from './Edge2d'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class Polyline2d extends Geometry2d {
	points: Vec[]

	constructor(config: Omit<Geometry2dOptions, 'isFilled' | 'isClosed'> & { points: Vec[] }) {
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

	nearestPoint(A: Vec): Vec {
		const { segments } = this
		let nearest = this.points[0]
		let dist = Infinity
		let p: Vec // current point on segment
		let d: number // distance from A to p
		for (let i = 0; i < segments.length; i++) {
			p = segments[i].nearestPoint(A)
			d = Vec.Dist2(p, A)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	hitTestLineSegment(A: Vec, B: Vec, distance = 0): boolean {
		const { segments } = this
		for (let i = 0, n = segments.length; i < n; i++) {
			if (segments[i].hitTestLineSegment(A, B, distance)) {
				return true
			}
		}
		return false
	}
}
