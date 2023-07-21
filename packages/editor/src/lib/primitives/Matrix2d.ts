import { Box2d } from './Box2d'
import { clampRadians, TAU, toDomPrecision } from './utils'
import { Vec2d, VecLike } from './Vec2d'

/** @public */
export type MatLike = Matrix2dModel | Matrix2d

/** @public */
export interface MatrixInfo {
	x: number
	y: number
	scaleX: number
	scaleY: number
	rotation: number
}

/** @public */
export interface Matrix2dModel {
	a: number
	b: number
	c: number
	d: number
	e: number
	f: number
}

// function getIdentity() {
//   return new Matrix2d(1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
// }

/** @public */
export class Matrix2d {
	constructor(a: number, b: number, c: number, d: number, e: number, f: number) {
		this.a = a
		this.b = b
		this.c = c
		this.d = d
		this.e = e
		this.f = f
	}

	a = 1.0
	b = 0.0
	c = 0.0
	d = 1.0
	e = 0.0
	f = 0.0

	equals(m: Matrix2d | Matrix2dModel) {
		return (
			this.a === m.a &&
			this.b === m.b &&
			this.c === m.c &&
			this.d === m.d &&
			this.e === m.e &&
			this.f === m.f
		)
	}

	identity() {
		this.a = 1.0
		this.b = 0.0
		this.c = 0.0
		this.d = 1.0
		this.e = 0.0
		this.f = 0.0
		return this
	}

	multiply(m: Matrix2d | Matrix2dModel) {
		const m2: Matrix2dModel = m
		const { a, b, c, d, e, f } = this
		this.a = a * m2.a + c * m2.b
		this.c = a * m2.c + c * m2.d
		this.e = a * m2.e + c * m2.f + e
		this.b = b * m2.a + d * m2.b
		this.d = b * m2.c + d * m2.d
		this.f = b * m2.e + d * m2.f + f
		return this
	}

	rotate(r: number, cx?: number, cy?: number) {
		if (r === 0) return this
		if (cx === undefined) return this.multiply(Matrix2d.Rotate(r))
		return this.translate(cx, cy!).multiply(Matrix2d.Rotate(r)).translate(-cx, -cy!)
	}

	translate(x: number, y: number): Matrix2d {
		return this.multiply(Matrix2d.Translate(x, y!))
	}

	scale(x: number, y: number) {
		return this.multiply(Matrix2d.Scale(x, y))
	}

	invert() {
		const { a, b, c, d, e, f } = this
		const denom = a * d - b * c
		this.a = d / denom
		this.b = b / -denom
		this.c = c / -denom
		this.d = a / denom
		this.e = (d * e - c * f) / -denom
		this.f = (b * e - a * f) / denom
		return this
	}

	applyToPoint(point: VecLike) {
		return Matrix2d.applyToPoint(this, point)
	}

	applyToPoints(points: VecLike[]) {
		return Matrix2d.applyToPoints(this, points)
	}

	rotation() {
		return Matrix2d.Rotation(this)
	}

	point() {
		return Matrix2d.Point(this)
	}

	decomposed() {
		return Matrix2d.Decompose(this)
	}

	toCssString() {
		return Matrix2d.toCssString(this)
	}

	setTo(model: Matrix2dModel) {
		Object.assign(this, model)
		return this
	}

	decompose() {
		return Matrix2d.Decompose(this)
	}

	clone() {
		return new Matrix2d(this.a, this.b, this.c, this.d, this.e, this.f)
	}

	/* --------------------- Static --------------------- */

	static Identity() {
		return new Matrix2d(1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
	}

	static Translate(x: number, y: number) {
		return new Matrix2d(1.0, 0.0, 0.0, 1.0, x, y)
	}

	static Rotate(r: number, cx?: number, cy?: number) {
		if (r === 0) return Matrix2d.Identity()

		const cosAngle = Math.cos(r)
		const sinAngle = Math.sin(r)

		const rotationMatrix2d = new Matrix2d(cosAngle, sinAngle, -sinAngle, cosAngle, 0.0, 0.0)

		if (cx === undefined) return rotationMatrix2d

		return Matrix2d.Compose(
			Matrix2d.Translate(cx, cy!),
			rotationMatrix2d,
			Matrix2d.Translate(-cx, -cy!)
		)
	}

	static Scale: {
		(x: number, y: number): Matrix2dModel
		(x: number, y: number, cx: number, cy: number): Matrix2dModel
	} = (x: number, y: number, cx?: number, cy?: number) => {
		const scaleMatrix2d = new Matrix2d(x, 0, 0, 0, y, 0)

		if (cx === undefined) return scaleMatrix2d

		return Matrix2d.Compose(
			Matrix2d.Translate(cx, cy!),
			scaleMatrix2d,
			Matrix2d.Translate(-cx, -cy!)
		)
	}

	static Multiply(m1: Matrix2dModel, m2: Matrix2dModel): Matrix2dModel {
		return {
			a: m1.a * m2.a + m1.c * m2.b,
			c: m1.a * m2.c + m1.c * m2.d,
			e: m1.a * m2.e + m1.c * m2.f + m1.e,
			b: m1.b * m2.a + m1.d * m2.b,
			d: m1.b * m2.c + m1.d * m2.d,
			f: m1.b * m2.e + m1.d * m2.f + m1.f,
		}
	}

	static Inverse(m: Matrix2dModel): Matrix2dModel {
		const denom = m.a * m.d - m.b * m.c
		return {
			a: m.d / denom,
			b: m.b / -denom,
			c: m.c / -denom,
			d: m.a / denom,
			e: (m.d * m.e - m.c * m.f) / -denom,
			f: (m.b * m.e - m.a * m.f) / denom,
		}
	}

	static Absolute(m: MatLike): Matrix2dModel {
		const denom = m.a * m.d - m.b * m.c
		return {
			a: m.d / denom,
			b: m.b / -denom,
			c: m.c / -denom,
			d: m.a / denom,
			e: (m.d * m.e - m.c * m.f) / denom,
			f: (m.b * m.e - m.a * m.f) / -denom,
		}
	}

	static Compose(...matrices: MatLike[]) {
		const matrix = Matrix2d.Identity()
		for (let i = 0, n = matrices.length; i < n; i++) {
			matrix.multiply(matrices[i])
		}
		return matrix
	}

	static Point(m: MatLike) {
		return new Vec2d(m.e, m.f)
	}

	static Rotation(m: MatLike): number {
		let rotation

		if (m.a !== 0 || m.c !== 0) {
			const hypotAc = Math.hypot(m.a, m.c)
			rotation = Math.acos(m.a / hypotAc) * (m.c > 0 ? -1 : 1)
		} else if (m.b !== 0 || m.d !== 0) {
			const hypotBd = Math.hypot(m.b, m.d)
			rotation = TAU + Math.acos(m.b / hypotBd) * (m.d > 0 ? -1 : 1)
		} else {
			rotation = 0
		}

		return clampRadians(rotation)
	}

	static Decompose(m: MatLike): MatrixInfo {
		let scaleX, scaleY, rotation

		if (m.a !== 0 || m.c !== 0) {
			const hypotAc = Math.hypot(m.a, m.c)
			scaleX = hypotAc
			scaleY = (m.a * m.d - m.b * m.c) / hypotAc
			rotation = Math.acos(m.a / hypotAc) * (m.c > 0 ? -1 : 1)
		} else if (m.b !== 0 || m.d !== 0) {
			const hypotBd = Math.hypot(m.b, m.d)
			scaleX = (m.a * m.d - m.b * m.c) / hypotBd
			scaleY = hypotBd
			rotation = TAU + Math.acos(m.b / hypotBd) * (m.d > 0 ? -1 : 1)
		} else {
			scaleX = 0
			scaleY = 0
			rotation = 0
		}

		return {
			x: m.e,
			y: m.f,
			scaleX,
			scaleY,
			rotation: clampRadians(rotation),
		}
	}

	static Smooth(m: MatLike, precision = 10000000000) {
		m.a = Math.round(m.a * precision) / precision
		m.b = Math.round(m.b * precision) / precision
		m.c = Math.round(m.c * precision) / precision
		m.d = Math.round(m.d * precision) / precision
		m.e = Math.round(m.e * precision) / precision
		m.f = Math.round(m.f * precision) / precision
		return m
	}

	static toCssString(m: MatLike) {
		return `matrix(${toDomPrecision(m.a)}, ${toDomPrecision(m.b)}, ${toDomPrecision(
			m.c
		)}, ${toDomPrecision(m.d)}, ${toDomPrecision(m.e)}, ${toDomPrecision(m.f)})`
	}

	static applyToPoint(m: MatLike, point: VecLike) {
		return new Vec2d(
			m.a * point.x + m.c * point.y + m.e,
			m.b * point.x + m.d * point.y + m.f,
			point.z
		)
	}

	static applyToXY(m: MatLike, x: number, y: number) {
		return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]
	}

	static applyToPoints(m: MatLike, points: VecLike[]): Vec2d[] {
		return points.map(
			(point) =>
				new Vec2d(m.a * point.x + m.c * point.y + m.e, m.b * point.x + m.d * point.y + m.f, point.z)
		)
	}

	static applyToBounds(m: MatLike, box: Box2d) {
		return new Box2d(m.e + box.minX, m.f + box.minY, box.width, box.height)
	}

	static From(m: MatLike) {
		return new Matrix2d(m.a, m.b, m.c, m.d, m.e, m.f)
	}

	static Cast(m: MatLike) {
		return m instanceof Matrix2d ? m : Matrix2d.From(m)
	}
}

/** @public */
export function decomposeMatrix2d(m: MatLike) {
	return {
		x: m.e,
		y: m.f,
		scaleX: Math.sqrt(m.a * m.a + m.b * m.b),
		scaleY: Math.sqrt(m.c * m.c + m.d * m.d),
		rotation: Math.atan2(m.b, m.a),
	}
}
