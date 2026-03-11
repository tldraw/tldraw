import { Vec, VecLike } from '../Vec'
import { Geometry2d } from './Geometry2d'

/** @public */
export class Edge2d extends Geometry2d {
	private _start: Vec
	private _end: Vec
	private _dx: number
	private _dy: number
	private _len2: number

	constructor(config: { start: Vec; end: Vec }) {
		super({ ...config, isClosed: false, isFilled: false })
		const { start, end } = config

		this._start = start
		this._end = end

		this._dx = end.x - start.x
		this._dy = end.y - start.y
		this._len2 = this._dx * this._dx + this._dy * this._dy
	}

	override getLength() {
		return Math.sqrt(this._len2)
	}

	override getVertices(): Vec[] {
		return [this._start, this._end]
	}

	override nearestPoint(point: VecLike): Vec {
		const { _start: start, _end: end, _dx: dx, _dy: dy, _len2: len2 } = this
		if (len2 === 0) return start

		// Parametric t = dot(P-A, B-A) / |B-A|^2, clamped to [0,1]
		const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2
		if (t <= 0) return start
		if (t >= 1) return end
		return new Vec(start.x + dx * t, start.y + dy * t)
	}

	override distanceToPoint(point: VecLike, hitInside = false): number {
		const { _start: start, _end: end, _dx: dx, _dy: dy, _len2: len2 } = this
		if (len2 === 0) return Vec.Dist(point, start)

		const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2
		let nx: number, ny: number
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
		const ex = point.x - nx
		const ey = point.y - ny
		return Math.sqrt(ex * ex + ey * ey)
	}

	getSvgPathData(first = true) {
		const { _start: start, _end: end } = this
		return `${first ? `M${start.toFixed()}` : ``} L${end.toFixed()}`
	}
}
