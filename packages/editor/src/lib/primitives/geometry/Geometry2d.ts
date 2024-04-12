import earcut from 'earcut'
// @ts-expect-error
import extrudePolyline from 'extrude-polyline'
import { Box } from '../Box'
import { Vec } from '../Vec'
import { pointInPolygon } from '../utils'

export interface Geometry2dOptions {
	isFilled: boolean
	isClosed: boolean
	isLabel?: boolean
	debugColor?: string
	ignore?: boolean
}

/** @public */
export abstract class Geometry2d {
	isFilled = false
	isClosed = true
	isLabel = false
	debugColor?: string
	ignore?: boolean

	constructor(opts: Geometry2dOptions) {
		this.isFilled = opts.isFilled
		this.isClosed = opts.isClosed
		this.isLabel = opts.isLabel ?? false
		this.debugColor = opts.debugColor
		this.ignore = opts.ignore
	}

	abstract getVertices(): Vec[]

	abstract nearestPoint(point: Vec): Vec

	// hitTestPoint(point: Vec, margin = 0, hitInside = false) {
	// 	// We've removed the broad phase here; that should be done outside of the call
	// 	return this.distanceToPoint(point, hitInside) <= margin
	// }

	hitTestPoint(point: Vec, margin = 0, hitInside = false) {
		// First check whether the point is inside
		if (this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)) {
			return true
		}
		// Then check whether the distance is within the margin
		return Vec.Dist2(point, this.nearestPoint(point)) <= margin * margin
	}

	distanceToPoint(point: Vec, hitInside = false) {
		return (
			point.dist(this.nearestPoint(point)) *
			(this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)
				? -1
				: 1)
		)
	}

	distanceToLineSegment(A: Vec, B: Vec) {
		if (A.equals(B)) return this.distanceToPoint(A)
		const { vertices } = this
		let nearest: Vec | undefined
		let dist = Infinity
		let d: number, p: Vec, q: Vec
		for (let i = 0; i < vertices.length; i++) {
			p = vertices[i]
			q = Vec.NearestPointOnLineSegment(A, B, p, true)
			d = Vec.Dist2(p, q)
			if (d < dist) {
				dist = d
				nearest = q
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return this.isClosed && this.isFilled && pointInPolygon(nearest, this.vertices) ? -dist : dist
	}

	hitTestLineSegment(A: Vec, B: Vec, distance = 0): boolean {
		return this.distanceToLineSegment(A, B) <= distance
	}

	nearestPointOnLineSegment(A: Vec, B: Vec): Vec {
		const { vertices } = this
		let nearest: Vec | undefined
		let dist = Infinity
		let d: number, p: Vec, q: Vec
		for (let i = 0; i < vertices.length; i++) {
			p = vertices[i]
			q = Vec.NearestPointOnLineSegment(A, B, p, true)
			d = Vec.Dist2(p, q)
			if (d < dist) {
				dist = d
				nearest = q
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	isPointInBounds(point: Vec, margin = 0) {
		const { bounds } = this
		return !(
			point.x < bounds.minX - margin ||
			point.y < bounds.minY - margin ||
			point.x > bounds.maxX + margin ||
			point.y > bounds.maxY + margin
		)
	}

	private _vertices: Vec[] | undefined

	// eslint-disable-next-line no-restricted-syntax
	get vertices(): Vec[] {
		if (!this._vertices) {
			this._vertices = this.getVertices()
		}

		return this._vertices
	}

	getBounds() {
		return Box.FromPoints(this.vertices)
	}

	private _bounds: Box | undefined

	// eslint-disable-next-line no-restricted-syntax
	get bounds(): Box {
		if (!this._bounds) {
			this._bounds = this.getBounds()
		}
		return this._bounds
	}

	// eslint-disable-next-line no-restricted-syntax
	get center() {
		return this.bounds.center
	}

	private _area: number | undefined

	// eslint-disable-next-line no-restricted-syntax
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

	stroke = extrudePolyline({
		thickness: 8,
		cap: 'square',
		join: 'bevel',
		miterLimit: 1,
	})

	_getWebGLGeometry(): WebGLGeometry {
		const vertices = this.vertices
		if (!this.isClosed) {
			const triangels = this.stroke.build(vertices.map((v) => [v.x, v.y]))
			const arr = new Float32Array(triangels.cells.length * 3 * 2)
			let j = 0
			for (const cell of triangels.cells) {
				arr[j++] = triangels.positions[cell[0]][0]
				arr[j++] = triangels.positions[cell[0]][1]

				arr[j++] = triangels.positions[cell[1]][0]
				arr[j++] = triangels.positions[cell[1]][1]

				arr[j++] = triangels.positions[cell[2]][0]
				arr[j++] = triangels.positions[cell[2]][1]
			}
			return new WebGLGeometry(new Float32Array(arr))
		} else {
			const points = vertices.map((v) => [v.x, v.y]).flat()
			if (this.isClosed) points.push(vertices[0].x, vertices[0].y)
			const triangles = earcut(points)
			const arr = new Float32Array(triangles.length * 2)
			let j = 0
			for (const i of triangles) {
				arr[j * 2] = points[i * 2]
				arr[j * 2 + 1] = points[i * 2 + 1]
				j++
			}

			return new WebGLGeometry(arr)
		}
	}

	_webGlGeometry: WebGLGeometry | undefined
	getWebGLGeometry() {
		if (!this._webGlGeometry) {
			this._webGlGeometry = this._getWebGLGeometry()
		}
		return this._webGlGeometry
	}
}

export class WebGLGeometry {
	constructor(public readonly values: Float32Array) {}

	equals(other: any) {
		if (this === other) return true
		if (!(other instanceof WebGLGeometry)) return false
		for (let i = 0; i < this.values.length; i++) {
			if (this.values[i] !== other.values[i]) return false
		}
	}
}
