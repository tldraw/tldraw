import { Vec, VecLike } from '../Vec'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class Point2d extends Geometry2d {
	point: Vec

	constructor(
		config: Omit<Geometry2dOptions, 'isClosed' | 'isFilled'> & { margin: number; point: Vec }
	) {
		super({ ...config, isClosed: true, isFilled: true })
		const { point } = config

		this.point = point
	}

	getVertices() {
		return [this.point]
	}

	nearestPoint(): Vec {
		return this.point
	}

	hitTestLineSegment(A: VecLike, B: VecLike, margin: number): boolean {
		return Vec.DistanceToLineSegment(A, B, this.point) < margin
	}

	getSvgPathData() {
		const { point } = this
		return `M${point.toFixed()}`
	}
}
