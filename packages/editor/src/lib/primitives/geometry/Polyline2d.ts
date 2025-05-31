import { Vec, VecLike } from '../Vec'
import { Edge2d } from './Edge2d'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class Polyline2d extends Geometry2d {
	private _points: Vec[]
	private _segments?: Edge2d[]

	constructor(config: Omit<Geometry2dOptions, 'isFilled' | 'isClosed'> & { points: Vec[] }) {
		super({ isClosed: false, isFilled: false, ...config })
		const { points } = config
		this._points = points

		if (points.length < 2) {
			throw new Error('Polyline2d: points must be an array of at least 2 points')
		}
	}

	// eslint-disable-next-line no-restricted-syntax
	protected get segments() {
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

	override getLength() {
		return this.segments.reduce((acc, segment) => acc + segment.length, 0)
	}

	getVertices() {
		return this._points
	}

	nearestPoint(A: VecLike): Vec {
		const { segments } = this
		let nearest = this._points[0]
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

	hitTestLineSegment(A: VecLike, B: VecLike, distance = 0): boolean {
		const { segments } = this
		for (let i = 0, n = segments.length; i < n; i++) {
			if (segments[i].hitTestLineSegment(A, B, distance)) {
				return true
			}
		}
		return false
	}

	getSvgPathData(): string {
		const { vertices } = this
		if (vertices.length < 2) return ''
		return vertices.reduce((acc, vertex, i) => {
			if (i === 0) return `M ${vertex.x} ${vertex.y}`
			return `${acc} L ${vertex.x} ${vertex.y}`
		}, '')
	}
}
