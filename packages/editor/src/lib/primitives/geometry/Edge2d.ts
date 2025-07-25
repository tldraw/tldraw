import { Vec, VecLike } from '../Vec'
import { Geometry2d } from './Geometry2d'

/** @public */
export class Edge2d extends Geometry2d {
	private _start: Vec
	private _end: Vec
	private _d: Vec
	private _u: Vec
	private _ul: number

	constructor(config: { start: Vec; end: Vec }) {
		super({ ...config, isClosed: false, isFilled: false })
		const { start, end } = config

		this._start = start
		this._end = end

		this._d = start.clone().sub(end) // the delta from start to end
		this._u = this._d.clone().uni() // the unit vector of the edge
		this._ul = this._u.len() // the length of the unit vector
	}

	override getLength() {
		return this._d.len()
	}

	override getVertices(): Vec[] {
		return [this._start, this._end]
	}

	override nearestPoint(point: VecLike): Vec {
		const { _start: start, _end: end, _d: d, _u: u, _ul: l } = this
		if (d.len() === 0) return start // start and end are the same
		if (l === 0) return start // no length in the unit vector
		const k = Vec.Sub(point, start).dpr(u) / l
		const cx = start.x + u.x * k
		if (cx < Math.min(start.x, end.x)) return start.x < end.x ? start : end
		if (cx > Math.max(start.x, end.x)) return start.x > end.x ? start : end
		const cy = start.y + u.y * k
		if (cy < Math.min(start.y, end.y)) return start.y < end.y ? start : end
		if (cy > Math.max(start.y, end.y)) return start.y > end.y ? start : end
		return new Vec(cx, cy)
	}

	getSvgPathData(first = true) {
		const { _start: start, _end: end } = this
		return `${first ? `M${start.toFixed()}` : ``} L${end.toFixed()}`
	}
}
