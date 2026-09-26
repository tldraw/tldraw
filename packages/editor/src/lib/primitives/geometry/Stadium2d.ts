import { Box } from '../Box'
import { PI, pointInPolygon } from '../utils'
import { Vec, VecLike } from '../Vec'
import { Arc2d } from './Arc2d'
import { Edge2d } from './Edge2d'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class Stadium2d extends Geometry2d {
	private _w: number
	private _h: number
	private _parts: [Arc2d, Edge2d, Arc2d, Edge2d]

	constructor(
		public config: Omit<Geometry2dOptions, 'isClosed'> & {
			width: number
			height: number
		}
	) {
		super({ ...config, isClosed: true })
		const { width: w, height: h } = config
		this._w = w
		this._h = h

		if (h > w) {
			const r = w / 2
			const a = new Arc2d({
				start: new Vec(0, r),
				end: new Vec(w, r),
				center: new Vec(w / 2, r),
				sweepFlag: 1,
				largeArcFlag: 1,
			})
			const b = new Edge2d({ start: new Vec(w, r), end: new Vec(w, h - r) })
			const c = new Arc2d({
				start: new Vec(w, h - r),
				end: new Vec(0, h - r),
				center: new Vec(w / 2, h - r),
				sweepFlag: 1,
				largeArcFlag: 1,
			})
			const d = new Edge2d({ start: new Vec(0, h - r), end: new Vec(0, r) })
			this._parts = [a, b, c, d]
		} else {
			const r = h / 2
			const a = new Arc2d({
				start: new Vec(r, h),
				end: new Vec(r, 0),
				center: new Vec(r, r),
				sweepFlag: 1,
				largeArcFlag: 1,
			})
			const b = new Edge2d({ start: new Vec(r, 0), end: new Vec(w - r, 0) })
			const c = new Arc2d({
				start: new Vec(w - r, 0),
				end: new Vec(w - r, h),
				center: new Vec(w - r, r),
				sweepFlag: 1,
				largeArcFlag: 1,
			})
			const d = new Edge2d({ start: new Vec(w - r, h), end: new Vec(r, h) })
			this._parts = [a, b, c, d]
		}
	}

	nearestPoint(A: VecLike): Vec {
		let nearest: Vec | undefined
		let dist = Infinity
		for (const part of this._parts) {
			const p = part.nearestPoint(A)
			const d = Vec.Dist2(p, A)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	override distanceToPoint(point: VecLike, hitInside = false): number {
		let minDist = Infinity
		for (const part of this._parts) {
			const dist = part.distanceToPoint(point)
			if (dist < minDist) minDist = dist
		}
		if (this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)) {
			return -minDist
		}
		return minDist
	}

	hitTestLineSegment(A: VecLike, B: VecLike): boolean {
		return this._parts.some((part) => part.hitTestLineSegment(A, B))
	}

	getVertices() {
		const vertices: Vec[] = []
		for (const part of this._parts) {
			vertices.push(...part.vertices)
		}
		return vertices
	}

	getBounds() {
		return new Box(0, 0, this._w, this._h)
	}

	getLength() {
		const { _h: h, _w: w } = this
		if (h > w) return (PI * (w / 2) + (h - w)) * 2
		else return (PI * (h / 2) + (w - h)) * 2
	}

	getSvgPathData() {
		return this._parts.map((p, i) => p.getSvgPathData(i === 0)).join(' ') + ' Z'
	}
}
