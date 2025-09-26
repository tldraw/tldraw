import * as T from '../lib/validation'

describe('validations', () => {
	it('Produces nice error messages with path context', () => {
		expect(() =>
			T.object({
				toad: T.object({
					name: T.number,
					friends: T.arrayOf(
						T.object({
							name: T.string,
						})
					),
				}),
			}).validate({
				toad: {
					name: 'toad',
					friends: [
						{
							name: 'bird',
						},

						{
							name: 1235,
						},
					],
				},
			})
		).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At toad.name: Expected number, got a string]`
		)

		expect(() =>
			T.model(
				'shape',
				T.object({
					id: T.string,
					x: T.number,
					y: T.number,
				})
			).validate({
				id: 'abc123',
				x: 132,
				y: NaN,
			})
		).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At shape.y: Expected a number, got NaN]`
		)
	})

	it('Validates discriminated unions', () => {
		const animalSchema = T.union('type', {
			cat: T.object({ type: T.literal('cat'), meow: T.boolean }),
			dog: T.object({ type: T.literal('dog'), bark: T.boolean }),
		})

		expect(() => animalSchema.validate({ type: 'cow', moo: true })).toThrow(
			'Expected one of "cat" or "dog"'
		)

		expect(() => animalSchema.validate({ type: 'cat', meow: 'yes' })).toThrow(
			'Expected boolean, got a string'
		)
	})
})

describe('T.refine', () => {
	it('transforms values with custom validation logic', () => {
		const nonEmptyString = T.string.refine((str) => {
			if (str.length === 0) throw new T.ValidationError('String must not be empty')
			return str
		})

		expect(nonEmptyString.validate('hello')).toBe('hello')
		expect(() => nonEmptyString.validate('')).toThrow('String must not be empty')
	})

	it('supports performance optimization with known good values', () => {
		const lengthValidator = T.string.refine((str) => {
			if (str.length < 3) throw new T.ValidationError('String too short')
			return str
		})
		const original = 'hello'

		const firstResult = lengthValidator.validate(original)
		const optimizedResult = lengthValidator.validateUsingKnownGoodVersion(firstResult, firstResult)
		expect(optimizedResult).toBe(firstResult)

		const newResult = lengthValidator.validateUsingKnownGoodVersion(firstResult, 'world')
		expect(newResult).toBe('world')
	})
})

describe('T.check', () => {
	it('adds validation constraints without changing type', () => {
		const evenNumber = T.number.check((value) => {
			if (value % 2 !== 0) throw new T.ValidationError('Expected even number')
		})

		expect(evenNumber.validate(2)).toBe(2)
		expect(() => evenNumber.validate(3)).toThrow('Expected even number')
	})

	it('supports named checks for better error reporting', () => {
		const boundedNumber = T.number.check('positive', (value) => {
			if (value < 0) throw new T.ValidationError('Must be positive')
		})

		expect(boundedNumber.validate(50)).toBe(50)
		expect(() => boundedNumber.validate(-1)).toThrow('Must be positive')
	})
})

describe('T.indexKey', () => {
	it('validates fractional index keys for ordering', () => {
		expect(T.indexKey.validate('a0')).toBe('a0')
		expect(() => T.indexKey.validate('invalid')).toThrow('Expected an index key')
	})
})

describe('Number validators', () => {
	it('validates positive numbers (including zero)', () => {
		expect(T.positiveNumber.validate(0)).toBe(0)
		expect(T.positiveNumber.validate(42)).toBe(42)
		expect(() => T.positiveNumber.validate(-1)).toThrow('positive number')
		expect(() => T.positiveNumber.validate(NaN)).toThrow('Expected a number, got NaN')
	})

	it('validates non-zero positive numbers', () => {
		expect(T.nonZeroNumber.validate(0.01)).toBe(0.01)
		expect(() => T.nonZeroNumber.validate(0)).toThrow('non-zero positive')
	})

	it('validates positive integers', () => {
		expect(T.positiveInteger.validate(42)).toBe(42)
		expect(() => T.positiveInteger.validate(3.14)).toThrow('Expected an integer')
		expect(() => T.positiveInteger.validate(-1)).toThrow('positive integer')
	})

	it('validates non-zero positive integers', () => {
		expect(T.nonZeroInteger.validate(1)).toBe(1)
		expect(() => T.nonZeroInteger.validate(0)).toThrow('non-zero positive integer')
	})
})

describe('Array constraints', () => {
	it('validates non-empty arrays', () => {
		const validator = T.arrayOf(T.string).nonEmpty()
		expect(validator.validate(['a'])).toEqual(['a'])
		expect(() => validator.validate([])).toThrow('non-empty array')
	})

	it('validates arrays with multiple elements', () => {
		const validator = T.arrayOf(T.string).lengthGreaterThan1()
		expect(validator.validate(['a', 'b'])).toEqual(['a', 'b'])
		expect(() => validator.validate(['single'])).toThrow('length greater than 1')
	})
})

describe('Object composition', () => {
	it('allows unknown properties when configured', () => {
		const validator = T.object({ name: T.string }).allowUnknownProperties()
		const input = { name: 'Alice', extra: 'property' }
		expect(validator.validate(input)).toBe(input)
	})

	it('extends objects with additional properties', () => {
		const baseValidator = T.object({ name: T.string })
		const extendedValidator = baseValidator.extend({ age: T.number })

		const input = { name: 'Alice', age: 25 }
		expect(extendedValidator.validate(input)).toBe(input)
	})
})

describe('Union flexibility', () => {
	it('handles unknown variants with custom validation', () => {
		const baseUnion = T.union('type', {
			known: T.object({ type: T.literal('known'), value: T.string }),
		})

		const flexibleUnion = baseUnion.validateUnknownVariants((obj) => obj as any)

		const unknownObj = { type: 'unknown', someData: 'test' }
		expect(flexibleUnion.validate(unknownObj)).toBe(unknownObj)

		// Still validates known variants
		expect(() => flexibleUnion.validate({ type: 'known', value: 123 })).toThrow('Expected string')
	})
})

describe('URL validators', () => {
	it('validates safe link URLs', () => {
		expect(T.linkUrl.validate('https://example.com')).toBe('https://example.com')
		expect(T.linkUrl.validate('mailto:user@example.com')).toBe('mailto:user@example.com')
		expect(T.linkUrl.validate('')).toBe('')
		expect(() => T.linkUrl.validate('javascript:alert(1)')).toThrow('invalid protocol')
	})

	it('validates asset source URLs', () => {
		expect(T.srcUrl.validate('https://example.com/image.png')).toBe('https://example.com/image.png')
		expect(T.srcUrl.validate('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
		expect(T.srcUrl.validate('asset:abc123')).toBe('asset:abc123')
		expect(() => T.srcUrl.validate('javascript:alert(1)')).toThrow('invalid protocol')
	})

	it('validates HTTP-only URLs', () => {
		expect(T.httpUrl.validate('https://api.example.com')).toBe('https://api.example.com')
		expect(() => T.httpUrl.validate('ftp://files.example.com')).toThrow('invalid protocol')
	})
})

describe('Error reporting', () => {
	it('provides detailed error context with paths', () => {
		const error = new T.ValidationError('Test message', ['users', 0, 'name'])
		expect(error.message).toBe('At users.0.name: Test message')
		expect(error.rawMessage).toBe('Test message')
	})

	it('formats union discriminator paths', () => {
		const error = new T.ValidationError('Invalid value', ['shape', '(type = circle)', 'radius'])
		expect(error.message).toBe('At shape(type = circle).radius: Invalid value')
	})

	it('removes id fields for better error grouping', () => {
		const error = new T.ValidationError('Test message', [
			'users',
			'(id = user123, name = Alice)',
			'email',
		])
		expect(error.message).toBe('At users(name = Alice).email: Test message')
	})
})

describe('Model validator', () => {
	it('provides contextual error reporting with model names', () => {
		const userModel = T.model('User', T.object({ id: T.string, age: T.number }))

		expect(() => userModel.validate({ id: 'user1', age: 'not a number' })).toThrow(
			'At User.age: Expected number'
		)

		const user = { id: 'user1', age: 25 }
		expect(userModel.validate(user)).toBe(user)
	})
})

describe('T.or union types', () => {
	it('accepts values matching either validator', () => {
		const stringOrNumber = T.or(T.string, T.number)
		expect(stringOrNumber.validate('hello')).toBe('hello')
		expect(stringOrNumber.validate(42)).toBe(42)
		expect(() => stringOrNumber.validate(true)).toThrow('Expected number')
	})

	it('works with complex object unions', () => {
		const userOrProduct = T.or(
			T.object({ type: T.literal('user'), name: T.string }),
			T.object({ type: T.literal('product'), price: T.number })
		)

		expect(userOrProduct.validate({ type: 'user', name: 'Alice' })).toEqual({
			type: 'user',
			name: 'Alice',
		})
		expect(userOrProduct.validate({ type: 'product', price: 99.99 })).toEqual({
			type: 'product',
			price: 99.99,
		})
	})
})

describe('Literal validation', () => {
	it('validates exact literal values', () => {
		expect(T.literal('hello').validate('hello')).toBe('hello')
		expect(() => T.literal('hello').validate('world')).toThrow('Expected hello')
		expect(() => T.literal('42').validate(42)).toThrow('Expected 42, got 42') // Different types
	})

	it('validates literal enums', () => {
		const theme = T.literalEnum('light', 'dark', 'auto')
		expect(theme.validate('light')).toBe('light')
		expect(() => theme.validate('blue')).toThrow('Expected "light" or "dark" or "auto"')

		const mixed = T.literalEnum('string', 42, true)
		expect(mixed.validate('string')).toBe('string')
		expect(mixed.validate(42)).toBe(42)
	})
})

describe('Performance optimization', () => {
	it('reuses objects when validation passes and values are unchanged', () => {
		const validator = T.object({ name: T.string, count: T.number })
		const original = { name: 'test', count: 5 }
		const validated = validator.validate(original)

		const optimized = validator.validateUsingKnownGoodVersion(validated, validated)
		expect(optimized).toBe(validated)

		const different = { name: 'test', count: 10 }
		const revalidated = validator.validateUsingKnownGoodVersion(validated, different)
		expect(revalidated).toBe(different)
	})
})

describe('Type guards', () => {
	it('provides safe type checking without throwing', () => {
		expect(T.string.isValid('hello')).toBe(true)
		expect(T.string.isValid(123)).toBe(false)

		const validator = T.object({ name: T.string, age: T.number })
		expect(validator.isValid({ name: 'Alice', age: 25 })).toBe(true)
		expect(validator.isValid({ name: 'Alice', age: 'not a number' })).toBe(false)
	})
})

describe('Nullable and optional validators', () => {
	it('handles null values with nullable()', () => {
		const validator = T.string.nullable()
		expect(validator.validate(null)).toBe(null)
		expect(validator.validate('hello')).toBe('hello')
		expect(() => validator.validate(undefined)).toThrow('Expected string, got undefined')
	})

	it('handles undefined values with optional()', () => {
		const validator = T.string.optional()
		expect(validator.validate(undefined)).toBe(undefined)
		expect(validator.validate('hello')).toBe('hello')
		expect(() => validator.validate(null)).toThrow('Expected string, got null')
	})

	it('chains nullable and optional modifiers', () => {
		const validator = T.string.nullable().optional()
		expect(validator.validate(null)).toBe(null)
		expect(validator.validate(undefined)).toBe(undefined)
		expect(validator.validate('hello')).toBe('hello')
		expect(() => validator.validate(123)).toThrow('Expected string')
	})
})
