import { Box2d } from './Box2d'
import { Vec2d } from './Vec2d'
import { pointInPolygon } from './utils'

/** @public */
export abstract class Geometry2d {
	margin = 0
	isFilled = false
	isClosed = true

	abstract getVertices(): Vec2d[]

	abstract nearestPoint(point: Vec2d): Vec2d

	abstract hitTestLineSegment(A: Vec2d, B: Vec2d): boolean

	distanceToPoint(point: Vec2d) {
		const dist = point.dist(this.nearestPoint(point))
		return this.isClosed && this.isFilled && pointInPolygon(point, this.vertices) ? -dist : dist
	}

	hitTestPoint(point: Vec2d, zoom = 1) {
		return this.distanceToPoint(point) <= this.margin / zoom
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
