import { Box } from '../Box'
import { Vec } from '../Vec'
import { PI, PI2, perimeterOfEllipse } from '../utils'
import { Edge2d } from './Edge2d'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'
import { getVerticesCountForLength } from './geometry-constants'

/** @public */
export class Ellipse2d extends Geometry2d {
	w: number
	h: number

	constructor(
		public config: Omit<Geometry2dOptions, 'isClosed'> & {
			width: number
			height: number
		}
	) {
		super({ ...config, isClosed: true })
		const { width, height } = config
		this.w = width
		this.h = height
	}

	_edges?: Edge2d[]

	// eslint-disable-next-line no-restricted-syntax
	get edges() {
		if (!this._edges) {
			const { vertices } = this
			this._edges = []
			for (let i = 0, n = vertices.length; i < n; i++) {
				const start = vertices[i]
				const end = vertices[(i + 1) % n]
				this._edges.push(new Edge2d({ start, end }))
			}
		}

		return this._edges
	}

	getVertices() {
		// Perimeter of the ellipse
		const w = Math.max(1, this.w)
		const h = Math.max(1, this.h)
		const cx = w / 2
		const cy = h / 2
		const q = Math.pow(cx - cy, 2) / Math.pow(cx + cy, 2)
		const p = PI * (cx + cy) * (1 + (3 * q) / (10 + Math.sqrt(4 - 3 * q)))
		// Number of points
		const len = getVerticesCountForLength(p)
		// Size of step
		const step = PI2 / len

		const a = Math.cos(step)
		const b = Math.sin(step)

		let sin = 0
		let cos = 1
		let ts = 0
		let tc = 1

		const vertices = Array(len)

		for (let i = 0; i < len; i++) {
			vertices[i] = new Vec(cx + cx * cos, cy + cy * sin)
			ts = b * cos + a * sin
			tc = a * cos - b * sin
			sin = ts
			cos = tc
		}

		return vertices
	}

	nearestPoint(A: Vec): Vec {
		let nearest: Vec | undefined
		let dist = Infinity
		let d: number
		let p: Vec
		for (const edge of this.edges) {
			p = edge.nearestPoint(A)
			d = Vec.Dist2(p, A)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	hitTestLineSegment(A: Vec, B: Vec): boolean {
		return this.edges.some((edge) => edge.hitTestLineSegment(A, B))
	}

	getBounds() {
		return new Box(0, 0, this.w, this.h)
	}

	getLength(): number {
		const { w, h } = this
		const cx = w / 2
		const cy = h / 2
		const rx = Math.max(0, cx)
		const ry = Math.max(0, cy)
		return perimeterOfEllipse(rx, ry)
	}

	getSvgPathData(first = false) {
		const { w, h } = this
		const cx = w / 2
		const cy = h / 2
		const rx = Math.max(0, cx)
		const ry = Math.max(0, cy)
		return `${first ? `M${cx - rx},${cy}` : ``} a${rx},${ry},0,1,1,${rx * 2},0a${rx},${ry},0,1,1,-${rx * 2},0`
	}
}
