import { BaseSegment2d } from './BaseSegment2d'
import { Vec2d, VecLike } from './Vec2d'

/** @public */
export interface CubicSegment2dModel {
	a: VecLike
	b: VecLike
	c: VecLike
	d: VecLike
	p: number
}

/** @public */
export class CubicSegment2d extends BaseSegment2d<CubicSegment2dModel> {
	constructor(a: VecLike, b: VecLike, c: VecLike, d: VecLike, p = 25) {
		super({ a, b, c, d, p })
	}

	[Symbol.iterator] = function* (this: InstanceType<typeof CubicSegment2d>) {
		const { a, b, c, d } = this.values
		yield* [a, b, c, d]
	}

	getPath(head = true) {
		const { a, b, c, d } = this.values

		if (Vec2d.Equals(a, d)) return ''

		return `${head ? `M${a.x.toFixed(2)},${a.y.toFixed(2)}C` : ``}${b.x.toFixed(2)},${b.y.toFixed(
			2
		)} ${c.x.toFixed(2)},${c.y.toFixed(2)} ${d.x.toFixed(2)},${d.y.toFixed(2)}`
	}

	getPoint(t: number) {
		const { a, b, c, d } = this.values

		if (t <= 0) return Vec2d.From(a)
		if (t >= 1) return Vec2d.From(d)

		return new Vec2d(
			(1 - t) * (1 - t) * (1 - t) * a.x +
				3 * ((1 - t) * (1 - t)) * t * b.x +
				3 * (1 - t) * (t * t) * c.x +
				t * t * t * d.x,
			(1 - t) * (1 - t) * (1 - t) * a.y +
				3 * ((1 - t) * (1 - t)) * t * b.y +
				3 * (1 - t) * (t * t) * c.y +
				t * t * t * d.y
		)
	}

	getX(t: number) {
		const { a, b, c, d } = this.values

		return (
			(1 - t) * (1 - t) * (1 - t) * a.x +
			3 * ((1 - t) * (1 - t)) * t * b.x +
			3 * (1 - t) * (t * t) * c.x +
			t * t * t * d.x
		)
	}

	getY(t: number) {
		const { a, b, c, d } = this.values

		return (
			(1 - t) * (1 - t) * (1 - t) * a.y +
			3 * ((1 - t) * (1 - t)) * t * b.y +
			3 * (1 - t) * (t * t) * c.y +
			t * t * t * d.y
		)
	}
}
