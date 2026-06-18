import * as T from '../lib/validation'

const cat = T.object({ type: T.literal('cat'), id: T.string, meow: T.boolean })
const dog = T.object({ type: T.literal('dog'), id: T.string, bark: T.boolean })
const animal = T.union('type', { cat, dog })

describe('§12 Discriminated unions', () => {
	it('[U1] selects the variant by discriminator and returns the input on success', () => {
		const value = { type: 'cat', id: 'abc123', meow: true }
		expect(animal.validate(value)).toBe(value)
	})

	it('[U2] rejects non-object inputs', () => {
		expect(() => animal.validate('cat')).toThrow('Expected an object, got a string')
		expect(() => animal.validate(null)).toThrow('Expected an object, got null')
	})

	it('[U3] rejects a missing or non-string discriminator', () => {
		expect(() => animal.validate({})).toThrow('Expected a string for key "type", got undefined')
		expect(() => animal.validate({ type: 1 })).toThrow(
			'Expected a string for key "type", got a number'
		)
	})

	it('[U4] rejects unmatched variants, listing the known ones at the discriminator path', () => {
		expect(() =>
			T.object({ animal }).validate({ animal: { type: 'cow', moo: true, id: 'abc123' } })
		).toThrow('At animal.type: Expected one of "cat" or "dog", got "cow"')
	})

	it('[U5] prefixes variant validation failures with the (key = variant) segment', () => {
		expect(() =>
			T.object({ animal }).validate({ animal: { type: 'cat', meow: 'yes', id: 'abc123' } })
		).toThrow('At animal(type = cat).meow: Expected boolean, got a string')

		expect(() =>
			T.model('animal', animal).validate({ type: 'cat', moo: true, id: 'abc123' })
		).toThrow('At animal(type = cat).meow: Expected boolean, got undefined')
	})

	it('[U6] validateUnknownVariants handles unmatched variants with the handler result', () => {
		let seenVariant = ''
		const lenient = animal.validateUnknownVariants((value, variant) => {
			seenVariant = variant
			return value as any
		})

		const unknownValue = { type: 'cow', moo: true }
		expect(lenient.validate(unknownValue)).toBe(unknownValue)
		expect(seenVariant).toBe('cow')

		// known variants still validate normally
		expect(() => lenient.validate({ type: 'cat', id: 'x', meow: 'yes' })).toThrow(
			'At (type = cat).meow: Expected boolean, got a string'
		)
	})

	it('[U6] a handler returning a new object trips the dev same-value check on the validate path', () => {
		const lenient = animal.validateUnknownVariants((value) => ({ ...value }) as any)
		expect(() => lenient.validate({ type: 'cow' })).toThrow(
			'Validator functions must return the same value they were passed'
		)

		// the known-good path does not run that check
		const out = lenient.validateUsingKnownGoodVersion({ type: 'cow' } as any, { type: 'emu' })
		expect(out).toEqual({ type: 'emu' })
	})

	it('[U7] known-good validation with an unchanged discriminator preserves identity', () => {
		const knownGood = animal.validate({ type: 'cat', id: 'x', meow: true })
		expect(
			animal.validateUsingKnownGoodVersion(knownGood, { type: 'cat', id: 'x', meow: true })
		).toBe(knownGood)

		const next = { type: 'cat', id: 'x', meow: false }
		expect(animal.validateUsingKnownGoodVersion(knownGood, next)).toBe(next)
		expect(() =>
			animal.validateUsingKnownGoodVersion(knownGood, { type: 'cat', id: 'x', meow: 'no' })
		).toThrow('At (type = cat).meow: Expected boolean, got a string')
	})

	it('[U7] a changed discriminator falls back to a full validation of the new variant', () => {
		const knownGood = animal.validate({ type: 'cat', id: 'x', meow: true })
		const next = { type: 'dog', id: 'x', bark: true }
		expect(animal.validateUsingKnownGoodVersion(knownGood, next)).toBe(next)
		expect(() => animal.validateUsingKnownGoodVersion(knownGood, { type: 'dog', id: 'x' })).toThrow(
			'At (type = dog).bark: Expected boolean, got undefined'
		)
	})

	it('[U7] known-good validation rejects a non-object on either side', () => {
		const knownGood = animal.validate({ type: 'cat', id: 'x', meow: true })
		expect(() => animal.validateUsingKnownGoodVersion(knownGood, 'x')).toThrow(
			'Expected an object, got a string'
		)
		expect(() =>
			animal.validateUsingKnownGoodVersion(null as any, { type: 'cat', id: 'x', meow: true })
		).toThrow('Expected an object, got null')
	})

	describe('numberUnion', () => {
		const versioned = T.numberUnion('version', {
			1: T.object({ version: T.literal(1), data: T.string }),
			2: T.object({ version: T.literal(2), data: T.string }),
		})

		it('[U8] validates variants keyed by finite number discriminators', () => {
			const v1 = { version: 1, data: 'hello' }
			const v2 = { version: 2, data: 'world' }
			expect(versioned.validate(v1)).toBe(v1)
			expect(versioned.validate(v2)).toBe(v2)
		})

		it('[U8] rejects Infinity, -Infinity, NaN, and non-numeric discriminators', () => {
			expect(() => versioned.validate({ version: Infinity, data: 'x' })).toThrow(
				'Expected a number for key "version", got "Infinity"'
			)
			expect(() => versioned.validate({ version: -Infinity, data: 'x' })).toThrow(
				'Expected a number for key "version", got "-Infinity"'
			)
			expect(() => versioned.validate({ version: NaN, data: 'x' })).toThrow(
				'Expected a number for key "version", got "NaN"'
			)
			expect(() => versioned.validate({ version: 'two', data: 'x' })).toThrow(
				'Expected a number for key "version", got "two"'
			)
			expect(() => versioned.validate({ data: 'x' })).toThrow(
				'Expected a number for key "version", got "undefined"'
			)
		})

		it('[U9] looks the variant up by string coercion, so string-numeric discriminators select the variant', () => {
			expect(() => versioned.validate({ version: '1', data: 'x' })).toThrow(
				'At (version = 1).version: Expected 1, got "1"'
			)
		})

		it('[U9] unmatched finite numbers are rejected as unknown variants', () => {
			expect(() => versioned.validate({ version: 1.5, data: 'x' })).toThrow(
				'At version: Expected one of "1" or "2", got 1.5'
			)
			expect(() => versioned.validate({ version: 3, data: 'x' })).toThrow(
				'At version: Expected one of "1" or "2", got 3'
			)
		})
	})
})
