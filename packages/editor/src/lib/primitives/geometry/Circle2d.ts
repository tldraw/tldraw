import { Box } from '../Box'
import { Vec } from '../Vec'
import { intersectLineSegmentCircle } from '../intersect'
import { PI2, getPointOnCircle } from '../utils'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'
import { getVerticesCountForLength } from './geometry-constants'

/** @public */
export class Circle2d extends Geometry2d {
	_center: Vec
	radius: number
	x: number
	y: number

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
		this.x = x
		this.y = y
		this._center = new Vec(radius + x, radius + y)
		this.radius = radius
	}

	getBounds() {
		return new Box(this.x, this.y, this.radius * 2, this.radius * 2)
	}

	getVertices(): Vec[] {
		const { _center, radius } = this
		const perimeter = PI2 * radius
		const vertices: Vec[] = []
		for (let i = 0, n = getVerticesCountForLength(perimeter); i < n; i++) {
			const angle = (i / n) * PI2
			vertices.push(getPointOnCircle(_center, radius, angle))
		}
		return vertices
	}

	nearestPoint(point: Vec): Vec {
		const { _center, radius } = this
		if (_center.equals(point)) return Vec.AddXY(_center, radius, 0)
		return _center.clone().add(point.clone().sub(_center).uni().mul(radius))
	}

	hitTestLineSegment(A: Vec, B: Vec, distance = 0): boolean {
		const { _center, radius } = this
		return intersectLineSegmentCircle(A, B, _center, radius + distance) !== null
	}

	getSvgPathData(): string {
		const { _center, radius } = this
		return `M${_center.x + radius},${_center.y} a${radius},${radius} 0 1,0 ${radius * 2},0a${radius},${radius} 0 1,0 -${radius * 2},0`
	}
}
