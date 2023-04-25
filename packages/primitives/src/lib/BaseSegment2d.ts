import { Box2d } from './Box2d'
import { Vec2d, VecLike } from './Vec2d'

/**
 * A base segment used for cubic and quadradic curves.
 *
 * @public
 */
export abstract class BaseSegment2d<T extends { p: number }> {
	constructor(values: T) {
		this._values = values
	}

	/**
	 * The segment's values. Do not modify these directly. Instead, use the `values` setter or
	 * `update` method.
	 *
	 * @internal
	 */
	protected _values: T

	/**
	 * A private set of cached values, used for lookups and computations. Changing any of the
	 * segment's values will clear this object.
	 *
	 * @internal
	 */
	protected _computed: {
		length?: number
		bounds?: Box2d
		path?: string
		lut?: Vec2d[]
		midPoint?: Vec2d
	} = {}

	/**
	 * The values for the curve segment.
	 *
	 * @public
	 */
	get values() {
		return this._values
	}

	set values(values: T) {
		this._values = values
		this._computed = {}
	}

	/**
	 * The length of the curve segment.
	 *
	 * @public
	 */
	get length(): number {
		if (this._computed.length !== undefined) {
			return this._computed.length
		}

		const { lut } = this

		let prev = lut[0]
		let result = 0

		for (let i = 1; i < lut.length; i++) {
			const curr = lut[i]
			result += prev.dist(curr)
			prev = curr
		}

		this._computed.length = result

		return result
	}

	/**
	 * The bounding box containing the curve segment.
	 *
	 * @public
	 */
	get bounds(): Box2d {
		if (this._computed.bounds !== undefined) {
			return this._computed.bounds
		}

		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity

		const { lut } = this

		for (const pt of lut) {
			minX = Math.min(pt.x, minX)
			minY = Math.min(pt.y, minY)
			maxX = Math.max(pt.x, maxX)
			maxY = Math.max(pt.y, maxY)
		}

		const result = new Box2d(minX, minY, maxX - minX, maxY - minY)

		this._computed.bounds = result

		return result
	}

	/**
	 * A lookup table consisting of values.p points along the segment. Used to compute lengths,
	 * closest points, etc. This should only be _computed once (when first requested) per set of
	 * values.
	 *
	 * @public
	 */
	get lut() {
		if (this._computed.lut) {
			return this._computed.lut
		}

		const { p } = this.values

		const result: Vec2d[] = []

		for (let i = 0; i < p + 1; i++) {
			result.push(this.getPoint(i / p))
		}

		this._computed.lut = result

		return result
	}

	/**
	 * A point half-way along the length of the segment.
	 *
	 * @public
	 */
	get midPoint() {
		if (this._computed.midPoint) {
			return this._computed.midPoint
		}

		const result = this.getPoint(0.5)

		this._computed.midPoint = result

		return result
	}

	/**
	 * An SVG path for the segment.
	 *
	 * @public
	 */
	get path() {
		if (this._computed.path) {
			return this._computed.path
		}

		const result = this.getPath()

		this._computed.path = result

		return result
	}

	/**
	 * Evaluate a point at a length along the curve segment.
	 *
	 * @param length - The length to find the point value.
	 * @public
	 */
	getPointAtLength(length: number) {
		const t = Math.max(0, Math.min(1, length / this.length))

		return this.getPoint(t)
	}

	/**
	 * Get the normal at distance t along the curve segment.
	 *
	 * @param t - The distance (0-1) to find the normal.
	 * @public
	 */
	getNormal(t: number) {
		return this.getPoint(t - 0.0025)
			.tan(this.getPoint(t + 0.0025))
			.per()
			.uni()
			.toFixed()
	}

	/**
	 * Get the normal at a length along the curve segment.
	 *
	 * @param length - The length to find the normal.
	 * @public
	 */
	getNormalAtLength(length: number) {
		return this.getNormal(length / this.length)
	}

	/**
	 * Get the closest point on the segment to an arbitrary point.
	 *
	 * @param point - The arbitrary point.
	 * @public
	 */
	getClosestPointTo(point: VecLike) {
		const { lut } = this

		let closestT = 0
		let closestPoint = lut[0]
		let closestDistance = lut[0].dist(point)

		// Find the closest
		for (let i = 1; i < lut.length; i++) {
			const distance = Vec2d.Dist(lut[i], point)
			if (distance < closestDistance) {
				closestDistance = distance
				closestPoint = lut[i]
				closestT = i / lut.length
			}
		}

		// Solve again for the closest point on the segment
		const step = 1 / this.values.p

		for (
			let t = Math.max(0, closestT - step / 2);
			t < Math.min(1, closestT + step / 2);
			t += step / 10
		) {
			const pt = this.getPoint(t)
			const distance = Vec2d.Dist(pt, point)
			if (distance < closestDistance) {
				closestDistance = distance
				closestPoint = pt
			}
		}

		return { point: closestPoint, distance: closestDistance }
	}

	/**
	 * Set one or more values. Updating the segment will clear cached values.
	 *
	 * @param values - A partial of the segment's values object.
	 * @public
	 */
	update(values: Partial<T>) {
		this._computed = {}
		this.values = { ...this.values, ...values }
	}

	/**
	 * Get the SVG path data for the segment.
	 *
	 * @public
	 */
	abstract getPath(head?: boolean): string

	/**
	 * Evaluate a point at distance t along the curve segment.
	 *
	 * @param t - The distance (0-1) to find the point.
	 * @public
	 */
	abstract getPoint(t: number): Vec2d

	/**
	 * Evaluate a x value at distance t along the curve segment.
	 *
	 * @param t - The distance (0-1) to find the x value.
	 * @public
	 */
	abstract getX(t: number): number

	/**
	 * Evaluate a y value at distance t along the curve segment.
	 *
	 * @param t - The distance (0-1) to find the y value.
	 * @public
	 */
	abstract getY(t: number): number
}
