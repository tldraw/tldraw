import * as T from '../lib/validation'

describe('§7 Numbers', () => {
	it('[N1] number accepts finite numbers and rejects everything else with specific messages', () => {
		expect(T.number.validate(42)).toBe(42)
		expect(T.number.validate(-3.14)).toBe(-3.14)
		expect(T.number.validate(0)).toBe(0)

		expect(() => T.number.validate('42')).toThrow('Expected number, got a string')
		expect(() => T.number.validate(NaN)).toThrow('Expected a number, got NaN')
		expect(() => T.number.validate(Infinity)).toThrow('Expected a finite number, got Infinity')
		expect(() => T.number.validate(-Infinity)).toThrow('Expected a finite number, got -Infinity')
	})

	it('[N2] positiveNumber accepts zero and positive finite numbers', () => {
		expect(T.positiveNumber.validate(29.99)).toBe(29.99)
		expect(T.positiveNumber.validate(0)).toBe(0)

		expect(() => T.positiveNumber.validate(-1)).toThrow('Expected a positive number, got -1')
		expect(() => T.positiveNumber.validate(-Infinity)).toThrow(
			'Expected a positive number, got -Infinity'
		)
		expect(() => T.positiveNumber.validate(Infinity)).toThrow(
			'Expected a finite number, got Infinity'
		)
		expect(() => T.positiveNumber.validate(NaN)).toThrow('Expected a number, got NaN')
		expect(() => T.positiveNumber.validate('1')).toThrow('Expected number, got a string')
	})

	it('[N3] nonZeroNumber accepts only positive finite numbers', () => {
		expect(T.nonZeroNumber.validate(0.01)).toBe(0.01)

		expect(() => T.nonZeroNumber.validate(0)).toThrow('Expected a non-zero positive number, got 0')
		expect(() => T.nonZeroNumber.validate(-5)).toThrow(
			'Expected a non-zero positive number, got -5'
		)
		expect(() => T.nonZeroNumber.validate(-Infinity)).toThrow(
			'Expected a non-zero positive number, got -Infinity'
		)
	})

	it('[N4] nonZeroFiniteNumber accepts non-zero finite numbers including negatives', () => {
		expect(T.nonZeroFiniteNumber.validate(-1.5)).toBe(-1.5)
		expect(T.nonZeroFiniteNumber.validate(2)).toBe(2)

		expect(() => T.nonZeroFiniteNumber.validate(0)).toThrow('Expected a non-zero number, got 0')
		expect(() => T.nonZeroFiniteNumber.validate(Infinity)).toThrow(
			'Expected a finite number, got Infinity'
		)
	})

	it('[N5] unitInterval accepts finite numbers in [0, 1]', () => {
		expect(T.unitInterval.validate(0)).toBe(0)
		expect(T.unitInterval.validate(0.5)).toBe(0.5)
		expect(T.unitInterval.validate(1)).toBe(1)

		expect(() => T.unitInterval.validate(1.5)).toThrow('Expected a number between 0 and 1, got 1.5')
		expect(() => T.unitInterval.validate(-0.1)).toThrow(
			'Expected a number between 0 and 1, got -0.1'
		)
		expect(() => T.unitInterval.validate(Infinity)).toThrow(
			'Expected a number between 0 and 1, got Infinity'
		)
		expect(() => T.unitInterval.validate(NaN)).toThrow('Expected a number, got NaN')
	})

	it('[N6] integer accepts whole finite numbers including negatives', () => {
		expect(T.integer.validate(42)).toBe(42)
		expect(T.integer.validate(-5)).toBe(-5)
		expect(T.integer.validate(0)).toBe(0)

		expect(() => T.integer.validate(3.14)).toThrow('Expected an integer, got 3.14')
		expect(() => T.integer.validate(NaN)).toThrow('Expected a number, got NaN')
		expect(() => T.integer.validate(Infinity)).toThrow('Expected a finite number, got Infinity')
		expect(() => T.integer.validate('1')).toThrow('Expected number, got a string')
	})

	it('[N7] positiveInteger accepts zero and positive integers', () => {
		expect(T.positiveInteger.validate(5)).toBe(5)
		expect(T.positiveInteger.validate(0)).toBe(0)

		expect(() => T.positiveInteger.validate(-1)).toThrow('Expected a positive integer, got -1')
		expect(() => T.positiveInteger.validate(3.14)).toThrow('Expected an integer, got 3.14')
	})

	it('[N7] positiveInteger reports any negative number as not a positive integer, even fractions', () => {
		expect(() => T.positiveInteger.validate(-1.5)).toThrow('Expected a positive integer, got -1.5')
	})

	it('[N8] nonZeroInteger accepts only positive integers', () => {
		expect(T.nonZeroInteger.validate(1)).toBe(1)

		expect(() => T.nonZeroInteger.validate(0)).toThrow(
			'Expected a non-zero positive integer, got 0'
		)
		expect(() => T.nonZeroInteger.validate(-5)).toThrow(
			'Expected a non-zero positive integer, got -5'
		)
		expect(() => T.nonZeroInteger.validate(0.5)).toThrow('Expected an integer, got 0.5')
		expect(() => T.nonZeroInteger.validate(-0.5)).toThrow(
			'Expected a non-zero positive integer, got -0.5'
		)
	})

	it('[N9] negative zero counts as zero and as a non-negative integer', () => {
		expect(T.number.validate(-0)).toBe(-0)
		expect(T.integer.validate(-0)).toBe(-0)
		expect(T.positiveNumber.validate(-0)).toBe(-0)
		expect(T.positiveInteger.validate(-0)).toBe(-0)

		expect(() => T.nonZeroNumber.validate(-0)).toThrow('Expected a non-zero positive number, got 0')
		expect(() => T.nonZeroFiniteNumber.validate(-0)).toThrow('Expected a non-zero number, got 0')
	})
})
