import * as T from '../lib/validation'
import { ValidationError } from '../lib/validation'

/** An item validator with a counting validate and a known-good implementation. */
function countingItemValidator() {
	const counts = { validate: 0, knownGood: 0 }
	const validator: T.Validatable<number> = {
		validate: (value) => {
			counts.validate++
			if (typeof value !== 'number') throw new ValidationError('Expected a number item')
			return value
		},
		validateUsingKnownGoodVersion: (knownGood, value) => {
			counts.knownGood++
			if (typeof value !== 'number') throw new ValidationError('Expected a number item')
			return Object.is(knownGood, value) ? knownGood : (value as number)
		},
	}
	return { validator, counts }
}

describe('§9 Arrays of validated items', () => {
	it('[A1] arrayOf validates every element and prefixes the failing index', () => {
		const validator = T.arrayOf(T.number)
		const arr = [1, 2, 3]
		expect(validator.validate(arr)).toBe(arr)

		expect(() => validator.validate([1, '2', 3])).toThrow('At 1: Expected number, got a string')
		expect(() => validator.validate('nope')).toThrow('Expected an array, got a string')
	})

	it('[A2] nonEmpty rejects empty arrays and lengthGreaterThan1 rejects singletons', () => {
		expect(T.arrayOf(T.string).nonEmpty().validate(['a'])).toEqual(['a'])
		expect(() => T.arrayOf(T.string).nonEmpty().validate([])).toThrow('Expected a non-empty array')

		expect(T.arrayOf(T.string).lengthGreaterThan1().validate(['a', 'b'])).toEqual(['a', 'b'])
		expect(() => T.arrayOf(T.string).lengthGreaterThan1().validate(['a'])).toThrow(
			'Expected an array with length greater than 1'
		)
		expect(() => T.arrayOf(T.string).lengthGreaterThan1().validate([])).toThrow(
			'Expected an array with length greater than 1'
		)
	})

	it('[A3] known-good validation returns the known-good array when nothing changed', () => {
		const validator = T.arrayOf(T.number)
		const knownGood = validator.validate([1, 2, 3])
		expect(validator.validateUsingKnownGoodVersion(knownGood, [1, 2, 3])).toBe(knownGood)
	})

	it('[A3] unchanged elements are skipped outright; changed ones go through the item known-good path', () => {
		const { validator: item, counts } = countingItemValidator()
		const validator = T.arrayOf(item)
		const knownGood = validator.validate([1, 2])
		expect(counts).toEqual({ validate: 2, knownGood: 0 })

		expect(validator.validateUsingKnownGoodVersion(knownGood, [1, 2])).toBe(knownGood)
		expect(counts).toEqual({ validate: 2, knownGood: 0 })

		const next = [1, 5]
		expect(validator.validateUsingKnownGoodVersion(knownGood, next)).toBe(next)
		expect(counts).toEqual({ validate: 2, knownGood: 1 })
	})

	it('[A4] a changed length returns the new array, validating only appended elements', () => {
		const { validator: item, counts } = countingItemValidator()
		const validator = T.arrayOf(item)
		const knownGood = validator.validate([1, 2])
		counts.validate = 0

		const longer = [1, 2, 3]
		expect(validator.validateUsingKnownGoodVersion(knownGood, longer)).toBe(longer)
		expect(counts).toEqual({ validate: 1, knownGood: 0 })

		const shorter = [1]
		expect(validator.validateUsingKnownGoodVersion(knownGood, shorter)).toBe(shorter)
		expect(counts).toEqual({ validate: 1, knownGood: 0 })
	})

	it('[A4] invalid changed or appended elements fail with their index', () => {
		const validator = T.arrayOf(T.number)
		const knownGood = validator.validate([1, 2])
		expect(() => validator.validateUsingKnownGoodVersion(knownGood, [1, 'x'])).toThrow(
			'At 1: Expected number, got a string'
		)
		expect(() => validator.validateUsingKnownGoodVersion(knownGood, [1, 2, 'x'])).toThrow(
			'At 2: Expected number, got a string'
		)
	})

	it('[A5] without an item known-good implementation the new array is returned even when structurally equal', () => {
		const item: T.Validatable<number> = {
			validate: (value) => {
				if (typeof value !== 'number') throw new ValidationError('Expected a number item')
				return value
			},
		}
		const validator = T.arrayOf(item)
		const knownGood = validator.validate([1, 2])
		const next = [1, 2]
		expect(validator.validateUsingKnownGoodVersion(knownGood, next)).toBe(next)
	})
})
