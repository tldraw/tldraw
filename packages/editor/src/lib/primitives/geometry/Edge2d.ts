import { Vec2d } from '../Vec2d'
import { linesIntersect } from '../intersect'
import { Geometry2d } from './Geometry2d'

/** @public */
export class Edge2d extends Geometry2d {
	start: Vec2d
	end: Vec2d
	d: Vec2d
	u: Vec2d
	ul: number

	constructor(config: { start: Vec2d; end: Vec2d; isSnappable?: boolean }) {
		super({ ...config, isClosed: false, isFilled: false })
		const { start, end } = config

		this.start = start
		this.end = end

		this.d = start.clone().sub(end) // the delta from start to end
		this.u = this.d.clone().uni() // the unit vector of the edge
		this.ul = this.u.len() // the length of the unit vector
	}

	_length?: number

	get length() {
		if (!this._length) {
			return this.d.len()
		}
		return this._length
	}

	midPoint(): Vec2d {
		return this.start.lrp(this.end, 0.5)
	}

	override getVertices(): Vec2d[] {
		return [this.start, this.end]
	}

	override nearestPoint(point: Vec2d): Vec2d {
		const { start, end, u, ul: l } = this
		if (l === 0) return start // no length in the unit vector
		const k = Vec2d.Sub(point, start).dpr(u) / l
		const cx = start.x + u.x * k
		if (cx < Math.min(start.x, end.x)) return start.x < end.x ? start : end
		if (cx > Math.max(start.x, end.x)) return start.x > end.x ? start : end
		const cy = start.y + u.y * k
		if (cy < Math.min(start.y, end.y)) return start.y < end.y ? start : end
		if (cy > Math.max(start.y, end.y)) return start.y > end.y ? start : end
		return new Vec2d(cx, cy)
	}

	override hitTestLineSegment(A: Vec2d, B: Vec2d, _zoom: number): boolean {
		return linesIntersect(A, B, this.start, this.end)
	}
}
