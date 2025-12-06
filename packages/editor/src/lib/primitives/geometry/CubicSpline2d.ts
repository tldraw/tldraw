import { Vec, VecLike } from '../Vec'
import { CubicBezier2d } from './CubicBezier2d'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class CubicSpline2d extends Geometry2d {
	private _points: Vec[]

	constructor(config: Omit<Geometry2dOptions, 'isClosed' | 'isFilled'> & { points: Vec[] }) {
		super({ ...config, isClosed: false, isFilled: false })
		const { points } = config

		this._points = points
	}

	private _segments?: CubicBezier2d[]

	// eslint-disable-next-line no-restricted-syntax
	get segments() {
		if (!this._segments) {
			this._segments = []
			const { _points: points } = this

			const len = points.length
			const last = len - 2
			const k = 1.25

			for (let i = 0; i < len - 1; i++) {
				const p0 = i === 0 ? points[0] : points[i - 1]
				const p1 = points[i]
				const p2 = points[i + 1]
				const p3 = i === last ? p2 : points[i + 2]
				const start = p1,
					cp1 =
						i === 0 ? p0 : new Vec(p1.x + ((p2.x - p0.x) / 6) * k, p1.y + ((p2.y - p0.y) / 6) * k),
					cp2 =
						i === last
							? p2
							: new Vec(p2.x - ((p3.x - p1.x) / 6) * k, p2.y - ((p3.y - p1.y) / 6) * k),
					end = p2

				this._segments.push(new CubicBezier2d({ start, cp1, cp2, end }))
			}
		}

		return this._segments
	}

	override getLength() {
		return this.segments.reduce((acc, segment) => acc + segment.length, 0)
	}

	getVertices() {
		const vertices = this.segments.reduce((acc, segment) => {
			return acc.concat(segment.vertices)
		}, [] as Vec[])
		vertices.push(this._points[this._points.length - 1])
		return vertices
	}

	nearestPoint(A: VecLike): Vec {
		let nearest: Vec | undefined
		let dist = Infinity
		let d: number
		let p: Vec
		for (const segment of this.segments) {
			p = segment.nearestPoint(A)
			d = Vec.Dist2(p, A)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	hitTestLineSegment(A: VecLike, B: VecLike): boolean {
		return this.segments.some((segment) => segment.hitTestLineSegment(A, B))
	}

	getSvgPathData() {
		let d = this.segments.reduce((d, segment, i) => {
			return d + segment.getSvgPathData(i === 0)
		}, '')

		if (this.isClosed) {
			d += 'Z'
		}

		return d
	}
}
