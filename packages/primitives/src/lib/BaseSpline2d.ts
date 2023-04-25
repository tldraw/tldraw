import { BaseSegment2d } from './BaseSegment2d'
import { Box2d } from './Box2d'
import { Vec2d, VecLike } from './Vec2d'

export abstract class BaseSpline2d<T extends { p: number }> {
	constructor(public points: VecLike[], public p = 50, public k = 1) {}

	abstract segments: BaseSegment2d<T>[]

	abstract getSegmentsFromPoints(points: VecLike[], p: number, k: number): BaseSegment2d<T>[]

	protected computed: {
		length?: number
		bounds?: Box2d
		path?: string
		lut?: Vec2d[]
	} = {}

	get length() {
		if (this.computed.length !== undefined) {
			return this.computed.length
		}

		const { segments } = this

		const result = segments.reduce((acc, curr) => acc + curr.length, 0)

		this.computed.length = result

		return result
	}

	get bounds() {
		if (this.computed.bounds !== undefined) {
			return this.computed.bounds
		}

		const { segments } = this

		const result = Box2d.Common(segments.map((segment) => segment.bounds))

		this.computed.bounds = result

		return result
	}

	get head() {
		const { points } = this
		return points[0]
	}

	get tail() {
		const { points } = this
		return points[points.length - 1]
	}

	get path() {
		if (this.computed.path !== undefined) {
			return this.computed.path
		}

		const result = this.segments
			.map((segment) => segment.path)
			.filter((i) => i !== undefined && i !== null && i !== '')
			.join(' ')

		this.computed.path = result

		return result
	}

	addPoint(point: Vec2d) {
		const { points, k, p } = this
		points.push(point)
		this.computed = {}
		this.getSegmentsFromPoints(this.points, p, k)
		return this
	}

	removePoint(point: Vec2d | number) {
		const { points, k, p } = this
		const index = typeof point === 'number' ? Math.floor(point) : points.indexOf(point)
		if (index === -1) return this
		points.splice(index, 1)
		this.computed = {}
		this.getSegmentsFromPoints(this.points, p, k)
		return this
	}

	getPointAtLength(length: number) {
		const { segments } = this

		let remaining = length

		if (length <= 0) return segments[0].getPoint(0)
		if (length >= this.length) return segments[segments.length - 1].getPoint(1)

		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i]
			const { length: segmentLength } = segment

			if (remaining < segmentLength) {
				return segment.getPoint(remaining / segmentLength)
			}

			remaining -= segment.length
		}

		return segments[segments.length - 1].getPoint(1)
	}

	getPoint(t: number) {
		if (t <= 0) return this.segments[0].getPoint(0)
		if (t >= 1) return this.segments[this.segments.length - 1].getPoint(1)
		return this.getPointAtLength(t * this.length)
	}

	getNormal(t: number): Vec2d {
		const { length } = this
		return this.getNormalAtLength(t * length)
	}

	getNormalAtLength(t: number): Vec2d {
		const { segments } = this

		if (t < 0) return new Vec2d(0, 0)

		let remaining = t

		for (const segment of segments) {
			const segmentLength = segment.length
			if (remaining <= segmentLength) {
				return segment.getNormal(remaining / segmentLength)
			}
			remaining -= segmentLength
		}

		return new Vec2d(0, 0)
	}

	getClosestPointTo(point: Vec2d) {
		const { head, segments } = this
		let closestPoint = head
		let closestDistance = Vec2d.Dist(point, head)

		for (const segment of segments) {
			const p = segment.getClosestPointTo(point)
			if (p.distance < closestDistance) {
				closestDistance = p.distance
				closestPoint = p.point
			}
		}

		return { point: closestPoint, distance: closestDistance }
	}
}
