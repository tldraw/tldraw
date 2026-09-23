import { Box } from '../../primitives/Box'
import { Mat } from '../../primitives/Mat'
import { Vec } from '../../primitives/Vec'
import {
	getFiniteScale,
	getLocalScale,
	getMirroredRotation,
	getPagePointForCenter,
	isMirroredInOneAxis,
	lockScaleToLargerAxis,
	lockScaleToSmallerAxis,
	scalePagePoint,
} from './resize'

const HALF_PI = Math.PI / 2

describe('getFiniteScale', () => {
	it('passes finite scales through', () => {
		const scale = { x: 2, y: 3 }
		expect(getFiniteScale(scale)).toBe(scale)
	})

	it.each([
		[
			{ x: Infinity, y: 3 },
			{ x: 1, y: 3 },
		],
		[
			{ x: 2, y: NaN },
			{ x: 2, y: 1 },
		],
		[
			{ x: NaN, y: Infinity },
			{ x: 1, y: 1 },
		],
	])('replaces a non-finite axis with 1', (scale, expected) => {
		expect(getFiniteScale(scale)).toMatchObject(expected)
	})
})

describe('lockScaleToLargerAxis', () => {
	it('takes the magnitude of the larger axis, keeping each sign', () => {
		expect(lockScaleToLargerAxis({ x: 3, y: -1 })).toMatchObject({ x: 3, y: -3 })
		expect(lockScaleToLargerAxis({ x: -1, y: 4 })).toMatchObject({ x: -4, y: 4 })
	})
})

describe('lockScaleToSmallerAxis', () => {
	it('takes the magnitude of the smaller axis, keeping each sign', () => {
		expect(lockScaleToSmallerAxis({ x: 3, y: -1 })).toMatchObject({ x: 1, y: -1 })
		expect(lockScaleToSmallerAxis({ x: -1, y: 4 })).toMatchObject({ x: -1, y: 1 })
	})

	it('never grows an axis, unlike locking to the larger one', () => {
		const scale = { x: 5, y: 2 }
		expect(lockScaleToSmallerAxis(scale)).toMatchObject({ x: 2, y: 2 })
		expect(lockScaleToLargerAxis(scale)).toMatchObject({ x: 5, y: 5 })
	})
})

describe('scalePagePoint', () => {
	it('leaves the scale origin fixed', () => {
		const origin = { x: 100, y: 100 }
		expect(scalePagePoint(origin, origin, { x: 3, y: 7 }, 0)).toMatchObject(origin)
	})

	it('scales about the origin on an unrotated axis', () => {
		expect(scalePagePoint({ x: 10, y: 20 }, { x: 0, y: 0 }, { x: 2, y: 3 }, 0)).toMatchObject({
			x: 20,
			y: 60,
		})
	})

	it('scales along the rotated axis, not the page axes', () => {
		// With the scale axis at 90deg, scaling x by 2 stretches the point away from the origin
		// vertically in page space.
		const result = scalePagePoint({ x: 0, y: 10 }, { x: 0, y: 0 }, { x: 2, y: 1 }, HALF_PI)
		expect(result.x).toBeCloseTo(0)
		expect(result.y).toBeCloseTo(20)
	})

	it('mirrors across the origin for a negative scale', () => {
		expect(scalePagePoint({ x: 10, y: 20 }, { x: 0, y: 0 }, { x: -1, y: 1 }, 0)).toMatchObject({
			x: -10,
			y: 20,
		})
	})
})

describe('getLocalScale', () => {
	it('passes the scale through when the shape is aligned with the scale axis', () => {
		expect(getLocalScale({ x: 2, y: 3 }, 0, 0)).toMatchObject({ x: 2, y: 3 })
		expect(getLocalScale({ x: 2, y: 3 }, Math.PI, 0)).toMatchObject({ x: 2, y: 3 })
	})

	it('swaps the axes when the shape is 90deg off the scale axis', () => {
		expect(getLocalScale({ x: 2, y: 3 }, HALF_PI, 0)).toMatchObject({ x: 3, y: 2 })
		expect(getLocalScale({ x: 2, y: 3 }, 0, HALF_PI)).toMatchObject({ x: 3, y: 2 })
	})
})

describe('isMirroredInOneAxis', () => {
	it.each([
		[{ x: -1, y: 1 }, true],
		[{ x: 1, y: -1 }, true],
		[{ x: -1, y: -1 }, false],
		[{ x: 1, y: 1 }, false],
	])('%o', (scale, expected) => {
		expect(isMirroredInOneAxis(scale)).toBe(expected)
	})
})

describe('getMirroredRotation', () => {
	it('negates the page rotation', () => {
		const parentRotation = 0.3
		const localRotation = 0.5
		const newLocal = getMirroredRotation(localRotation, parentRotation)
		expect(parentRotation + newLocal).toBeCloseTo(-(parentRotation + localRotation))
	})

	it('negates the local rotation when the parent is unrotated', () => {
		expect(getMirroredRotation(0.5, 0)).toBeCloseTo(-0.5)
	})
})

describe('getPagePointForCenter', () => {
	it('returns the transform origin when the center is already correct', () => {
		const pageTransform = Mat.Translate(50, 60)
		const localBounds = new Box(0, 0, 100, 100)
		expect(getPagePointForCenter(pageTransform, localBounds, { x: 100, y: 110 })).toMatchObject({
			x: 50,
			y: 60,
		})
	})

	it('offsets the transform origin by the distance to the target center', () => {
		const pageTransform = Mat.Translate(50, 60)
		const localBounds = new Box(0, 0, 100, 100)
		expect(getPagePointForCenter(pageTransform, localBounds, { x: 110, y: 90 })).toMatchObject({
			x: 60,
			y: 40,
		})
	})

	it('measures from the rotated local center, not the axis-aligned page bounds center', () => {
		// A rotated shape's axis-aligned page bounds center and its transformed local center differ;
		// using the page bounds center here would drift as the rotation changed.
		const pageTransform = Mat.Compose(Mat.Translate(0, 0), Mat.Rotate(HALF_PI))
		const localBounds = new Box(0, 0, 100, 50)
		const currentCenter = Mat.applyToPoint(pageTransform, localBounds.center)
		const target = Vec.Add(currentCenter, new Vec(7, -4))
		expect(getPagePointForCenter(pageTransform, localBounds, target)).toMatchObject({
			x: 7,
			y: -4,
		})
	})
})
