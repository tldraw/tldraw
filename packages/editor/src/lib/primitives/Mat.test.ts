import { Mat } from './Mat'

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
