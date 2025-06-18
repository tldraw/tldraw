import { Vec, VecLike } from '../Vec'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

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

	hitTestLineSegment(A: VecLike, B: VecLike, margin: number): boolean {
		return Vec.DistanceToLineSegment(A, B, this._point) < margin
	}

	getSvgPathData() {
		const { _point: point } = this
		return `M${point.toFixed()}`
	}
}
