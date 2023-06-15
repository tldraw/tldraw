import { CubicSegment2d } from './CubicSegment2d'

describe(`Cubic bezier`, () => {
	describe(`from constructor`, () => {
		const b = new CubicSegment2d({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 })

		// it(`serializes correctly`, () => {
		//   expect(b.toString()).toEqual('[0/0, 0/1, 1/1, 1/0]')
		// })

		it(`has the correct approximate length`, () => {
			expect(b.length).toBeCloseTo(2, 2)
		})

		// it(`has the expected derivative points`, () => {
		//   expect(b.points).toEqual([
		//     [
		//       { x: 0, y: 3 },
		//       { x: 3, y: 0 },
		//       { x: 0, y: -3 },
		//     ],
		//     [
		//       { x: 6, y: -6 },
		//       { x: -6, y: -6 },
		//     ],
		//     [{ x: -12, y: 0 }],
		//   ])
		//   expect(b.derivative(0)).toEqual({ t: 0, x: 0, y: 3 })
		//   expect(b.derivative(0.5)).toEqual({ t: 0.5, x: 1.5, y: 0 })
		//   expect(b.derivative(1)).toEqual({ t: 1, x: 0, y: -3 })
		// })

		it(`has the expected normals`, () => {
			expect(b.getNormal(0)).toMatchObject({ x: -1, y: 0 })
			expect(b.getNormal(0.5)).toMatchObject({ x: -0, y: 1 })
			expect(b.getNormal(1)).toMatchObject({ x: 1, y: 0 })
		})

		// it(`has the correct inflection point`, () => {
		//   expect(b.inflections()).toEqual([])
		// })

		it(`has the correct axis-aligned bounding box`, () => {
			expect(b.bounds.toJson()).toMatchObject({
				x: 0,
				y: 0,
				w: 1,
			})
			expect(b.bounds.height).toBeCloseTo(0.75)
		})
	})
})
