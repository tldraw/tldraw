import * as T from '../lib/validation'
import { ValidationError } from '../lib/validation'

describe('§4 Refinement: refine and check', () => {
	it('[RC1] refine transforms the validated value, including to a new type', () => {
		const stringToNumber = T.string.refine((str) => parseInt(str, 10))
		expect(stringToNumber.validate('42')).toBe(42)

		const prefixedString = T.string.refine((str) =>
			str.startsWith('prefix:') ? str : `prefix:${str}`
		)
		expect(prefixedString.validate('test')).toBe('prefix:test')
		expect(prefixedString.validate('prefix:existing')).toBe('prefix:existing')
	})

	it('[RC1] a ValidationError thrown by the refinement propagates with path context', () => {
		const stringToNumber = T.string.refine((str) => {
			const num = parseInt(str, 10)
			if (isNaN(num)) throw new ValidationError('Invalid number format')
			return num
		})

		expect(() => stringToNumber.validate('not-a-number')).toThrow('Invalid number format')

		const nested = T.object({ count: stringToNumber })
		expect(() => nested.validate({ count: 'nope' })).toThrow('At count: Invalid number format')
	})

	it('[RC2] known-good validation skips the refinement when the base reports no change', () => {
		let calls = 0
		const validator = T.arrayOf(T.number).refine((arr) => {
			calls++
			return arr
		})

		const knownGood = validator.validate([1, 2])
		expect(calls).toBe(1)

		expect(validator.validateUsingKnownGoodVersion(knownGood, [1, 2])).toBe(knownGood)
		expect(calls).toBe(1)

		const next = [1, 3]
		expect(validator.validateUsingKnownGoodVersion(knownGood, next)).toBe(next)
		expect(calls).toBe(2)
	})

	it('[RC3] known-good validation accepts a new value Object.is-equal to the previous output without input validation', () => {
		const stringToNumber = T.string.refine((str) => parseInt(str, 10))
		// 42 is not a valid input (not a string), but it equals the previous output.
		expect(stringToNumber.validateUsingKnownGoodVersion(42, 42)).toBe(42)
	})

	it('[RC4] an unnamed check passes the value through and adds no path segment', () => {
		const evenNumber = T.number.check((value) => {
			if (value % 2 !== 0) throw new ValidationError('Expected even number')
		})

		expect(evenNumber.validate(4)).toBe(4)
		expect(evenNumber.validate(0)).toBe(0)

		try {
			evenNumber.validate(3)
			throw new Error('should have thrown')
		} catch (error) {
			expect(error).toBeInstanceOf(ValidationError)
			expect((error as ValidationError).rawMessage).toBe('Expected even number')
			expect((error as ValidationError).path).toEqual([])
		}
	})

	it('[RC5] a named check prefixes failures with a (check name) segment', () => {
		const positive = T.number.check('positive', (value) => {
			if (value <= 0) throw new ValidationError('Must be positive')
		})

		expect(positive.validate(5)).toBe(5)
		expect(() => positive.validate(-1)).toThrow('At (check positive): Must be positive')

		const nested = T.object({ x: positive })
		expect(() => nested.validate({ x: -1 })).toThrow('At x(check positive): Must be positive')
	})
})
