import { intersectLineSegmentCircle } from '../intersect'
import { getArcMeasure, getPointInArcT, getPointOnCircle } from '../utils'
import { Vec, VecLike } from '../Vec'
import { getVerticesCountForArcLength } from './geometry-constants'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

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

	hitTestLineSegment(A: VecLike, B: VecLike): boolean {
		const {
			_center,
			_radius: radius,
			_measure: measure,
			_angleStart: angleStart,
			_angleEnd: angleEnd,
		} = this
		const intersection = intersectLineSegmentCircle(A, B, _center, radius)
		if (intersection === null) return false

		return intersection.some((p) => {
			const result = getPointInArcT(measure, angleStart, angleEnd, _center.angle(p))
			return result >= 0 && result <= 1
		})
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
		return `${first ? `M${start.toFixed()}` : ``} A${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.toFixed()}`
	}

	override getLength() {
		return Math.abs(this._measure * this._radius)
	}
}
