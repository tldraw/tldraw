import { Vec2d } from '../Vec2d'
import { Circle2d } from './Circle2d'

describe('Circle2d.bounds', () => {
	it('calculates the bounds', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).bounds
		).toMatchObject({
			x: 0,
			y: 0,
			w: 20,
			h: 20,
		})
	})

	it('ignores margin on bounds', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).bounds
		).toMatchObject({
			x: 0,
			y: 0,
			w: 20,
			h: 20,
		})
	})

	it('calculates the bounds when offset', () => {
		expect(
			new Circle2d({
				x: 5,
				y: 5,
				radius: 10,
				isFilled: false,
			}).bounds
		).toMatchObject({
			x: 5,
			y: 5,
			w: 20,
			h: 20,
		})
	})
})

describe('Circle2d.isPointInBounds', () => {
	it('recognizes a miss', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).isPointInBounds(new Vec2d(-2, -2))
		).toBe(false)
	})

	it('recognizes a hit', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).isPointInBounds(new Vec2d(5, 5))
		).toBe(true)
	})

	it('recognizes a hit with margin', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).isPointInBounds(new Vec2d(-2, -2), 2)
		).toBe(true)
	})
})

describe('Circle2d.getDistanceToPoint', () => {
	it('returns a positive distance when hit ', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).distanceToPoint(new Vec2d(10, -2))
		).toBe(2)
	})

	it('returns a positive distance whenhit inside when empty', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).distanceToPoint(new Vec2d(10, 2))
		).toBe(2)
	})

	it('returns a negative distance when hit inside when filled', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: true,
			}).distanceToPoint(new Vec2d(10, 2))
		).toBe(-2)
	})
})

describe('Circle2d.hitTestPoint', () => {
	it('recognizes a miss outside', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).hitTestPoint(new Vec2d(10, -2), 0)
		).toBe(false)
	})

	it('recognizes a miss inside', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).hitTestPoint(new Vec2d(10, 2), 0)
		).toBe(false)
	})

	it('recognizes a hit inside when filled', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: true,
			}).hitTestPoint(new Vec2d(10, 2), 0)
		).toBe(true)
	})

	// with margin

	it('recognizes a hit with margin miss outside', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).hitTestPoint(new Vec2d(10, -2), 2)
		).toBe(true)
	})

	it('recognizes a hit inside with margin', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).hitTestPoint(new Vec2d(10, 2), 2)
		).toBe(true)
	})

	it('recognizes a hit inside when filled', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: true,
			}).hitTestPoint(new Vec2d(10, 2), 2)
		).toBe(true)
	})
})

describe('Circle2d.nearestPoint', () => {
	it('finds the correct nearest point', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).nearestPoint(new Vec2d(10, -2))
		).toMatchObject(new Vec2d(10, 0))

		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).nearestPoint(new Vec2d(10, 2))
		).toMatchObject(new Vec2d(10, 0))

		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).nearestPoint(new Vec2d(10, 30))
		).toMatchObject(new Vec2d(10, 20))
	})
})

describe('Circle2d.hitTestLineSegment', () => {
	it('recognizes a miss', () => {
		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).hitTestLineSegment(new Vec2d(0, -2), new Vec2d(20, -2), 1)
		).toBe(false)

		expect(
			new Circle2d({
				radius: 10,
				isFilled: false,
			}).hitTestLineSegment(new Vec2d(0, 2), new Vec2d(20, 2), 1)
		).toBe(true)
	})
})
