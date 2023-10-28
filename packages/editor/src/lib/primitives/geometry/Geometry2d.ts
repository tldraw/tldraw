import { Box2d } from '../Box2d'
import { Vec2d } from '../Vec2d'
import { pointInPolygon } from '../utils'

export interface Geometry2dOptions {
	isFilled: boolean
	isClosed: boolean
	isLabel?: boolean
	isSnappable?: boolean
}

/** @public */
export abstract class Geometry2d {
	isFilled = false
	isClosed = true
	isLabel = false
	isSnappable = true

	constructor(opts: Geometry2dOptions) {
		this.isFilled = opts.isFilled
		this.isClosed = opts.isClosed
		this.isSnappable = opts.isSnappable ?? false
		this.isLabel = opts.isLabel ?? false
	}

	abstract getVertices(): Vec2d[]

	abstract nearestPoint(point: Vec2d): Vec2d

	hitTestPoint(point: Vec2d, margin = 0, hitInside = false) {
		// We've removed the broad phase here; that should be done outside of the call
		return this.distanceToPoint(point, hitInside) <= margin
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

	hitTestLineSegment(A: Vec2d, B: Vec2d, distance = 0): boolean {
		return this.distanceToLineSegment(A, B) <= distance
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

	isPointInBounds(point: Vec2d, margin = 0) {
		const { bounds } = this
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

	_area: number | undefined

	get area() {
		if (!this._area) {
			this._area = this.getArea()
		}
		return this._area
	}

	getArea() {
		if (!this.isClosed) {
			return 0
		}
		const { vertices } = this
		let area = 0
		for (let i = 0, n = vertices.length; i < n; i++) {
			const curr = vertices[i]
			const next = vertices[(i + 1) % n]
			area += curr.x * next.y - next.x * curr.y
		}
		return area / 2
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
