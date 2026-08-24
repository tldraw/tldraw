import { Box } from './Box'
import { decomposeMatrix, Mat, MatModel } from './Mat'
import { HALF_PI, PI, PI2 } from './utils'
import { Vec } from './Vec'

describe('Mat', () => {
	it('Creates a matrix', () => {
		const mat3 = new Mat(1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
		expect(mat3).toMatchObject(Mat.Identity())
	})

	it('Multiplies a matrix', () => {
		const m1 = new Mat(1, 2, 3, 4, 5, 6)
		const m2 = new Mat(1, 2, 3, 4, 5, 6)
		expect(m1.multiply(m2)).toMatchObject({
			a: 7,
			b: 10,
			c: 15,
			d: 22,
			e: 28,
			f: 40,
		})
	})

	it('Composes matrices', () => {
		const m1 = new Mat(1, 2, 3, 4, 5, 6)
		const m2 = new Mat(1, 2, 3, 4, 5, 6)
		expect(Mat.Compose(m1, m2)).toMatchObject({
			a: 7,
			b: 10,
			c: 15,
			d: 22,
			e: 28,
			f: 40,
		})
	})

	it('Inverts a matrix', () => {
		const m1 = new Mat(1, 2, 3, 4, 5, 6)
		expect(m1.invert()).toMatchObject({
			a: -2,
			b: 1,
			c: 1.5,
			d: -0.5,
			e: 1,
			f: -2,
		})
	})
})

function expectMatCloseTo(actual: MatModel, expected: MatModel, digits = 10) {
	expect(actual.a).toBeCloseTo(expected.a, digits)
	expect(actual.b).toBeCloseTo(expected.b, digits)
	expect(actual.c).toBeCloseTo(expected.c, digits)
	expect(actual.d).toBeCloseTo(expected.d, digits)
	expect(actual.e).toBeCloseTo(expected.e, digits)
	expect(actual.f).toBeCloseTo(expected.f, digits)
}

describe('Mat equality, cloning and identity', () => {
	it('equals itself, an equal matrix, and an equal plain model', () => {
		const m = new Mat(1, 2, 3, 4, 5, 6)
		expect(m.equals(m)).toBe(true)
		expect(m.equals(new Mat(1, 2, 3, 4, 5, 6))).toBe(true)
		expect(m.equals({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 })).toBe(true)
		expect(m.equals(new Mat(1, 2, 3, 4, 5, 7))).toBe(false)
	})

	it('clones into a separate but equal instance', () => {
		const m = new Mat(1, 2, 3, 4, 5, 6)
		const clone = m.clone()
		expect(clone).not.toBe(m)
		expect(clone.equals(m)).toBe(true)
		clone.a = 99
		expect(m.a).toBe(1)
	})

	it('resets to the identity in place', () => {
		const m = new Mat(1, 2, 3, 4, 5, 6)
		expect(m.identity()).toBe(m)
		expect(m.equals(Mat.Identity())).toBe(true)
	})

	it('copies a model in with setTo', () => {
		const m = Mat.Identity()
		expect(m.setTo({ a: 2, b: 0, c: 0, d: 3, e: 4, f: 5 })).toBe(m)
		expect(m).toMatchObject({ a: 2, b: 0, c: 0, d: 3, e: 4, f: 5 })
	})

	it('From copies and Cast only wraps plain models', () => {
		const model = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }
		const from = Mat.From(model)
		expect(from).toBeInstanceOf(Mat)
		expect(from).toMatchObject(model)

		const m = new Mat(1, 2, 3, 4, 5, 6)
		expect(Mat.Cast(m)).toBe(m)
		const cast = Mat.Cast(model)
		expect(cast).toBeInstanceOf(Mat)
		expect(cast).not.toBe(model)
		expect(cast).toMatchObject(model)
	})
})

describe('Mat.Translate', () => {
	it('builds a translation matrix that offsets points', () => {
		const m = Mat.Translate(10, 20)
		expect(m).toMatchObject({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 })
		expect(m.applyToPoint(new Vec(1, 2))).toMatchObject({ x: 11, y: 22 })
	})

	it('translates in place with the instance method', () => {
		const m = Mat.Identity().translate(5, -5)
		expect(m).toMatchObject({ e: 5, f: -5 })
		expect(m.point()).toMatchObject({ x: 5, y: -5 })
		expect(Mat.Point(m)).toMatchObject({ x: 5, y: -5 })
	})
})

describe('Mat.Rotate', () => {
	it('returns the identity for a zero rotation', () => {
		expect(Mat.Rotate(0).equals(Mat.Identity())).toBe(true)
		const m = Mat.Identity()
		expect(m.rotate(0)).toBe(m)
		expect(m.equals(Mat.Identity())).toBe(true)
	})

	it('rotates a point about the origin', () => {
		const p = Mat.Rotate(HALF_PI).applyToPoint(new Vec(1, 0))
		expect(p.x).toBeCloseTo(0, 10)
		expect(p.y).toBeCloseTo(1, 10)
	})

	it('rotates a point about a center', () => {
		const p = Mat.Rotate(HALF_PI, 10, 10).applyToPoint(new Vec(20, 10))
		expect(p.x).toBeCloseTo(10, 10)
		expect(p.y).toBeCloseTo(20, 10)

		const q = Mat.Identity().rotate(HALF_PI, 10, 10).applyToPoint(new Vec(20, 10))
		expect(q.x).toBeCloseTo(10, 10)
		expect(q.y).toBeCloseTo(20, 10)
	})

	it('leaves the center fixed when rotating about it', () => {
		const p = Mat.Rotate(1.234, 10, 10).applyToPoint(new Vec(10, 10))
		expect(p.x).toBeCloseTo(10, 10)
		expect(p.y).toBeCloseTo(10, 10)
	})
})

describe('Mat.Scale', () => {
	it('scales a point about the origin', () => {
		expect(Mat.Scale(2, 3)).toMatchObject({ a: 2, b: 0, c: 0, d: 3, e: 0, f: 0 })
		expect(Mat.Scale(2, 3).applyToPoint(new Vec(1, 1))).toMatchObject({ x: 2, y: 3 })
		expect(Mat.Identity().scale(2, 3).applyToPoint(new Vec(1, 1))).toMatchObject({ x: 2, y: 3 })
	})

	it('scales a point about a center', () => {
		const m = Mat.Scale(2, 2, 10, 10)
		expect(m.applyToPoint(new Vec(20, 20))).toMatchObject({ x: 30, y: 30 })
		expect(m.applyToPoint(new Vec(10, 10))).toMatchObject({ x: 10, y: 10 })
	})
})

describe('Mat.Multiply and Mat.Compose', () => {
	it('multiplies plain models without mutating them', () => {
		const m1 = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }
		const m2 = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }
		expect(Mat.Multiply(m1, m2)).toEqual({ a: 7, b: 10, c: 15, d: 22, e: 28, f: 40 })
		expect(m1).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 })
	})

	it('returns the identity when composing nothing', () => {
		expect(Mat.Compose().equals(Mat.Identity())).toBe(true)
	})

	it('applies composed matrices right to left', () => {
		const m = Mat.Compose(Mat.Translate(10, 0), Mat.Scale(2, 2))
		expect(m.applyToPoint(new Vec(1, 1))).toMatchObject({ x: 12, y: 2 })

		const reversed = Mat.Compose(Mat.Scale(2, 2), Mat.Translate(10, 0))
		expect(reversed.applyToPoint(new Vec(1, 1))).toMatchObject({ x: 22, y: 2 })
	})
})

describe('Mat.Inverse', () => {
	it('inverts a plain model without mutating it', () => {
		const m = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }
		expect(Mat.Inverse(m)).toEqual({ a: -2, b: 1, c: 1.5, d: -0.5, e: 1, f: -2 })
		expect(m).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 })
	})

	it('inverts a translation into the opposite translation', () => {
		expectMatCloseTo(Mat.Inverse(Mat.Translate(10, 20)), Mat.Translate(-10, -20))
		expectMatCloseTo(Mat.Translate(10, 20).invert(), Mat.Translate(-10, -20))
	})

	it('inverts a rotation into the opposite rotation', () => {
		expectMatCloseTo(Mat.Inverse(Mat.Rotate(PI / 3)), Mat.Rotate(-PI / 3))
	})

	it('composes with its inverse to the identity', () => {
		const m = Mat.Compose(Mat.Translate(10, 20), Mat.Rotate(0.7), Mat.Scale(2, 3))
		expectMatCloseTo(Mat.Compose(m, Mat.Inverse(m)), Mat.Identity())
		expectMatCloseTo(Mat.Compose(Mat.Inverse(m), m), Mat.Identity())
	})
})

describe('Mat.Absolute', () => {
	it('inverts the linear part but keeps the translation sign of the inverse flipped', () => {
		expect(Mat.Absolute({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 })).toEqual({
			a: -2,
			b: 1,
			c: 1.5,
			d: -0.5,
			e: -1,
			f: 2,
		})
	})
})

describe('Mat.Rotation and Mat.Decompose', () => {
	it('reads the rotation back from a rotation matrix', () => {
		expect(Mat.Rotation(Mat.Identity())).toBe(0)
		expect(Mat.Rotation(Mat.Rotate(PI / 4))).toBeCloseTo(PI / 4, 10)
		expect(Mat.Rotate(PI / 4).rotation()).toBeCloseTo(PI / 4, 10)
		expect(Mat.Rotation(Mat.Rotate(-PI / 4))).toBeCloseTo(PI2 - PI / 4, 10)
	})

	it('falls back to the b and d terms when a and c are zero', () => {
		expect(Mat.Rotation(new Mat(0, 1, 0, 0, 0, 0))).toBeCloseTo(HALF_PI, 10)
		expect(Mat.Rotation(new Mat(0, 0, 0, 0, 0, 0))).toBe(0)
	})

	it('decomposes a translate-scale matrix', () => {
		const m = Mat.Compose(Mat.Translate(10, 20), Mat.Scale(2, 3))
		expect(m).toMatchObject({ a: 2, b: 0, c: 0, d: 3, e: 10, f: 20 })
		expect(Mat.Decompose(m)).toEqual({ x: 10, y: 20, scaleX: 2, scaleY: 3, rotation: 0 })
		expect(m.decompose()).toEqual(Mat.Decompose(m))
		expect(m.decomposed()).toEqual(Mat.Decompose(m))
	})

	it('decomposes a rotation with unit scale', () => {
		const d = Mat.Decompose(Mat.Rotate(HALF_PI))
		expect(d.scaleX).toBeCloseTo(1, 10)
		expect(d.scaleY).toBeCloseTo(1, 10)
		expect(d.rotation).toBeCloseTo(HALF_PI, 10)

		expect(Mat.Decompose(Mat.Rotate(-HALF_PI)).rotation).toBeCloseTo(PI2 - HALF_PI, 10)
	})

	it('decomposes degenerate matrices without throwing', () => {
		expect(Mat.Decompose(new Mat(0, 2, 0, 0, 5, 6))).toEqual({
			x: 5,
			y: 6,
			scaleX: 0,
			scaleY: 2,
			rotation: HALF_PI,
		})
		expect(Mat.Decompose(new Mat(0, 0, 0, 0, 5, 6))).toEqual({
			x: 5,
			y: 6,
			scaleX: 0,
			scaleY: 0,
			rotation: 0,
		})
	})
})

describe('decomposeMatrix', () => {
	it('recovers translation, non-uniform scale and rotation', () => {
		const m = Mat.Compose(Mat.Translate(10, 20), Mat.Rotate(PI / 4), Mat.Scale(2, 3))
		const d = decomposeMatrix(m)
		expect(d.x).toBe(10)
		expect(d.y).toBe(20)
		expect(d.scaleX).toBeCloseTo(2, 10)
		expect(d.scaleY).toBeCloseTo(3, 10)
		expect(d.rotation).toBeCloseTo(PI / 4, 10)
	})

	it('returns a signed rotation rather than a clamped one', () => {
		expect(decomposeMatrix(Mat.Rotate(-PI / 4)).rotation).toBeCloseTo(-PI / 4, 10)
	})
})

describe('Mat.Smooth', () => {
	it('rounds every term in place to the default precision', () => {
		const m = new Mat(1 / 3, 2 / 3, 0, 1, 0, 0)
		expect(Mat.Smooth(m)).toBe(m)
		expect(m.a).toBe(0.3333333333)
		expect(m.b).toBe(0.6666666667)
	})

	it('rounds to a custom precision', () => {
		const m = { a: 0.123456, b: 0.987654, c: 1.5, d: 2.25, e: 10.111, f: 20.999 }
		expect(Mat.Smooth(m, 100)).toEqual({ a: 0.12, b: 0.99, c: 1.5, d: 2.25, e: 10.11, f: 21 })
	})

	it('cleans floating point noise from a rotation', () => {
		expect(Mat.Smooth(Mat.Rotate(HALF_PI))).toMatchObject({ a: 0, b: 1, c: -1, d: 0 })
	})
})

describe('Mat.toCssString', () => {
	it('formats the matrix for CSS at DOM precision', () => {
		expect(Mat.toCssString(Mat.Translate(10.123456, 20))).toBe('matrix(1, 0, 0, 1, 10.1235, 20)')
		expect(new Mat(1, 2, 3, 4, 5, 6).toCssString()).toBe('matrix(1, 2, 3, 4, 5, 6)')
	})
})

describe('Mat apply helpers', () => {
	const m = Mat.Compose(Mat.Translate(10, 20), Mat.Scale(2, 2))

	it('applies to a point, preserving z or defaulting it to 1', () => {
		expect(m.applyToPoint(new Vec(1, 2, 0.5))).toEqual(new Vec(12, 24, 0.5))
		expect(Mat.applyToPoint(m, { x: 1, y: 2 })).toEqual(new Vec(12, 24, 1))
	})

	it('applies to many points', () => {
		const points = [new Vec(0, 0, 0.1), new Vec(1, 1, 0.2)]
		expect(m.applyToPoints(points)).toEqual([new Vec(10, 20, 0.1), new Vec(12, 22, 0.2)])
		expect(Mat.applyToPoints(m, points)).toEqual([new Vec(10, 20, 0.1), new Vec(12, 22, 0.2)])
	})

	it('applies to raw coordinates', () => {
		expect(Mat.applyToXY(m, 1, 2)).toEqual([12, 24])
	})

	// Locks in current behaviour, see #10557.
	it('applies only the translation component to a box', () => {
		const box = new Box(5, 5, 100, 50)
		expect(Mat.applyToBounds(Mat.Translate(10, 20), box)).toEqual(new Box(15, 25, 100, 50))
		expect(Mat.applyToBounds(m, box)).toEqual(new Box(15, 25, 100, 50))
	})
})
