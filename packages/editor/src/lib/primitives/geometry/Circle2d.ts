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
		const dx = point.x - _center.x
		const dy = point.y - _center.y
		const len = Math.sqrt(dx * dx + dy * dy)
		if (len === 0) return new Vec(_center.x + radius, _center.y)
		const scale = radius / len
		return new Vec(_center.x + dx * scale, _center.y + dy * scale)
	}

	override distanceToPoint(point: VecLike, hitInside = false): number {
		const { _center, _radius: radius } = this
		const dx = point.x - _center.x
		const dy = point.y - _center.y
		const dist = Math.sqrt(dx * dx + dy * dy)
		const distToEdge = dist - radius
		// If inside and we care about inside, return negative
		if (distToEdge < 0 && (this.isFilled || hitInside)) {
			return distToEdge
		}
		return Math.abs(distToEdge)
	}

	override hitTestPoint(point: VecLike, margin = 0, hitInside = false): boolean {
		const { _center, _radius: radius } = this
		const dx = point.x - _center.x
		const dy = point.y - _center.y
		const dist2 = dx * dx + dy * dy
		// If filled or hitInside, point inside circle is a hit
		if ((this.isFilled || hitInside) && dist2 <= radius * radius) {
			return true
		}
		// Check if within margin of the edge: |sqrt(dist2) - radius| <= margin
		// Equivalent to: (sqrt(dist2) - radius)^2 <= margin^2
		// But we need the absolute value, so check both sides
		const outerR = radius + margin
		if (dist2 > outerR * outerR) return false
		const innerR = radius - margin
		if (innerR <= 0) return true // margin >= radius, everything inside outer is a hit
		return dist2 <= outerR * outerR && dist2 >= innerR * innerR
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
