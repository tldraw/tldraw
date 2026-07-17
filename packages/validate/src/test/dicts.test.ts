import * as T from '../lib/validation'
import { ValidationError } from '../lib/validation'

describe('§11 Dictionaries', () => {
	it('[DI1] dict validates every key and value, prefixing the key on failure', () => {
		const validator = T.dict(T.string, T.number)
		const value = { alice: 100, bob: 85 }
		expect(validator.validate(value)).toBe(value)

		expect(() => validator.validate({ alice: 'x' })).toThrow(
			'At alice: Expected number, got a string'
		)

		const shortKeys = T.dict(
			T.string.check((key) => {
				if (key.length > 2) throw new ValidationError('key too long')
			}),
			T.number
		)
		expect(() => shortKeys.validate({ abc: 1 })).toThrow('At abc: key too long')
	})

	it('[DI1] non-objects and null are rejected; arrays pass the object check', () => {
		const validator = T.dict(T.string, T.number)
		expect(() => validator.validate(null)).toThrow('Expected object, got null')
		expect(() => validator.validate('x')).toThrow('Expected object, got a string')

		const arr = [1, 2]
		expect(validator.validate(arr)).toBe(arr)
	})

	it('[DI2] jsonDict validates string keys and JSON values', () => {
		const value = { a: 'x', b: 42, c: ['a', 'b'], d: { nested: true }, e: null }
		expect(T.jsonDict().validate(value)).toBe(value)
		expect(() => T.jsonDict().validate({ a: () => {} })).toThrow(
			'At a: Expected json serializable value, got function'
		)
	})

	it('[DI3] known-good validation returns the known-good object when nothing changed', () => {
		const validator = T.dict(T.string, T.number)
		const knownGood = validator.validate({ a: 1, b: 2 })
		expect(validator.validateUsingKnownGoodVersion(knownGood, { a: 1, b: 2 })).toBe(knownGood)
	})

	it('[DI3] added keys are fully validated and produce the new object', () => {
		const validator = T.dict(T.string, T.number)
		const knownGood = validator.validate({ a: 1, b: 2 })

		const added = { a: 1, b: 2, c: 3 }
		expect(validator.validateUsingKnownGoodVersion(knownGood, added)).toBe(added)
		expect(() =>
			validator.validateUsingKnownGoodVersion(knownGood, { a: 1, b: 2, c: 'x' })
		).toThrow('At c: Expected number, got a string')
	})

	it('[DI3] removed keys are detected', () => {
		const validator = T.dict(T.string, T.number)
		const knownGood = validator.validate({ a: 1, b: 2 })
		const removed = { a: 1 }
		expect(validator.validateUsingKnownGoodVersion(knownGood, removed)).toBe(removed)

		// a swap (one removed, one added) is also detected
		const swapped = { a: 1, c: 2 }
		expect(validator.validateUsingKnownGoodVersion(knownGood, swapped)).toBe(swapped)
	})

	it('[DI3] changed values are revalidated incrementally', () => {
		let calls = 0
		const counting = new T.Validator<number>((value) => {
			calls++
			return T.number.validate(value)
		})
		const validator = T.dict(T.string, counting)
		const knownGood = validator.validate({ a: 1, b: 2 })
		calls = 0

		const next = { a: 1, b: 3 }
		expect(validator.validateUsingKnownGoodVersion(knownGood, next)).toBe(next)
		expect(calls).toBe(1)

		expect(() => validator.validateUsingKnownGoodVersion(knownGood, { a: 1, b: 'x' })).toThrow(
			'At b: Expected number, got a string'
		)
	})
})
