import { Vec2d } from '../Vec2d'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class Point2d extends Geometry2d {
	point: Vec2d

	constructor(
		config: Omit<Geometry2dOptions, 'isClosed' | 'isFilled'> & { margin: number; point: Vec2d }
	) {
		super({ ...config, isClosed: true, isFilled: true })
		const { point } = config

		this.point = point
	}

	getVertices() {
		return [this.point]
	}

	nearestPoint(): Vec2d {
		return this.point
	}

	hitTestLineSegment(A: Vec2d, B: Vec2d, margin: number): boolean {
		return Vec2d.DistanceToLineSegment(A, B, this.point) < margin
	}
}
