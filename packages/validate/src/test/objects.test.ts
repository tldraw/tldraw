import * as T from '../lib/validation'

describe('§10 Objects', () => {
	it('[O1] object validates each configured property, prefixing the property name', () => {
		const validator = T.object({ name: T.string, age: T.number })
		const value = { name: 'Alice', age: 25 }
		expect(validator.validate(value)).toBe(value)

		expect(() => validator.validate({ name: 'Alice', age: 'old' })).toThrow(
			'At age: Expected number, got a string'
		)
	})

	it('[O1] a missing property is validated as undefined', () => {
		const validator = T.object({ name: T.string, age: T.number })
		expect(() => validator.validate({ name: 'Alice' })).toThrow(
			'At age: Expected number, got undefined'
		)
	})

	it('[O2] unknown properties are rejected', () => {
		expect(() => T.object({ moo: T.literal('cow') }).validate({ moo: 'cow', cow: 'moo' })).toThrow(
			'At cow: Unexpected property'
		)
	})

	it('[O3] allowUnknownProperties returns a new validator accepting unvalidated extras', () => {
		const strict = T.object({ name: T.string })
		const loose = strict.allowUnknownProperties()

		const value = { name: 'Alice', extra: () => {} }
		expect(loose.validate(value)).toBe(value)

		// the original validator is unchanged
		expect(() => strict.validate({ name: 'Alice', extra: 1 })).toThrow(
			'At extra: Unexpected property'
		)
	})

	it('[O4] non-objects and null are rejected', () => {
		const validator = T.object({ a: T.number })
		expect(() => validator.validate(null)).toThrow('Expected object, got null')
		expect(() => validator.validate('x')).toThrow('Expected object, got a string')
		expect(() => validator.validate(undefined)).toThrow('Expected object, got undefined')
	})

	it('[O4] arrays pass the object check', () => {
		const empty: never[] = []
		expect(T.object({}).validate(empty)).toBe(empty)
		expect(() => T.object({}).validate([1])).toThrow('At 0: Unexpected property')
		expect(() => T.object({ a: T.number }).validate([])).toThrow(
			'At a: Expected number, got undefined'
		)
	})

	it('[O5] extend merges configs, with extension keys overriding', () => {
		const base = T.object({ a: T.number, b: T.number })
		const extended = base.extend({ b: T.string as any as T.Validatable<number>, c: T.boolean })

		const value = { a: 1, b: 'x', c: true }
		expect(extended.validate(value as any)).toBe(value)
		expect(() => extended.validate({ a: 1, b: 2, c: true } as any)).toThrow(
			'At b: Expected string, got a number'
		)

		// the base validator is unchanged
		expect(base.validate({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
	})

	it('[O5] the extended validator rejects unknown properties even when the receiver allowed them', () => {
		const validator = T.object({ a: T.number }).allowUnknownProperties().extend({ b: T.string })
		expect(() => validator.validate({ a: 1, b: 'x', c: true })).toThrow('At c: Unexpected property')
	})

	it('[O6] known-good validation returns the known-good object when nothing changed', () => {
		const validator = T.object({ a: T.number, nested: T.object({ b: T.string }) })
		const knownGood = validator.validate({ a: 1, nested: { b: 'x' } })

		// new outer and inner objects, structurally equal
		expect(validator.validateUsingKnownGoodVersion(knownGood, { a: 1, nested: { b: 'x' } })).toBe(
			knownGood
		)
	})

	it('[O6] known-good validation returns the new object when a property changed, revalidating only changes', () => {
		let calls = 0
		const counting = new T.Validator<number>((value) => {
			calls++
			return T.number.validate(value)
		})
		const validator = T.object({ a: counting, b: counting })
		const knownGood = validator.validate({ a: 1, b: 2 })
		calls = 0

		const next = { a: 1, b: 3 }
		expect(validator.validateUsingKnownGoodVersion(knownGood, next)).toBe(next)
		expect(calls).toBe(1)

		expect(() => validator.validateUsingKnownGoodVersion(knownGood, { a: 1, b: 'x' })).toThrow(
			'At b: Expected number, got a string'
		)
	})

	it('[O6] known-good validation rejects non-objects and added unknown properties', () => {
		const validator = T.object({ a: T.number })
		const knownGood = validator.validate({ a: 1 })
		expect(() => validator.validateUsingKnownGoodVersion(knownGood, 'x')).toThrow(
			'Expected object, got a string'
		)
		expect(() => validator.validateUsingKnownGoodVersion(knownGood, { a: 1, b: 2 })).toThrow(
			'At b: Unexpected property'
		)
	})

	it('[O8] known-good validation detects changes to unknown properties', () => {
		const validator = T.object({ a: T.number }).allowUnknownProperties()

		const knownGood = validator.validate({ a: 1, extra: 1 })
		expect(validator.validateUsingKnownGoodVersion(knownGood, { a: 1, extra: 1 })).toBe(knownGood)

		const changed = { a: 1, extra: 2 }
		expect(validator.validateUsingKnownGoodVersion(knownGood, changed)).toBe(changed)

		const added = { a: 1, extra: 1, more: true }
		expect(validator.validateUsingKnownGoodVersion(knownGood, added)).toBe(added)

		const removed = { a: 1 }
		expect(validator.validateUsingKnownGoodVersion(knownGood, removed)).toBe(removed)
	})

	it('[O7] known-good validation detects removed keys', () => {
		const validator = T.object({ a: T.number, b: T.number.optional() })
		const knownGood = validator.validate({ a: 1, b: 2 })
		const next = { a: 1 }
		expect(validator.validateUsingKnownGoodVersion(knownGood, next)).toBe(next)
	})
})
