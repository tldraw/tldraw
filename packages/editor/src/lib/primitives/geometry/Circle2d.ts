import { Box } from '../Box'
import { Vec, VecLike } from '../Vec'
import { intersectLineSegmentCircle } from '../intersect'
import { PI2, getPointOnCircle } from '../utils'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'
import { getVerticesCountForArcLength } from './geometry-constants'

/** @public */
export class Circle2d extends Geometry2d {
	private _center: Vec
	private _radius: number
	private _x: number
	private _y: number

	constructor(
		public config: Omit<Geometry2dOptions, 'isClosed'> & {
			x?: number
			y?: number
			radius: number
			isFilled: boolean
		}
	) {
		super({ isClosed: true, ...config })
		const { x = 0, y = 0, radius } = config
		this._x = x
		this._y = y
		this._center = new Vec(radius + x, radius + y)
		this._radius = radius
	}

	getBounds() {
		return new Box(this._x, this._y, this._radius * 2, this._radius * 2)
	}

	getVertices(): Vec[] {
		const { _center, _radius: radius } = this
		const perimeter = PI2 * radius
		const vertices: Vec[] = []
		for (let i = 0, n = getVerticesCountForArcLength(perimeter); i < n; i++) {
			const angle = (i / n) * PI2
			vertices.push(getPointOnCircle(_center, radius, angle))
		}
		return vertices
	}

	nearestPoint(point: VecLike): Vec {
		const { _center, _radius: radius } = this
		if (_center.equals(point)) return Vec.AddXY(_center, radius, 0)
		return Vec.Sub(point, _center).uni().mul(radius).add(_center)
	}

	hitTestLineSegment(A: VecLike, B: VecLike, distance = 0): boolean {
		const { _center, _radius: radius } = this
		return intersectLineSegmentCircle(A, B, _center, radius + distance) !== null
	}

	getSvgPathData(): string {
		const { _center, _radius: radius } = this
		return `M${_center.x + radius},${_center.y} a${radius},${radius} 0 1,0 ${radius * 2},0a${radius},${radius} 0 1,0 -${radius * 2},0`
	}
}
