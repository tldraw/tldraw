import { Box2d } from '../Box2d'
import { Vec2d } from '../Vec2d'
import { pointInPolygon } from '../utils'

export interface Geometry2dOptions {
	isFilled: boolean
	isClosed: boolean
	margin: number
	isSnappable?: boolean
}

/** @public */
export abstract class Geometry2d {
	margin = 0
	isFilled = false
	isClosed = true
	isSnappable = true

	constructor(opts: Geometry2dOptions) {
		this.isFilled = opts.isFilled
		this.isClosed = opts.isClosed
		this.margin = opts.margin
		this.isSnappable = opts.isSnappable ?? false
	}

	abstract getVertices(): Vec2d[]

	abstract nearestPoint(point: Vec2d): Vec2d

	hitTestPoint(point: Vec2d, zoom = 1, hitInside = false, exact = false) {
		if (!this.expandedBounds.containsPoint(point)) return false
		if (exact) return this.distanceToPoint(point, hitInside) <= 0
		return this.distanceToPoint(point, hitInside) <= this.margin / zoom
	}

	distanceToPoint(point: Vec2d, hitInside = false) {
		const dist = point.dist(this.nearestPoint(point))
		if (this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)) {
			return -dist
		}
		return dist
	}

	distanceToLineSegment(A: Vec2d, B: Vec2d) {
		const point = this.nearestPointOnLineSegment(A, B)
		const dist = Vec2d.DistanceToLineSegment(A, B, point) // repeated, bleh
		return this.isClosed && this.isFilled && pointInPolygon(point, this.vertices) ? -dist : dist
	}

	hitTestLineSegment(A: Vec2d, B: Vec2d, zoom = 1): boolean {
		return this.distanceToLineSegment(A, B) <= this.margin / zoom
	}

	nearestPointOnLineSegment(A: Vec2d, B: Vec2d): Vec2d {
		let distance = Infinity
		let nearest: Vec2d | undefined
		for (let i = 0; i < this.vertices.length; i++) {
			const point = this.vertices[i]
			const d = Vec2d.DistanceToLineSegment(A, B, point)
			if (d < distance) {
				distance = d
				nearest = point
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	isPointInBounds(point: Vec2d) {
		const { bounds, margin } = this
		return !(
			point.x < bounds.minX - margin ||
			point.y < bounds.minY - margin ||
			point.x > bounds.maxX + margin ||
			point.y > bounds.maxY + margin
		)
	}

	_vertices: Vec2d[] | undefined

	get vertices(): Vec2d[] {
		if (!this._vertices) {
			this._vertices = this.getVertices()
		}

		return this._vertices
	}

	getBounds() {
		return Box2d.FromPoints(this.vertices)
	}

	_expandedBounds: Box2d | undefined

	get expandedBounds(): Box2d {
		if (!this._expandedBounds) {
			this._expandedBounds = this.bounds.clone().expandBy(this.margin)
		}
		return this._expandedBounds
	}

	_bounds: Box2d | undefined

	get bounds(): Box2d {
		if (!this._bounds) {
			this._bounds = this.getBounds()
		}
		return this._bounds
	}

	_snapPoints: Vec2d[] | undefined

	get snapPoints() {
		if (!this._snapPoints) {
			this._snapPoints = this.bounds.snapPoints
		}
		return this._snapPoints
	}

	get center() {
		return this.bounds.center
	}

	toSimpleSvgPath() {
		let path = ''

		const { vertices } = this
		const n = vertices.length

		if (n === 0) return path

		path += `M${vertices[0].x},${vertices[0].y}`

		for (let i = 1; i < n; i++) {
			path += `L${vertices[i].x},${vertices[i].y}`
		}

		if (this.isClosed) {
			path += 'Z'
		}

		return path
	}
}
