import { Box } from '../Box'
import { Mat } from '../Mat'
import { Vec, VecLike } from '../Vec'
import {
	intersectLineSegmentPolygon,
	intersectLineSegmentPolyline,
	linesIntersect,
} from '../intersect'
import { pointInPolygon } from '../utils'

/** @public */
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
export interface Geometry2dOptions {
	isFilled: boolean
	isClosed: boolean
	isLabel?: boolean
	isInternal?: boolean
	debugColor?: string
	ignore?: boolean
}

/** @public */
export abstract class Geometry2d {
	isFilled = false
	isClosed = true
	isLabel = false
	isInternal = false
	debugColor?: string
	ignore?: boolean

	constructor(opts: Geometry2dOptions) {
		this.isFilled = opts.isFilled
		this.isClosed = opts.isClosed
		this.isLabel = opts.isLabel ?? false
		this.isInternal = opts.isInternal ?? false
		this.debugColor = opts.debugColor
		this.ignore = opts.ignore
	}

	isExcludedByFilter(filters?: Geometry2dFilters) {
		if (!filters) return false
		if (this.isLabel && !filters.includeLabels) return true
		if (this.isInternal && !filters.includeInternal) return true
		return false
	}

	abstract getVertices(filters: Geometry2dFilters): Vec[]

	abstract nearestPoint(point: Vec, filters?: Geometry2dFilters): Vec

	// hitTestPoint(point: Vec, margin = 0, hitInside = false) {
	// 	// We've removed the broad phase here; that should be done outside of the call
	// 	return this.distanceToPoint(point, hitInside) <= margin
	// }

	hitTestPoint(point: Vec, margin = 0, hitInside = false, filters?: Geometry2dFilters) {
		if (this.isExcludedByFilter(filters)) return false
		// First check whether the point is inside
		if (this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)) {
			return true
		}
		// Then check whether the distance is within the margin
		return Vec.Dist2(point, this.nearestPoint(point)) <= margin * margin
	}

	distanceToPoint(point: Vec, hitInside = false, filters?: Geometry2dFilters) {
		return (
			point.dist(this.nearestPoint(point, filters)) *
			(this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)
				? -1
				: 1)
		)
	}

	distanceToLineSegment(A: Vec, B: Vec, filters?: Geometry2dFilters) {
		if (A.equals(B)) return this.distanceToPoint(A, false, filters)
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

	hitTestLineSegment(A: Vec, B: Vec, distance = 0, filters?: Geometry2dFilters): boolean {
		return this.distanceToLineSegment(A, B, filters) <= distance
	}

	*intersectLineSegment(A: VecLike, B: VecLike, filters?: Geometry2dFilters) {
		if (this.isExcludedByFilter(filters)) return

		const intersections = this.isClosed
			? intersectLineSegmentPolygon(A, B, this.vertices)
			: intersectLineSegmentPolyline(A, B, this.vertices)

		if (intersections) yield* intersections
	}

	/** @deprecated Iterate the vertices instead. */
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

	transform(transform: Mat): Geometry2d {
		const vertices = transform.applyToPoints(this.vertices)
		if (this.isClosed) {
			return new Polygon2d({
				points: vertices,
				isFilled: this.isFilled,
				isLabel: this.isLabel,
				isInternal: this.isInternal,
				debugColor: this.debugColor,
				ignore: this.ignore,
			})
		}

		return new Polyline2d({
			points: vertices,
			isLabel: this.isLabel,
			isInternal: this.isInternal,
			debugColor: this.debugColor,
			ignore: this.ignore,
		})
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
		this._length = this.getLength()
		return this._length
	}

	getLength() {
		const { vertices } = this
		let n1: Vec,
			p1 = vertices[0],
			length = 0
		for (let i = 1; i < vertices.length; i++) {
			n1 = vertices[i]
			length += Vec.Dist2(p1, n1)
			p1 = n1
		}
		return Math.sqrt(length)
	}

	abstract getSvgPathData(first: boolean): string
}

// =================================================================================================
// Because Geometry2d.transform depends on Polygon2d and Polyline2d (which in turn depend on
// Edge2d), we need to define them here instead of in their own files. This prevents a circular
// import error.
// =================================================================================================

/** @public */
export class Edge2d extends Geometry2d {
	start: Vec
	end: Vec
	d: Vec
	u: Vec
	ul: number

	constructor(config: { start: Vec; end: Vec }) {
		super({ ...config, isClosed: false, isFilled: false })
		const { start, end } = config

		this.start = start
		this.end = end

		this.d = start.clone().sub(end) // the delta from start to end
		this.u = this.d.clone().uni() // the unit vector of the edge
		this.ul = this.u.len() // the length of the unit vector
	}

	override getLength() {
		return this.d.len()
	}

	midPoint(): Vec {
		return this.start.lrp(this.end, 0.5)
	}

	override getVertices(): Vec[] {
		return [this.start, this.end]
	}

	override nearestPoint(point: Vec): Vec {
		const { start, end, d, u, ul: l } = this
		if (d.len() === 0) return start // start and end are the same
		if (l === 0) return start // no length in the unit vector
		const k = Vec.Sub(point, start).dpr(u) / l
		const cx = start.x + u.x * k
		if (cx < Math.min(start.x, end.x)) return start.x < end.x ? start : end
		if (cx > Math.max(start.x, end.x)) return start.x > end.x ? start : end
		const cy = start.y + u.y * k
		if (cy < Math.min(start.y, end.y)) return start.y < end.y ? start : end
		if (cy > Math.max(start.y, end.y)) return start.y > end.y ? start : end
		return new Vec(cx, cy)
	}

	override hitTestLineSegment(A: Vec, B: Vec, distance = 0): boolean {
		return (
			linesIntersect(A, B, this.start, this.end) || this.distanceToLineSegment(A, B) <= distance
		)
	}

	getSvgPathData(first = true) {
		const { start, end } = this
		return `${first ? `M${start.toFixed()}` : ``} L${end.toFixed()}`
	}
}

/** @public */
export class Polyline2d extends Geometry2d {
	points: Vec[]

	constructor(config: Omit<Geometry2dOptions, 'isFilled' | 'isClosed'> & { points: Vec[] }) {
		super({ isClosed: false, isFilled: false, ...config })
		const { points } = config
		this.points = points
	}

	_segments?: Edge2d[]

	// eslint-disable-next-line no-restricted-syntax
	get segments() {
		if (!this._segments) {
			this._segments = []
			const { vertices } = this
			for (let i = 0, n = vertices.length - 1; i < n; i++) {
				const start = vertices[i]
				const end = vertices[i + 1]
				this._segments.push(new Edge2d({ start, end }))
			}

			if (this.isClosed) {
				this._segments.push(new Edge2d({ start: vertices[vertices.length - 1], end: vertices[0] }))
			}
		}

		return this._segments
	}

	override getLength() {
		return this.segments.reduce((acc, segment) => acc + segment.length, 0)
	}

	getVertices() {
		return this.points
	}

	nearestPoint(A: Vec): Vec {
		const { segments } = this
		let nearest = this.points[0]
		let dist = Infinity
		let p: Vec // current point on segment
		let d: number // distance from A to p
		for (let i = 0; i < segments.length; i++) {
			p = segments[i].nearestPoint(A)
			d = Vec.Dist2(p, A)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	hitTestLineSegment(A: Vec, B: Vec, distance = 0): boolean {
		const { segments } = this
		for (let i = 0, n = segments.length; i < n; i++) {
			if (segments[i].hitTestLineSegment(A, B, distance)) {
				return true
			}
		}
		return false
	}

	getSvgPathData(): string {
		const { vertices } = this
		if (vertices.length < 2) return ''
		return vertices.reduce((acc, vertex, i) => {
			if (i === 0) return `M ${vertex.x} ${vertex.y}`
			return `${acc} L ${vertex.x} ${vertex.y}`
		}, '')
	}
}

/** @public */
export class Polygon2d extends Polyline2d {
	constructor(config: Omit<Geometry2dOptions, 'isClosed'> & { points: Vec[] }) {
		super({ ...config })
		this.isClosed = true
	}
}
