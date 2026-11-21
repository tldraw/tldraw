import { intersectLineSegmentCircle } from '../intersect'
import { PI2, getArcMeasure, getPointInArcT, getPointOnCircle } from '../utils'
import { Vec, VecLike } from '../Vec'
import { getVerticesCountForArcLength } from './geometry-constants'
import { Geometry2d, Geometry2dFilters, Geometry2dOptions, getHitReach } from './Geometry2d'

/** @public */
export class Arc2d extends Geometry2d {
	private _center: Vec
	private _radius: number
	private _start: Vec
	private _end: Vec
	private _largeArcFlag: number
	private _sweepFlag: number
	private _measure: number
	private _angleStart: number
	private _angleEnd: number

	constructor(
		config: Omit<Geometry2dOptions, 'isFilled' | 'isClosed'> & {
			center: Vec
			start: Vec
			end: Vec
			sweepFlag: number
			largeArcFlag: number
		}
	) {
		super({ ...config, isFilled: false, isClosed: false })
		const { center, sweepFlag, largeArcFlag, start, end } = config
		if (start.equals(end)) throw Error(`Arc must have different start and end points.`)

		// ensure that the start and end are clockwise
		this._angleStart = Vec.Angle(center, start)
		this._angleEnd = Vec.Angle(center, end)
		this._radius = Vec.Dist(center, start)
		this._measure = getArcMeasure(this._angleStart, this._angleEnd, sweepFlag, largeArcFlag)

		this._start = start
		this._end = end

		this._sweepFlag = sweepFlag
		this._largeArcFlag = largeArcFlag
		this._center = center
	}

	nearestPoint(point: VecLike): Vec {
		const {
			_center,
			_measure: measure,
			_radius: radius,
			_angleEnd: angleEnd,
			_angleStart: angleStart,
			_start: A,
			_end: B,
		} = this
		const t = getPointInArcT(measure, angleStart, angleEnd, _center.angle(point))
		if (t <= 0) return A
		if (t >= 1) return B

		// Inlined: Vec.Sub(point, _center).uni().mul(radius).add(_center)
		// When t is in (0,1), the nearest point is the radial projection of point onto the arc.
		// Previously this also checked min-distance against A and B, but that's unnecessary when
		// t is already in range — the radial projection is always closer.
		const dx = point.x - _center.x
		const dy = point.y - _center.y
		const len = Math.sqrt(dx * dx + dy * dy)
		if (len === 0) return A
		const scale = radius / len
		return new Vec(_center.x + dx * scale, _center.y + dy * scale)
	}

	override hitTestLineSegment(
		A: VecLike,
		B: VecLike,
		distance = 0,
		filters?: Geometry2dFilters
	): boolean {
		// Hit if AB comes within reach of either end, or enters [radius - reach, radius + reach] at
		// an angle the arc spans. Sampled vertices would miss tangent drags between samples.
		const { _center, _radius: radius, _start, _end } = this
		const reach = getHitReach(this, distance, filters)
		if (
			Vec.DistanceToLineSegment(A, B, _start) <= reach ||
			Vec.DistanceToLineSegment(A, B, _end) <= reach ||
			this.isInBand(A, reach) ||
			this.isInBand(B, reach) ||
			// a tangent touch, which the circle intersections below don't report
			this.isInBand(Vec.NearestPointOnLineSegment(A, B, _center, true), reach)
		) {
			return true
		}
		// Otherwise AB can only enter the band across one of its arcs: its radial sides lie within
		// reach of the ends
		for (const r of [radius + reach, radius - reach]) {
			if (r <= 0) continue
			if (intersectLineSegmentCircle(A, B, _center, r)?.some((p) => this.spansAngleOf(p))) {
				return true
			}
		}
		return false
	}

	private spansAngleOf(point: VecLike) {
		// Not getPointInArcT: it clamps angles outside the arc to its ends
		const { _measure: measure } = this
		const a = (this._center.angle(point) - this._angleStart) * Math.sign(measure)
		return ((a % PI2) + PI2) % PI2 <= Math.abs(measure)
	}

	private isInBand(point: VecLike, reach: number) {
		return (
			Math.abs(Vec.Dist(this._center, point) - this._radius) <= reach && this.spansAngleOf(point)
		)
	}

	getVertices(): Vec[] {
		const { _center, _measure: measure, length, _radius: radius, _angleStart: angleStart } = this
		const vertices: Vec[] = []
		for (let i = 0, n = getVerticesCountForArcLength(Math.abs(length)); i < n + 1; i++) {
			const t = (i / n) * measure
			const angle = angleStart + t
			vertices.push(getPointOnCircle(_center, radius, angle))
		}
		return vertices
	}

	getSvgPathData(first = true) {
		const {
			_start: start,
			_end: end,
			_radius: radius,
			_largeArcFlag: largeArcFlag,
			_sweepFlag: sweepFlag,
		} = this
		return `${first ? `M${start}` : ``} A${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end}`
	}

	override getLength() {
		return Math.abs(this._measure * this._radius)
	}
}
