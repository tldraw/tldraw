import { pointInPolygon } from '../utils'
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

	// eslint-disable-next-line tldraw/no-setter-getter
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
		// Inlined: for each segment, Edge2d.nearestPoint(A) + Vec.Dist2(result, A), pick closest.
		// Inlines the per-segment nearest-point math to avoid N Edge2d.nearestPoint Vec allocations;
		// only allocates a single Vec at the end for the best result.
		const { vertices } = this
		let bestX = vertices[0].x
		let bestY = vertices[0].y
		let bestDist2 = (A.x - bestX) * (A.x - bestX) + (A.y - bestY) * (A.y - bestY)

		const limit = this.isClosed ? vertices.length : vertices.length - 1
		for (let i = 0; i < limit; i++) {
			const start = vertices[i]
			const end = vertices[(i + 1) % vertices.length]
			const dx = end.x - start.x
			const dy = end.y - start.y
			const len2 = dx * dx + dy * dy

			let nx: number, ny: number
			if (len2 === 0) {
				nx = start.x
				ny = start.y
			} else {
				const t = ((A.x - start.x) * dx + (A.y - start.y) * dy) / len2
				if (t <= 0) {
					nx = start.x
					ny = start.y
				} else if (t >= 1) {
					nx = end.x
					ny = end.y
				} else {
					nx = start.x + dx * t
					ny = start.y + dy * t
				}
			}

			const ex = A.x - nx
			const ey = A.y - ny
			const d2 = ex * ex + ey * ey
			if (d2 < bestDist2) {
				bestX = nx
				bestY = ny
				bestDist2 = d2
			}
		}

		return new Vec(bestX, bestY)
	}

	override hitTestPoint(point: VecLike, margin = 0, hitInside = false): boolean {
		return this.distanceToPoint(point, hitInside) <= margin
	}

	override distanceToPoint(point: VecLike, hitInside = false): number {
		const { segments } = this
		let minDist = Infinity
		for (let i = 0; i < segments.length; i++) {
			const d = segments[i].distanceToPoint(point)
			if (d < minDist) minDist = d
		}
		if (this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)) {
			return -minDist
		}
		return minDist
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
