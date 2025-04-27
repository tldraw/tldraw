import { Box } from '../Box'
import { Vec } from '../Vec'
import { PI } from '../utils'
import { Arc2d } from './Arc2d'
import { Edge2d } from './Edge2d'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class Stadium2d extends Geometry2d {
	w: number
	h: number

	a: Arc2d
	b: Edge2d
	c: Arc2d
	d: Edge2d

	constructor(
		public config: Omit<Geometry2dOptions, 'isClosed'> & {
			width: number
			height: number
		}
	) {
		super({ ...config, isClosed: true })
		const { width: w, height: h } = config
		this.w = w
		this.h = h

		if (h > w) {
			const r = w / 2
			this.a = new Arc2d({
				start: new Vec(0, r),
				end: new Vec(w, r),
				center: new Vec(w / 2, r),
				sweepFlag: 1,
				largeArcFlag: 1,
			})
			this.b = new Edge2d({ start: new Vec(w, r), end: new Vec(w, h - r) })
			this.c = new Arc2d({
				start: new Vec(w, h - r),
				end: new Vec(0, h - r),
				center: new Vec(w / 2, h - r),
				sweepFlag: 1,
				largeArcFlag: 1,
			})
			this.d = new Edge2d({ start: new Vec(0, h - r), end: new Vec(0, r) })
		} else {
			const r = h / 2
			this.a = new Arc2d({
				start: new Vec(r, h),
				end: new Vec(r, 0),
				center: new Vec(r, r),
				sweepFlag: 1,
				largeArcFlag: 1,
			})
			this.b = new Edge2d({ start: new Vec(r, 0), end: new Vec(w - r, 0) })
			this.c = new Arc2d({
				start: new Vec(w - r, 0),
				end: new Vec(w - r, h),
				center: new Vec(w - r, r),
				sweepFlag: 1,
				largeArcFlag: 1,
			})
			this.d = new Edge2d({ start: new Vec(w - r, h), end: new Vec(r, h) })
		}
	}

	nearestPoint(A: Vec): Vec {
		let nearest: Vec | undefined
		let dist = Infinity
		let _d: number
		let p: Vec

		const { a, b, c, d } = this
		for (const part of [a, b, c, d]) {
			p = part.nearestPoint(A)
			_d = Vec.Dist2(p, A)
			if (_d < dist) {
				nearest = p
				dist = _d
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	hitTestLineSegment(A: Vec, B: Vec): boolean {
		const { a, b, c, d } = this
		return [a, b, c, d].some((edge) => edge.hitTestLineSegment(A, B))
	}

	getVertices() {
		const { a, b, c, d } = this
		return [a, b, c, d].reduce<Vec[]>((a, p) => {
			a.push(...p.vertices)
			return a
		}, [])
	}

	getBounds() {
		return new Box(0, 0, this.w, this.h)
	}

	getLength() {
		const { h, w } = this
		if (h > w) return (PI * (w / 2) + (h - w)) * 2
		else return (PI * (h / 2) + (w - h)) * 2
	}

	getSvgPathData() {
		const { a, b, c, d } = this
		return [a, b, c, d].map((p, i) => p.getSvgPathData(i === 0)).join(' ') + ' Z'
	}
}
