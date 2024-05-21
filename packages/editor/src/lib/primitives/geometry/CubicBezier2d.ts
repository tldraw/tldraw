import { Vec } from '../Vec'
import { Geometry2dOptions } from './Geometry2d'
import { Polyline2d } from './Polyline2d'

/** @public */
export class CubicBezier2d extends Polyline2d {
	a: Vec
	b: Vec
	c: Vec
	d: Vec

	constructor(
		config: Omit<Geometry2dOptions, 'isFilled' | 'isClosed'> & {
			start: Vec
			cp1: Vec
			cp2: Vec
			end: Vec
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
		const vertices = [] as Vec[]
		const { a, b, c, d } = this
		// we'll always use ten vertices for each bezier curve
		for (let i = 0, n = 10; i <= n; i++) {
			const t = i / n
			vertices.push(
				new Vec(
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
		return CubicBezier2d.GetAtT(this, 0.5)
	}

	nearestPoint(A: Vec): Vec {
		let nearest: Vec | undefined
		let dist = Infinity
		let d: number
		let p: Vec
		for (const edge of this.segments) {
			p = edge.nearestPoint(A)
			d = Vec.Dist2(p, A)
			if (d < dist) {
				nearest = p
				dist = d
			}
		}

		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	static GetAtT(segment: CubicBezier2d, t: number) {
		const { a, b, c, d } = segment
		return new Vec(
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

	static GetLength(segment: CubicBezier2d, precision = 100) {
		let n1: Vec,
			p1 = segment.a
		for (let i = 1; i <= precision; i++) {
			n1 = CubicBezier2d.GetAtT(segment, i / precision)
			length += Vec.Dist2(p1, n1)
			p1 = n1
		}
		return Math.sqrt(length) * 2
	}

	static GetSvgPath(segment: CubicBezier2d) {
		const { a, b, c, d } = segment
		return `M${a.x},${a.y} C${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`
	}
}
