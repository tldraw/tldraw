import { Vec } from '../Vec'
import { linesIntersect } from '../intersect'
import { Geometry2d } from './Geometry2d'

/** @public */
export class Edge2d extends Geometry2d {
	start: Vec
	end: Vec
	d: Vec
	u: Vec
	ul: number

	constructor(config: { start: Vec; end: Vec; isSnappable?: boolean }) {
		super({ ...config, isClosed: false, isFilled: false })
		const { start, end } = config

		this.start = start
		this.end = end

		this.d = start.clone().sub(end) // the delta from start to end
		this.u = this.d.clone().uni() // the unit vector of the edge
		this.ul = this.u.len() // the length of the unit vector
	}

	_length?: number

	// eslint-disable-next-line no-restricted-syntax
	get length() {
		if (!this._length) {
			return this.d.len()
		}
		return this._length
	}

	midPoint(): Vec {
		return this.start.lrp(this.end, 0.5)
	}

	override getVertices(): Vec[] {
		return [this.start, this.end]
	}

	override nearestPoint(point: Vec): Vec {
		const { start, end, u, ul: l } = this
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

	override hitTestLineSegment(A: Vec, B: Vec, _zoom: number): boolean {
		return linesIntersect(A, B, this.start, this.end)
	}
}
