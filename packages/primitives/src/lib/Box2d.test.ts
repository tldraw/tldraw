import { Box2d } from './Box2d'
import { Vec2d } from './Vec2d'

describe('Box2d', () => {
	it('Creates a box', () => {
		const mat3 = new Box2d(0, 0, 100, 100)
		expect(mat3).toMatchObject({
			x: 0,
			y: 0,
			w: 100,
			h: 100,
		})
	})

	it('can have the point set with a vec2d', () => {
		const box = new Box2d(0, 0, 100, 100)

		expect(box).toMatchObject({ x: 0, y: 0 })

		box.point = new Vec2d(19, 23)

		expect(box).toMatchObject({ x: 19, y: 23 })
	})
})
