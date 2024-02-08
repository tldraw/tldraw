import { Box } from './Box'
import { Vec } from './Vec'

describe('Box', () => {
	it('Creates a box', () => {
		const mat3 = new Box(0, 0, 100, 100)
		expect(mat3).toMatchObject({
			x: 0,
			y: 0,
			w: 100,
			h: 100,
		})
	})

	it('can have the point set with a Vec', () => {
		const box = new Box(0, 0, 100, 100)

		expect(box).toMatchObject({ x: 0, y: 0 })

		box.point = new Vec(19, 23)

		expect(box).toMatchObject({ x: 19, y: 23 })
	})
})
