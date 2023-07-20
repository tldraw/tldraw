import { Geometry2d } from '../Geometry2d'
import { Vec2d } from '../Vec2d'
import { intersectLineSegmentLineSegment } from '../intersect'

/** @public */
export class Edge2d extends Geometry2d {
	start: Vec2d
	end: Vec2d
	d: Vec2d
	u: Vec2d
	length: number

	constructor(config: { start: Vec2d; end: Vec2d; margin: number }) {
		super()
		const { start, end, margin } = config

		this.start = start
		this.end = end
		this.margin = margin

		this.d = start.clone().sub(end)
		this.u = this.d.clone().uni()
		this.length = this.d.len()
	}

	midPoint(): Vec2d {
		return this.start.lrp(this.end, 0.5)
	}

	override getVertices(): Vec2d[] {
		return [this.start, this.end]
	}

	override nearestPoint(point: Vec2d): Vec2d {
		const { start, end, u } = this
		if (start.equals(end)) return start.clone()
		const C = start.clone().add(u.clone().mul(point.clone().sub(start).pry(u)))
		if (C.x < Math.min(start.x, end.x)) return start.x < end.x ? start.clone() : end.clone()
		if (C.x > Math.max(start.x, end.x)) return start.x > end.x ? start.clone() : end.clone()
		if (C.y < Math.min(start.y, end.y)) return start.y < end.y ? start.clone() : end.clone()
		if (C.y > Math.max(start.y, end.y)) return start.y > end.y ? start.clone() : end.clone()
		return C
	}

	override hitTestLineSegment(A: Vec2d, B: Vec2d): boolean {
		return intersectLineSegmentLineSegment(A, B, this.start, this.end) !== null
	}
}
