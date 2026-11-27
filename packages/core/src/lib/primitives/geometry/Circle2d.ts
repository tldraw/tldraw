import { Box } from '../Box'
import { intersectLineSegmentCircle } from '../intersect'
import { PI2, getPointOnCircle } from '../utils'
import { Vec, VecLike } from '../Vec'
import { getVerticesCountForArcLength } from './geometry-constants'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

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
		// Inlined: Vec.Sub(point, _center).uni().mul(radius).add(_center)
		// Computes direction from center to point, normalizes, scales by radius, offsets by center.
		const { _center, _radius: radius } = this
		const dx = point.x - _center.x
		const dy = point.y - _center.y
		const len = Math.sqrt(dx * dx + dy * dy)
		if (len === 0) return new Vec(_center.x + radius, _center.y)
		const scale = radius / len
		return new Vec(_center.x + dx * scale, _center.y + dy * scale)
	}

	override distanceToPoint(point: VecLike, hitInside = false): number {
		// Inlined: Math.abs(Vec.Dist(point, _center) - radius)
		// Computes distance from point to center, then subtracts radius for edge distance.
		// Returns negative when inside a filled circle to indicate containment.
		const { _center, _radius: radius } = this
		const dx = point.x - _center.x
		const dy = point.y - _center.y
		const dist = Math.sqrt(dx * dx + dy * dy)
		const distToEdge = dist - radius
		if (distToEdge < 0 && (this.isFilled || hitInside)) {
			return distToEdge
		}
		return Math.abs(distToEdge)
	}

	override hitTestPoint(point: VecLike, margin = 0, hitInside = false): boolean {
		// Equivalent to: dist = Vec.Dist(point, _center); return dist within [radius - margin, radius + margin]
		// Uses squared distances throughout to avoid any sqrt calls.
		const { _center, _radius: radius } = this
		const dx = point.x - _center.x
		const dy = point.y - _center.y
		const dist2 = dx * dx + dy * dy
		if ((this.isFilled || hitInside) && dist2 <= radius * radius) {
			return true
		}
		const outerR = radius + margin
		if (dist2 > outerR * outerR) return false
		const innerR = radius - margin
		if (innerR <= 0) return true
		return dist2 >= innerR * innerR
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
