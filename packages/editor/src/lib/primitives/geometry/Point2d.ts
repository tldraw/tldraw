import { Vec, VecLike } from '../Vec'
import { Geometry2d, Geometry2dFilters, Geometry2dOptions, getHitReach } from './Geometry2d'

/** @public */
export class Point2d extends Geometry2d {
	private _point: Vec

	constructor(
		config: Omit<Geometry2dOptions, 'isClosed' | 'isFilled'> & { margin: number; point: Vec }
	) {
		super({ ...config, isClosed: true, isFilled: true })
		const { point } = config

		this._point = point
	}

	getVertices() {
		return [this._point]
	}

	nearestPoint(): Vec {
		return this._point
	}

	override hitTestLineSegment(
		A: VecLike,
		B: VecLike,
		margin: number,
		filters?: Geometry2dFilters
	): boolean {
		return Vec.DistanceToLineSegment(A, B, this._point) < getHitReach(this, margin, filters)
	}

	getSvgPathData() {
		const { _point: point } = this
		return `M${point}`
	}
}
