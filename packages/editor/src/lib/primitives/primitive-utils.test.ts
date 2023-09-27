import { PI, PI2, angleDelta, angleDifferenceSign, isAngleBetween, shortAngleDist } from './utils'

describe('isAngleBetween', () => {
	it('works', () => {
		expect(isAngleBetween(PI2 * 0.1, PI2 * 0.9, PI2 * 0.5)).toBe(true)
	})

	it('works with regular sweeps', () => {
		// is 12:00 between 12:00 and 12:00
		expect(isAngleBetween(0, 0, 0)).toBe(false)

		// is 6:00 between 12:00 and 6:00
		expect(isAngleBetween(0, PI, PI)).toBe(false)

		// is 3:00 between 12:00 and 6:00
		expect(isAngleBetween(0, PI, PI / 2)).toBe(true)

		// is 6:00 between 3:00 and 9:00
		expect(isAngleBetween(PI / 2, PI * 1.5, PI)).toBe(true)

		// is 6:00 between 3:00 and 9:00
		expect(isAngleBetween(PI / 2, PI * 1.5, PI)).toBe(true)
	})

	it('works with normalized sweeps', () => {
		// is 12:00 between 6:00 and 6:00
		expect(isAngleBetween(-PI, PI, 0)).toBe(false)

		// is 3:00 between 12:00 and 6:00
		expect(isAngleBetween(-PI2, PI, PI * 0.5)).toBe(true)

		// is 3:00 between 12:00 and 6:00
		expect(isAngleBetween(PI * 100, PI * 102, PI * 99.9)).toBe(false)
		expect(isAngleBetween(PI * 100, PI * 102, PI * 100)).toBe(false)
		expect(isAngleBetween(PI * 100, PI * 102, PI * 101)).toBe(true)
		expect(isAngleBetween(PI * 100, PI * 102, PI * 102)).toBe(true)
		expect(isAngleBetween(PI * 100, PI * 102, PI * 102.1)).toBe(false)
	})
})

describe('angle delta', () => {
	// angle delta is really simple, just b - a
	it('works', () => {
		expect(angleDelta(0, 0)).toBe(0)
		expect(angleDelta(0, 1)).toBe(1)
		expect(angleDelta(1, 0)).toBe(-1)
		expect(angleDelta(PI, 0)).toBe(-PI)
		expect(angleDelta(-PI, 0)).toBe(PI)
		expect(angleDelta(0, -PI)).toBe(-PI)
		expect(angleDelta(0, PI)).toBe(PI)
		expect(angleDelta(0, PI * 1.5)).toBe(PI * 1.5)
	})
})

describe('short angle distance', () => {
	// this is probably what we expect—the absolute distance between two angles
	it('works', () => {
		expect(shortAngleDist(0, 0)).toBe(0)
		expect(shortAngleDist(0, 1)).toBe(1)
		expect(shortAngleDist(1, 0)).toBe(1)
		expect(shortAngleDist(PI, 0)).toBe(PI)
		expect(shortAngleDist(-PI, 0)).toBe(PI)
		expect(shortAngleDist(0, -PI)).toBe(PI)
		expect(shortAngleDist(0, PI)).toBe(PI)
		expect(shortAngleDist(0, PI * 1.5)).toBe(PI * 0.5)
	})
})

describe('angle difference sign', () => {
	// this is probably what we expect—the absolute distance between two angles
	it('works', () => {
		expect(angleDifferenceSign(0, 0)).toBe(-1)
		expect(angleDifferenceSign(0, PI * 0.25)).toBe(1)
		expect(angleDifferenceSign(0, PI * 0.5)).toBe(1)
		expect(angleDifferenceSign(0, PI * 0.75)).toBe(1)
		expect(angleDifferenceSign(0, PI)).toBe(-1)
		expect(angleDifferenceSign(0, PI * 1.25)).toBe(-1)
		expect(angleDifferenceSign(0, PI * 1.5)).toBe(-1)
		expect(angleDifferenceSign(0, PI * 1.75)).toBe(-1)
		expect(angleDifferenceSign(0, PI * 2)).toBe(-1)

		expect(angleDifferenceSign(PI * 2, 0)).toBe(-1)
		expect(angleDifferenceSign(PI * 2, PI * 0.25)).toBe(1)
		expect(angleDifferenceSign(PI * 2, PI * 0.5)).toBe(1)
		expect(angleDifferenceSign(PI * 2, PI * 0.75)).toBe(1)
		expect(angleDifferenceSign(PI * 2, PI)).toBe(-1)
		expect(angleDifferenceSign(PI * 2, PI * 1.25)).toBe(-1)
		expect(angleDifferenceSign(PI * 2, PI * 1.5)).toBe(-1)
		expect(angleDifferenceSign(PI * 2, PI * 1.75)).toBe(-1)
		expect(angleDifferenceSign(PI * 2, PI * 2)).toBe(-1)

		expect(angleDifferenceSign(PI, 0)).toBe(-1)
		expect(angleDifferenceSign(PI, PI * 0.25)).toBe(-1)
		expect(angleDifferenceSign(PI, PI * 0.5)).toBe(-1)
		expect(angleDifferenceSign(PI, PI * 0.75)).toBe(-1)
		expect(angleDifferenceSign(PI, PI)).toBe(-1)
		expect(angleDifferenceSign(PI, PI * 1.25)).toBe(1)
		expect(angleDifferenceSign(PI, PI * 1.5)).toBe(1)
		expect(angleDifferenceSign(PI, PI * 1.75)).toBe(1)
		expect(angleDifferenceSign(PI, PI * 2)).toBe(-1)

		expect(angleDifferenceSign(-PI, 0)).toBe(-1)
		expect(angleDifferenceSign(-PI, PI * 0.25)).toBe(-1)
		expect(angleDifferenceSign(-PI, PI * 0.5)).toBe(-1)
		expect(angleDifferenceSign(-PI, PI * 0.75)).toBe(-1)
		expect(angleDifferenceSign(-PI, PI)).toBe(-1)
		expect(angleDifferenceSign(-PI, PI * 1.25)).toBe(1)
		expect(angleDifferenceSign(-PI, PI * 1.5)).toBe(1)
		expect(angleDifferenceSign(-PI, PI * 1.75)).toBe(1)
		expect(angleDifferenceSign(-PI, PI * 2)).toBe(-1)

		expect(angleDifferenceSign(PI * 3, 0)).toBe(-1)
		expect(angleDifferenceSign(PI * 3, PI * 0.25)).toBe(-1)
		expect(angleDifferenceSign(PI * 3, PI * 0.5)).toBe(-1)
		expect(angleDifferenceSign(PI * 3, PI * 0.75)).toBe(-1)
		expect(angleDifferenceSign(PI * 3, PI)).toBe(-1)
		expect(angleDifferenceSign(PI * 3, PI * 1.25)).toBe(1)
		expect(angleDifferenceSign(PI * 3, PI * 1.5)).toBe(1)
		expect(angleDifferenceSign(PI * 3, PI * 1.75)).toBe(1)
		expect(angleDifferenceSign(PI * 3, PI * 2)).toBe(-1)
	})
})
