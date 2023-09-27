import { PI, PI2, isAngleBetween } from './utils'

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
