import { assert, invLerp } from '@tldraw/utils'
import { Box } from '../Box'
import { Mat, MatModel } from '../Mat'
import { Vec, VecLike } from '../Vec'
import {
	intersectCirclePolygon,
	intersectCirclePolyline,
	intersectLineSegmentPolygon,
	intersectLineSegmentPolyline,
	intersectPolys,
	linesIntersect,
} from '../intersect'
import { approximately, pointInPolygon } from '../utils'

/**
 * Filter geometry within a group.
 *
 * Filters are ignored when called directly on primitive geometries, but can be used to narrow down
 * the results of an operation on `Group2d` geometries.
 *
 * @public
 */
export interface Geometry2dFilters {
	readonly includeLabels?: boolean
	readonly includeInternal?: boolean
}

/** @public */
export const Geometry2dFilters: {
	EXCLUDE_NON_STANDARD: Geometry2dFilters
	INCLUDE_ALL: Geometry2dFilters
	EXCLUDE_LABELS: Geometry2dFilters
	EXCLUDE_INTERNAL: Geometry2dFilters
} = {
	EXCLUDE_NON_STANDARD: {
		includeLabels: false,
		includeInternal: false,
	},
	INCLUDE_ALL: { includeLabels: true, includeInternal: true },
	EXCLUDE_LABELS: { includeLabels: false, includeInternal: true },
	EXCLUDE_INTERNAL: { includeLabels: true, includeInternal: false },
}

/** @public */
export interface TransformedGeometry2dOptions {
	isLabel?: boolean
	isEmptyLabel?: boolean
	isInternal?: boolean
	debugColor?: string
	ignore?: boolean
}

/** @public */
export interface Geometry2dOptions extends TransformedGeometry2dOptions {
	isFilled: boolean
	isClosed: boolean
}

/** @public */
export abstract class Geometry2d {
	// todo: consider making accessors for these too, so that they can be overridden in subclasses by geometries with more complex logic
	isFilled = false
	isClosed = true
	isLabel = false
	isEmptyLabel = false
	isInternal = false
	debugColor?: string
	ignore?: boolean

	constructor(opts: Geometry2dOptions) {
		const { isLabel = false, isEmptyLabel = false, isInternal = false } = opts
		this.isFilled = opts.isFilled
		this.isClosed = opts.isClosed
		this.debugColor = opts.debugColor
		this.ignore = opts.ignore
		this.isLabel = isLabel
		this.isEmptyLabel = isEmptyLabel
		this.isInternal = isInternal
	}

	isExcludedByFilter(filters?: Geometry2dFilters) {
		if (!filters) return false
		if (this.isLabel && !filters.includeLabels) return true
		if (this.isInternal && !filters.includeInternal) return true
		return false
	}

	abstract getVertices(filters: Geometry2dFilters): Vec[]

	abstract nearestPoint(point: VecLike, _filters?: Geometry2dFilters): Vec

	hitTestPoint(point: VecLike, margin = 0, hitInside = false, _filters?: Geometry2dFilters) {
		// First check whether the point is inside
		if (this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)) {
			return true
		}
		// Then check whether the distance is within the margin
		return Vec.Dist2(point, this.nearestPoint(point)) <= margin * margin
	}

	distanceToPoint(point: VecLike, hitInside = false, filters?: Geometry2dFilters) {
		return (
			Vec.Dist(point, this.nearestPoint(point, filters)) *
			(this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)
				? -1
				: 1)
		)
	}

	distanceToLineSegment(A: VecLike, B: VecLike, filters?: Geometry2dFilters) {
		if (Vec.Equals(A, B)) return this.distanceToPoint(A, false, filters)
		const { vertices } = this
		let nearest: Vec | undefined
		let dist = Infinity
		let d: number, p: Vec, q: Vec
		const nextLimit = this.isClosed ? vertices.length : vertices.length - 1
		for (let i = 0; i < vertices.length; i++) {
			p = vertices[i]
			if (i < nextLimit) {
				const next = vertices[(i + 1) % vertices.length]
				if (linesIntersect(A, B, p, next)) return 0
			}
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

	hitTestLineSegment(A: VecLike, B: VecLike, distance = 0, filters?: Geometry2dFilters): boolean {
		return this.distanceToLineSegment(A, B, filters) <= distance
	}

	intersectLineSegment(A: VecLike, B: VecLike, _filters?: Geometry2dFilters): VecLike[] {
		const intersections = this.isClosed
			? intersectLineSegmentPolygon(A, B, this.vertices)
			: intersectLineSegmentPolyline(A, B, this.vertices)

		return intersections ?? []
	}

	intersectCircle(center: VecLike, radius: number, _filters?: Geometry2dFilters): VecLike[] {
		const intersections = this.isClosed
			? intersectCirclePolygon(center, radius, this.vertices)
			: intersectCirclePolyline(center, radius, this.vertices)

		return intersections ?? []
	}

	intersectPolygon(polygon: VecLike[], _filters?: Geometry2dFilters): VecLike[] {
		return intersectPolys(polygon, this.vertices, true, this.isClosed)
	}

	intersectPolyline(polyline: VecLike[], _filters?: Geometry2dFilters): VecLike[] {
		return intersectPolys(polyline, this.vertices, false, this.isClosed)
	}

	/**
	 * Find a point along the edge of the geometry that is a fraction `t` along the entire way round.
	 */
	interpolateAlongEdge(t: number, _filters?: Geometry2dFilters): Vec {
		const { vertices } = this

		if (t <= 0) return vertices[0]

		const distanceToTravel = t * this.length
		let distanceTraveled = 0

		for (let i = 0; i < (this.isClosed ? vertices.length : vertices.length - 1); i++) {
			const curr = vertices[i]
			const next = vertices[(i + 1) % vertices.length]
			const dist = Vec.Dist(curr, next)
			const newDistanceTraveled = distanceTraveled + dist
			if (newDistanceTraveled >= distanceToTravel) {
				const p = Vec.Lrp(
					curr,
					next,
					invLerp(distanceTraveled, newDistanceTraveled, distanceToTravel)
				)
				return p
			}
			distanceTraveled = newDistanceTraveled
		}

		return this.isClosed ? vertices[0] : vertices[vertices.length - 1]
	}

	/**
	 * Take `point`, find the closest point to it on the edge of the geometry, and return how far
	 * along the edge it is as a fraction of the total length.
	 */
	uninterpolateAlongEdge(point: VecLike, _filters?: Geometry2dFilters): number {
		const { vertices, length } = this
		let closestSegment = null
		let closestDistance = Infinity
		let distanceTraveled = 0

		for (let i = 0; i < (this.isClosed ? vertices.length : vertices.length - 1); i++) {
			const curr = vertices[i]
			const next = vertices[(i + 1) % vertices.length]

			const nearestPoint = Vec.NearestPointOnLineSegment(curr, next, point, true)
			const distance = Vec.Dist(nearestPoint, point)

			if (distance < closestDistance) {
				closestDistance = distance
				closestSegment = {
					start: curr,
					end: next,
					nearestPoint,
					distanceToStart: distanceTraveled,
				}
			}

			distanceTraveled += Vec.Dist(curr, next)
		}

		assert(closestSegment)

		const distanceAlongRoute =
			closestSegment.distanceToStart + Vec.Dist(closestSegment.start, closestSegment.nearestPoint)

		return distanceAlongRoute / length
	}

	/** @deprecated Iterate the vertices instead. */
	nearestPointOnLineSegment(A: VecLike, B: VecLike): Vec {
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

	isPointInBounds(point: VecLike, margin = 0) {
		const { bounds } = this
		return !(
			point.x < bounds.minX - margin ||
			point.y < bounds.minY - margin ||
			point.x > bounds.maxX + margin ||
			point.y > bounds.maxY + margin
		)
	}

	transform(transform: MatModel, opts?: TransformedGeometry2dOptions): Geometry2d {
		return new TransformedGeometry2d(this, transform, opts)
	}

	private _vertices: Vec[] | undefined

	// eslint-disable-next-line no-restricted-syntax
	get vertices(): Vec[] {
		if (!this._vertices) {
			this._vertices = this.getVertices(Geometry2dFilters.EXCLUDE_LABELS)
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

	private _length?: number

	// eslint-disable-next-line no-restricted-syntax
	get length() {
		if (this._length) return this._length
		this._length = this.getLength(Geometry2dFilters.EXCLUDE_LABELS)
		return this._length
	}

	getLength(_filters?: Geometry2dFilters) {
		const vertices = this.getVertices(_filters ?? Geometry2dFilters.EXCLUDE_LABELS)
		if (vertices.length === 0) return 0
		let prev = vertices[0]
		let length = 0
		for (let i = 1; i < vertices.length; i++) {
			const next = vertices[i]
			length += Vec.Dist(prev, next)
			prev = next
		}
		if (this.isClosed) {
			length += Vec.Dist(vertices[vertices.length - 1], vertices[0])
		}
		return length
	}

	abstract getSvgPathData(first: boolean): string
}

// =================================================================================================
// Because Geometry2d.transform depends on TransformedGeometry2d, we need to define it here instead
// of in its own files. This prevents a circular import error.
// =================================================================================================

/** @public */
export class TransformedGeometry2d extends Geometry2d {
	private readonly inverse: MatModel
	private readonly decomposed

	constructor(
		private readonly geometry: Geometry2d,
		private readonly matrix: MatModel,
		opts?: TransformedGeometry2dOptions
	) {
		super(geometry)
		this.inverse = Mat.Inverse(matrix)
		this.decomposed = Mat.Decompose(matrix)

		if (opts) {
			if (opts.isLabel != null) this.isLabel = opts.isLabel
			if (opts.isInternal != null) this.isInternal = opts.isInternal
			if (opts.debugColor != null) this.debugColor = opts.debugColor
			if (opts.ignore != null) this.ignore = opts.ignore
		}

		assert(
			approximately(this.decomposed.scaleX, this.decomposed.scaleY),
			'non-uniform scaling is not yet supported'
		)
	}

	getVertices(filters: Geometry2dFilters): Vec[] {
		return this.geometry.getVertices(filters).map((v) => Mat.applyToPoint(this.matrix, v))
	}

	nearestPoint(point: VecLike, filters?: Geometry2dFilters): Vec {
		return Mat.applyToPoint(
			this.matrix,
			this.geometry.nearestPoint(Mat.applyToPoint(this.inverse, point), filters)
		)
	}

	override hitTestPoint(
		point: VecLike,
		margin = 0,
		hitInside?: boolean,
		filters?: Geometry2dFilters
	): boolean {
		return this.geometry.hitTestPoint(
			Mat.applyToPoint(this.inverse, point),
			margin / this.decomposed.scaleX,
			hitInside,
			filters
		)
	}

	override distanceToPoint(point: VecLike, hitInside = false, filters?: Geometry2dFilters) {
		return (
			this.geometry.distanceToPoint(Mat.applyToPoint(this.inverse, point), hitInside, filters) *
			this.decomposed.scaleX
		)
	}

	override distanceToLineSegment(A: VecLike, B: VecLike, filters?: Geometry2dFilters) {
		return (
			this.geometry.distanceToLineSegment(
				Mat.applyToPoint(this.inverse, A),
				Mat.applyToPoint(this.inverse, B),
				filters
			) * this.decomposed.scaleX
		)
	}

	override hitTestLineSegment(
		A: VecLike,
		B: VecLike,
		distance = 0,
		filters?: Geometry2dFilters
	): boolean {
		return this.geometry.hitTestLineSegment(
			Mat.applyToPoint(this.inverse, A),
			Mat.applyToPoint(this.inverse, B),
			distance / this.decomposed.scaleX,
			filters
		)
	}

	override intersectLineSegment(A: VecLike, B: VecLike, filters?: Geometry2dFilters) {
		return Mat.applyToPoints(
			this.matrix,
			this.geometry.intersectLineSegment(
				Mat.applyToPoint(this.inverse, A),
				Mat.applyToPoint(this.inverse, B),
				filters
			)
		)
	}

	override intersectCircle(center: VecLike, radius: number, filters?: Geometry2dFilters) {
		return Mat.applyToPoints(
			this.matrix,
			this.geometry.intersectCircle(
				Mat.applyToPoint(this.inverse, center),
				radius / this.decomposed.scaleX,
				filters
			)
		)
	}

	override intersectPolygon(polygon: VecLike[], filters?: Geometry2dFilters): VecLike[] {
		return Mat.applyToPoints(
			this.matrix,
			this.geometry.intersectPolygon(Mat.applyToPoints(this.inverse, polygon), filters)
		)
	}

	override intersectPolyline(polyline: VecLike[], filters?: Geometry2dFilters): VecLike[] {
		return Mat.applyToPoints(
			this.matrix,
			this.geometry.intersectPolyline(Mat.applyToPoints(this.inverse, polyline), filters)
		)
	}

	override transform(transform: MatModel, opts?: TransformedGeometry2dOptions): Geometry2d {
		return new TransformedGeometry2d(this.geometry, Mat.Multiply(transform, this.matrix), {
			isLabel: opts?.isLabel ?? this.isLabel,
			isInternal: opts?.isInternal ?? this.isInternal,
			debugColor: opts?.debugColor ?? this.debugColor,
			ignore: opts?.ignore ?? this.ignore,
		})
	}

	getSvgPathData(): string {
		throw new Error('Cannot get SVG path data for transformed geometry.')
	}
}
