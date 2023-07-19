import { Vec2d } from '../Vec2d'
import { Polyline2d } from './Polyline2d'

/** @public */
export class CubicBezier2d extends Polyline2d {
	a: Vec2d
	b: Vec2d
	c: Vec2d
	d: Vec2d

	constructor(config: { margin: number; start: Vec2d; cp1: Vec2d; cp2: Vec2d; end: Vec2d }) {
		const { margin, start: a, cp1: b, cp2: c, end: d } = config
		super({ margin, points: [a, d] })
		this.a = a
		this.b = b
		this.c = c
		this.d = d
	}

	override getVertices() {
		const vertices = [] as Vec2d[]
		const { a, b, c, d } = this
		for (let i = 0, n = 10; i < n; i++) {
			const t = i / n
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
		}
		return vertices
	}

	midPoint() {
		return new Vec2d(
			(1 / 3) * this.a.x + (2 / 3) * this.b.x,
			(1 / 3) * this.a.y + (2 / 3) * this.b.y
		)
	}

	nearestPoint(A: Vec2d): Vec2d {
		let nearest: Vec2d
		let dist = Infinity
		for (const edge of this.segments) {
			const p = edge.nearestPoint(A)
			const d = p.dist(A)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}
		return nearest!
	}
}
