import { Vec2d } from '../Vec2d'
import { PI, PI2 } from '../utils'
import { Edge2d } from './Edge2d'
import { Geometry2d } from './Geometry2d'
import { getVerticesCountForLength } from './geometry-constants'

/** @public */
export class Ellipse2d extends Geometry2d {
	w: number
	h: number

	constructor(public config: { width: number; height: number; margin: number; isFilled: boolean }) {
		super()
		const { width, height, isFilled, margin } = config
		this.w = width
		this.h = height
		this.isFilled = isFilled
		this.isClosed = true
		this.margin = margin
	}

	_edges?: Edge2d[]

	get edges() {
		if (!this._edges) {
			const { vertices, margin } = this
			this._edges = []
			for (let i = 0, n = vertices.length; i < n; i++) {
				const start = vertices[i]
				const end = vertices[(i + 1) % n]
				this._edges.push(new Edge2d({ start, end, margin }))
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
			vertices[i] = new Vec2d(cx + cx * cos, cy + cy * sin)
			ts = b * cos + a * sin
			tc = a * cos - b * sin
			sin = ts
			cos = tc
		}

		return vertices
	}

	nearestPoint(A: Vec2d): Vec2d {
		let nearest: Vec2d
		let dist = Infinity
		for (const edge of this.edges) {
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
		return this.edges.some((edge) => edge.hitTestLineSegment(A, B, zoom))
	}
}
