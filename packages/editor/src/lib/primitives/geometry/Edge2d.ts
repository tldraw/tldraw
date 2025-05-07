import { linesIntersect } from '../intersect'
import { Vec, VecLike } from '../Vec'
import { Geometry2d } from './Geometry2d'

/** @public */
export class Edge2d extends Geometry2d {
	start: Vec
	end: Vec
	d: Vec
	u: Vec
	ul: number

	constructor(config: { start: Vec; end: Vec }) {
		super({ ...config, isClosed: false, isFilled: false })
		const { start, end } = config

		this.start = start
		this.end = end

		this.d = start.clone().sub(end) // the delta from start to end
		this.u = this.d.clone().uni() // the unit vector of the edge
		this.ul = this.u.len() // the length of the unit vector
	}

	override getLength() {
		return this.d.len()
	}

	midPoint(): Vec {
		return this.start.lrp(this.end, 0.5)
	}

	override getVertices(): Vec[] {
		return [this.start, this.end]
	}

	override nearestPoint(point: VecLike): Vec {
		const { start, end, d, u, ul: l } = this
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

	override hitTestLineSegment(A: VecLike, B: VecLike, distance = 0): boolean {
		return (
			linesIntersect(A, B, this.start, this.end) || this.distanceToLineSegment(A, B) <= distance
		)
	}

	getSvgPathData(first = true) {
		const { start, end } = this
		return `${first ? `M${start.toFixed()}` : ``} L${end.toFixed()}`
	}
}
