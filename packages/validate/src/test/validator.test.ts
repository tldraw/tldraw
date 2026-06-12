import * as T from '../lib/validation'
import { ValidationError } from '../lib/validation'

describe('§3 The validator core', () => {
	it('[V1] validate returns exactly the value it was passed', () => {
		const validator = T.object({
			name: T.string,
			items: T.arrayOf(T.string.nullable()),
		})

		const value = {
			name: 'toad',
			items: ['toad', 'berd', null, 'bot'],
		}

		expect(validator.validate(value)).toBe(value)
	})

	it('[V1] validate does not mutate or freeze the value', () => {
		const value = { name: 'toad', items: [1, 2] }
		T.object({ name: T.string, items: T.arrayOf(T.number) }).validate(value)

		expect(value).toEqual({ name: 'toad', items: [1, 2] })
		expect(Object.isFrozen(value)).toBe(false)
		expect(Object.isFrozen(value.items)).toBe(false)
	})

	it('[V2] a non-transforming validator returning a different value throws in dev', () => {
		const validator = new T.Validator((value) => ({ ...(value as object) }))

		expect(() => validator.validate({ a: 1 })).toThrow(
			'Validator functions must return the same value they were passed'
		)
	})

	it('[V3] isValid returns a boolean and never throws', () => {
		expect(T.number.isValid(1)).toBe(true)
		expect(T.number.isValid('one')).toBe(false)
		expect(T.object({ a: T.string }).isValid(null)).toBe(false)
	})

	it('[V4] validateUsingKnownGoodVersion returns the known-good value without validating when Object.is-equal', () => {
		let calls = 0
		const counting = new T.Validator<number>((value) => {
			calls++
			if (typeof value !== 'number') throw new ValidationError('Expected number')
			return value
		})

		expect(counting.validateUsingKnownGoodVersion(42, 42)).toBe(42)
		expect(calls).toBe(0)
	})

	it('[V5] validateUsingKnownGoodVersion falls back to a full validate without a known-good implementation', () => {
		expect(T.string.validateUsingKnownGoodVersion('a', 'b')).toBe('b')
		expect(() => T.string.validateUsingKnownGoodVersion('a', 5)).toThrow(
			'Expected string, got a number'
		)
	})
})
