import { Vec2d } from '../Vec2d'
import { Geometry2dOptions } from './Geometry2d'
import { Polyline2d } from './Polyline2d'

/** @public */
export class CubicBezier2d extends Polyline2d {
	a: Vec2d
	b: Vec2d
	c: Vec2d
	d: Vec2d

	constructor(
		config: Omit<Geometry2dOptions, 'isFilled' | 'isClosed'> & {
			start: Vec2d
			cp1: Vec2d
			cp2: Vec2d
			end: Vec2d
		}
	) {
		const { start: a, cp1: b, cp2: c, end: d } = config
		super({ ...config, points: [a, d] })
		this.a = a
		this.b = b
		this.c = c
		this.d = d
	}

	override getVertices() {
		const vertices = [] as Vec2d[]
		const { a, b, c, d } = this
		// we'll always use ten vertices for each bezier curve
		for (let i = 0, n = 10; i <= n; i++) {
			const t = i / n
			vertices.push(
				new Vec2d(
					(1 - t) * (1 - t) * (1 - t) * a.x +
						3 * ((1 - t) * (1 - t)) * t * b.x +
						3 * (1 - t) * (t * t) * c.x +
						t * t * t * d.x,
					(1 - t) * (1 - t) * (1 - t) * a.y +
						3 * ((1 - t) * (1 - t)) * t * b.y +
						3 * (1 - t) * (t * t) * c.y +
						t * t * t * d.y
				)
			)
		}
		return vertices
	}

	midPoint() {
		return getAtT(this, 0.5)
	}

	nearestPoint(A: Vec2d): Vec2d {
		let nearest: Vec2d | undefined
		let dist = Infinity
		for (const edge of this.segments) {
			const p = edge.nearestPoint(A)
			const d = p.dist(A)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}

		if (!nearest) throw Error('nearest point not found')
		return nearest
	}
}

function getAtT(segment: CubicBezier2d, t: number) {
	const { a, b, c, d } = segment
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
