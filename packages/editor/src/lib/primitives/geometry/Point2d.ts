import { Vec2d } from '../Vec2d'
import { Geometry2d } from './Geometry2d'

/** @public */
export class Point2d extends Geometry2d {
	point: Vec2d

	constructor(config: { margin: number; point: Vec2d }) {
		super()
		const { margin, point } = config

		this.margin = margin
		this.point = point
		this.isClosed = true
	}

	getVertices() {
		return [this.point]
	}

	nearestPoint(): Vec2d {
		return this.point
	}

	hitTestLineSegment(A: Vec2d, B: Vec2d): boolean {
		return Vec2d.DistanceToLineSegment(A, B, this.point) < this.margin
	}
}
