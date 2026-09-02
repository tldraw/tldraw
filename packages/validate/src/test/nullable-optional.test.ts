import * as T from '../lib/validation'

describe('§5 optional and nullable', () => {
	it('[NO1] nullable accepts null and passes everything else to the inner validator', () => {
		const validator = T.nullable(T.string)
		expect(validator.validate(null)).toBe(null)
		expect(validator.validate('hello')).toBe('hello')
		expect(() => validator.validate(undefined)).toThrow('Expected string, got undefined')
		expect(() => validator.validate(5)).toThrow('Expected string, got a number')
	})

	it('[NO1] the .nullable() method behaves like T.nullable', () => {
		expect(T.string.nullable().validate(null)).toBe(null)
		expect(T.string.nullable().validate('hello')).toBe('hello')
	})

	it('[NO2] optional accepts undefined and passes everything else to the inner validator', () => {
		const validator = T.optional(T.string)
		expect(validator.validate(undefined)).toBe(undefined)
		expect(validator.validate('hello')).toBe('hello')
		expect(() => validator.validate(null)).toThrow('Expected string, got null')
	})

	it('[NO2] the .optional() method behaves like T.optional', () => {
		expect(T.string.optional().validate(undefined)).toBe(undefined)
		expect(T.string.optional().validate('hello')).toBe('hello')
	})

	it('[NO3] known-good validation short-circuits null/undefined new values', () => {
		let calls = 0
		const counting = new T.Validator<string>((value) => {
			calls++
			return T.string.validate(value)
		})

		expect(T.optional(counting).validateUsingKnownGoodVersion('a', undefined)).toBe(undefined)
		expect(T.nullable(counting).validateUsingKnownGoodVersion('a', null)).toBe(null)
		expect(calls).toBe(0)
	})

	it('[NO3] a null/undefined known-good value forces a full inner validate', () => {
		expect(T.string.optional().validateUsingKnownGoodVersion(undefined, 'a')).toBe('a')
		expect(() => T.string.optional().validateUsingKnownGoodVersion(undefined, 5)).toThrow(
			'Expected string, got a number'
		)
		expect(T.string.nullable().validateUsingKnownGoodVersion(null, 'a')).toBe('a')
		expect(() => T.string.nullable().validateUsingKnownGoodVersion(null, 5)).toThrow(
			'Expected string, got a number'
		)
	})

	it('[NO3] otherwise the inner known-good path is used, preserving identity', () => {
		const validator = T.object({ a: T.number }).optional()
		const knownGood = validator.validate({ a: 1 })
		expect(validator.validateUsingKnownGoodVersion(knownGood, { a: 1 })).toBe(knownGood)

		const next = { a: 2 }
		expect(validator.validateUsingKnownGoodVersion(knownGood, next)).toBe(next)
	})

	it('[NO4] optional/nullable wrappers keep transforming validators exempt from the dev same-value check', () => {
		expect(
			T.string
				.refine((s) => s.toUpperCase())
				.optional()
				.validate('a')
		).toBe('A')
		expect(
			T.string
				.refine((s) => s.toUpperCase())
				.nullable()
				.validate('a')
		).toBe('A')
	})
})
