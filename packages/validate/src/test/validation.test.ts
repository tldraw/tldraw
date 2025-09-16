import * as T from '../lib/validation'

describe('validations', () => {
	it('Returns referentially identical objects', () => {
		const validator = T.object({
			name: T.string,
			items: T.arrayOf(T.string.nullable()),
		})

		const value = {
			name: 'toad',
			items: ['toad', 'berd', null, 'bot'],
		}

		expect(validator.validate(value)).toStrictEqual(value)
	})
	it('Rejects unknown object keys', () => {
		expect(() =>
			T.object({ moo: T.literal('cow') }).validate({ moo: 'cow', cow: 'moo' })
		).toThrowErrorMatchingInlineSnapshot(`[ValidationError: At cow: Unexpected property]`)
	})
	it('Produces nice error messages', () => {
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

		expect(() =>
			T.model(
				'shape',
				T.object({
					id: T.string,
					color: T.setEnum(new Set(['red', 'green', 'blue'])),
				})
			).validate({ id: 'abc13', color: 'rubbish' })
		).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At shape.color: Expected "red" or "green" or "blue", got rubbish]`
		)
	})

	it('Understands unions & produces nice error messages', () => {
		const catSchema = T.object({
			type: T.literal('cat'),
			id: T.string,
			meow: T.boolean,
		})
		const dogSchema = T.object({
			type: T.literal('dog'),
			id: T.string,
			bark: T.boolean,
		})
		const animalSchema = T.union('type', {
			cat: catSchema,
			dog: dogSchema,
		})

		const nested = T.object({
			animal: animalSchema,
		})

		expect(() =>
			nested.validate({ animal: { type: 'cow', moo: true, id: 'abc123' } })
		).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At animal.type: Expected one of "cat" or "dog", got "cow"]`
		)

		expect(() =>
			nested.validate({ animal: { type: 'cat', meow: 'yes', id: 'abc123' } })
		).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At animal(type = cat).meow: Expected boolean, got a string]`
		)

		expect(() =>
			T.model('animal', animalSchema).validate({ type: 'cat', moo: true, id: 'abc123' })
		).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At animal(type = cat).meow: Expected boolean, got undefined]`
		)
	})
})

describe('T.refine', () => {
	it('adds validation logic to existing validators', () => {
		const nonEmptyString = T.string.refine((str) => {
			if (str.length === 0) throw new T.ValidationError('String must not be empty')
			return str
		})

		expect(nonEmptyString.validate('hello')).toBe('hello')
		expect(() => nonEmptyString.validate('')).toThrow('String must not be empty')
		expect(() => nonEmptyString.validate(123)).toThrow('Expected string')
	})

	it('can add complex validation logic', () => {
		const emailString = T.string.refine((str) => {
			if (!str.includes('@')) throw new T.ValidationError('Must be a valid email')
			return str
		})

		expect(emailString.validate('user@example.com')).toBe('user@example.com')
		expect(() => emailString.validate('not-an-email')).toThrow('Must be a valid email')
	})

	it('works with objects and complex validations', () => {
		const userValidator = T.object({
			firstName: T.string,
			lastName: T.string,
		}).refine((user) => {
			if (user.firstName.length === 0 || user.lastName.length === 0) {
				throw new T.ValidationError('Names must not be empty')
			}
			return user
		})

		const validUser = { firstName: 'John', lastName: 'Doe' }
		const result = userValidator.validate(validUser)
		expect(result).toBe(validUser)
		expect(result.firstName).toBe('John')
		expect(result.lastName).toBe('Doe')

		expect(() => userValidator.validate({ firstName: '', lastName: 'Doe' })).toThrow(
			'Names must not be empty'
		)
	})

	it('supports performance optimized validation', () => {
		const lengthValidator = T.string.refine((str) => {
			if (str.length < 3) throw new T.ValidationError('String too short')
			return str
		})
		const original = 'hello'
		const different = 'world'

		const firstResult = lengthValidator.validate(original)
		expect(firstResult).toBe('hello')

		// Should use optimized path when values are referentially equal
		const optimizedResult = lengthValidator.validateUsingKnownGoodVersion(firstResult, firstResult)
		expect(optimizedResult).toBe(firstResult)

		// Should re-validate when values are different
		const newResult = lengthValidator.validateUsingKnownGoodVersion(firstResult, different)
		expect(newResult).toBe(different)

		// Should throw on invalid values
		expect(() => lengthValidator.validateUsingKnownGoodVersion(firstResult, 'hi')).toThrow(
			'String too short'
		)
	})

	it('preserves error paths in refinements', () => {
		const validator = T.object({
			user: T.object({ name: T.string }).refine((user) => {
				if (user.name.length < 2) throw new T.ValidationError('Name too short')
				return user
			}),
		})

		expect(() => validator.validate({ user: { name: 'A' } })).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At user: Name too short]`
		)
	})
})

describe('T.check', () => {
	it('adds validation checks without changing the type', () => {
		const evenNumber = T.number.check((value) => {
			if (value % 2 !== 0) throw new T.ValidationError('Expected even number')
		})

		expect(evenNumber.validate(2)).toBe(2)
		expect(evenNumber.validate(42)).toBe(42)
		expect(() => evenNumber.validate(3)).toThrow('Expected even number')
		expect(() => evenNumber.validate(1.5)).toThrow('Expected even number')
	})

	it('supports named checks for better error messages', () => {
		const boundedNumber = T.number
			.check('positive', (value) => {
				if (value < 0) throw new T.ValidationError('Must be positive')
			})
			.check('max-100', (value) => {
				if (value > 100) throw new T.ValidationError('Must be <= 100')
			})

		expect(boundedNumber.validate(50)).toBe(50)
		expect(() => boundedNumber.validate(-1)).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At (check positive): Must be positive]`
		)
		expect(() => boundedNumber.validate(101)).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At (check max-100): Must be <= 100]`
		)
	})

	it('can be chained with other validator methods', () => {
		const validator = T.string
			.check((value) => {
				if (value.length === 0) throw new T.ValidationError('Must not be empty')
			})
			.optional()
			.nullable()

		expect(validator.validate('hello')).toBe('hello')
		expect(validator.validate(undefined)).toBe(undefined)
		expect(validator.validate(null)).toBe(null)
		expect(() => validator.validate('')).toThrow('Must not be empty')
	})

	it('works in object validators with proper error paths', () => {
		const validator = T.object({
			password: T.string.check('length', (value) => {
				if (value.length < 8) throw new T.ValidationError('Password too short')
			}),
			confirm: T.string,
		})

		expect(() =>
			validator.validate({ password: '123', confirm: '123' })
		).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At password(check length): Password too short]`
		)
	})

	it('supports performance optimized validation', () => {
		const checkedString = T.string.check((value) => {
			if (value.includes('bad')) throw new T.ValidationError('Contains bad word')
		})

		const validValue = 'good string'
		const result = checkedString.validate(validValue)
		expect(result).toBe(validValue)

		// Should use optimized path when values are referentially equal
		const optimized = checkedString.validateUsingKnownGoodVersion(result, result)
		expect(optimized).toBe(result)

		// Should re-validate when values are different
		expect(() => checkedString.validateUsingKnownGoodVersion(result, 'bad string')).toThrow(
			'Contains bad word'
		)
	})
})

describe('T.indexKey', () => {
	it('validates index keys', () => {
		expect(T.indexKey.validate('a0')).toBe('a0')
		expect(T.indexKey.validate('a1J')).toBe('a1J')
	})
	it('rejects invalid index keys', () => {
		expect(() => T.indexKey.validate('a')).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At null: Expected an index key, got "a"]`
		)
		expect(() => T.indexKey.validate('')).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At null: Expected an index key, got ""]`
		)
	})
})

describe('Number validators', () => {
	describe('T.positiveNumber', () => {
		it('accepts positive numbers and zero', () => {
			expect(T.positiveNumber.validate(0)).toBe(0)
			expect(T.positiveNumber.validate(0.1)).toBe(0.1)
			expect(T.positiveNumber.validate(42)).toBe(42)
			expect(T.positiveNumber.validate(999.99)).toBe(999.99)
		})

		it('rejects negative numbers', () => {
			expect(() => T.positiveNumber.validate(-1)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a positive number, got -1]`
			)
			expect(() => T.positiveNumber.validate(-0.1)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a positive number, got -0.1]`
			)
		})

		it('rejects non-numbers and invalid numbers', () => {
			expect(() => T.positiveNumber.validate(NaN)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a number, got NaN]`
			)
			expect(() => T.positiveNumber.validate(Infinity)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a finite number, got Infinity]`
			)
			expect(() => T.positiveNumber.validate('5')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected number, got a string]`
			)
		})
	})

	describe('T.nonZeroNumber', () => {
		it('accepts positive numbers', () => {
			expect(T.nonZeroNumber.validate(0.01)).toBe(0.01)
			expect(T.nonZeroNumber.validate(42)).toBe(42)
			expect(T.nonZeroNumber.validate(999.99)).toBe(999.99)
		})

		it('rejects zero and negative numbers', () => {
			expect(() => T.nonZeroNumber.validate(0)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a non-zero positive number, got 0]`
			)
			expect(() => T.nonZeroNumber.validate(-1)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a non-zero positive number, got -1]`
			)
			expect(() => T.nonZeroNumber.validate(-0.1)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a non-zero positive number, got -0.1]`
			)
		})
	})

	describe('T.positiveInteger', () => {
		it('accepts positive integers and zero', () => {
			expect(T.positiveInteger.validate(0)).toBe(0)
			expect(T.positiveInteger.validate(1)).toBe(1)
			expect(T.positiveInteger.validate(42)).toBe(42)
			expect(T.positiveInteger.validate(999)).toBe(999)
		})

		it('rejects negative integers', () => {
			expect(() => T.positiveInteger.validate(-1)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a positive integer, got -1]`
			)
			expect(() => T.positiveInteger.validate(-42)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a positive integer, got -42]`
			)
		})

		it('rejects non-integers', () => {
			expect(() => T.positiveInteger.validate(3.14)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected an integer, got 3.14]`
			)
			expect(() => T.positiveInteger.validate(0.1)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected an integer, got 0.1]`
			)
		})
	})

	describe('T.nonZeroInteger', () => {
		it('accepts positive integers', () => {
			expect(T.nonZeroInteger.validate(1)).toBe(1)
			expect(T.nonZeroInteger.validate(42)).toBe(42)
			expect(T.nonZeroInteger.validate(999)).toBe(999)
		})

		it('rejects zero and negative integers', () => {
			expect(() => T.nonZeroInteger.validate(0)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a non-zero positive integer, got 0]`
			)
			expect(() => T.nonZeroInteger.validate(-1)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a non-zero positive integer, got -1]`
			)
			expect(() => T.nonZeroInteger.validate(-42)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a non-zero positive integer, got -42]`
			)
		})

		it('rejects non-integers', () => {
			expect(() => T.nonZeroInteger.validate(3.14)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected an integer, got 3.14]`
			)
			expect(() => T.nonZeroInteger.validate(0.1)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected an integer, got 0.1]`
			)
		})
	})
})

describe('Array methods', () => {
	describe('ArrayOfValidator.nonEmpty()', () => {
		it('accepts non-empty arrays', () => {
			const validator = T.arrayOf(T.string).nonEmpty()
			expect(validator.validate(['a'])).toEqual(['a'])
			expect(validator.validate(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
		})

		it('rejects empty arrays', () => {
			const validator = T.arrayOf(T.string).nonEmpty()
			expect(() => validator.validate([])).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a non-empty array]`
			)
		})

		it('still validates array elements', () => {
			const validator = T.arrayOf(T.number).nonEmpty()
			expect(() => validator.validate(['not', 'numbers'])).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At 0: Expected number, got a string]`
			)
		})
	})

	describe('ArrayOfValidator.lengthGreaterThan1()', () => {
		it('accepts arrays with more than one element', () => {
			const validator = T.arrayOf(T.string).lengthGreaterThan1()
			expect(validator.validate(['a', 'b'])).toEqual(['a', 'b'])
			expect(validator.validate(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
		})

		it('rejects arrays with one or zero elements', () => {
			const validator = T.arrayOf(T.string).lengthGreaterThan1()
			expect(() => validator.validate([])).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected an array with length greater than 1]`
			)
			expect(() => validator.validate(['single'])).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected an array with length greater than 1]`
			)
		})
	})
})

describe('Object methods', () => {
	describe('ObjectValidator.allowUnknownProperties()', () => {
		it('allows extra properties when enabled', () => {
			const validator = T.object({ name: T.string }).allowUnknownProperties()
			const input = { name: 'Alice', extra: 'property', another: 123 }
			expect(validator.validate(input)).toBe(input)
		})

		it('validates known properties normally', () => {
			const validator = T.object({ name: T.string }).allowUnknownProperties()
			expect(() =>
				validator.validate({ name: 123, extra: 'allowed' })
			).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At name: Expected string, got a number]`
			)
		})
	})

	describe('ObjectValidator.extend()', () => {
		it('creates new validator with additional properties', () => {
			const baseValidator = T.object({ name: T.string, age: T.number })
			const extendedValidator = baseValidator.extend({
				email: T.string,
				active: T.boolean,
			})

			const input = { name: 'Alice', age: 25, email: 'alice@example.com', active: true }
			expect(extendedValidator.validate(input)).toBe(input)
		})

		it('validates both original and extended properties', () => {
			const baseValidator = T.object({ name: T.string })
			const extendedValidator = baseValidator.extend({ count: T.number })

			expect(() =>
				extendedValidator.validate({ name: 123, count: 5 })
			).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At name: Expected string, got a number]`
			)
			expect(() =>
				extendedValidator.validate({ name: 'Alice', count: 'not number' })
			).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At count: Expected number, got a string]`
			)
		})
	})
})

describe('Union methods', () => {
	describe('UnionValidator.validateUnknownVariants()', () => {
		it('handles unknown variants with custom logic', () => {
			const baseUnion = T.union('type', {
				known: T.object({ type: T.literal('known'), value: T.string }),
			})

			// Note: validateUnknownVariants must return the original object as-is
			const flexibleUnion = baseUnion.validateUnknownVariants((obj, _variant) => {
				// Just return the object as-is - we can't transform it
				return obj as any
			})

			const testObj = { type: 'unknown', someData: 'test' }
			const result = flexibleUnion.validate(testObj)
			// Should return the same object since we can't transform
			expect(result).toBe(testObj)
		})

		it('still validates known variants normally', () => {
			const baseUnion = T.union('type', {
				known: T.object({ type: T.literal('known'), value: T.string }),
			})

			const flexibleUnion = baseUnion.validateUnknownVariants((obj) => obj as any)

			const knownResult = flexibleUnion.validate({ type: 'known', value: 'test' })
			expect(knownResult).toEqual({ type: 'known', value: 'test' })

			expect(() =>
				flexibleUnion.validate({ type: 'known', value: 123 })
			).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At (type = known).value: Expected string, got a number]`
			)
		})
	})
})

describe('URL validators', () => {
	describe('T.linkUrl', () => {
		it('accepts valid HTTP and HTTPS URLs', () => {
			expect(T.linkUrl.validate('https://example.com')).toBe('https://example.com')
			expect(T.linkUrl.validate('http://localhost:3000')).toBe('http://localhost:3000')
			expect(T.linkUrl.validate('https://sub.domain.com/path?query=1')).toBe(
				'https://sub.domain.com/path?query=1'
			)
		})

		it('accepts mailto URLs', () => {
			expect(T.linkUrl.validate('mailto:user@example.com')).toBe('mailto:user@example.com')
			expect(T.linkUrl.validate('mailto:test@test.co.uk?subject=Hello')).toBe(
				'mailto:test@test.co.uk?subject=Hello'
			)
		})

		it('accepts empty strings', () => {
			expect(T.linkUrl.validate('')).toBe('')
		})

		it('rejects unsafe protocols', () => {
			expect(() => T.linkUrl.validate('javascript:alert(1)')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "javascript:alert(1)" (invalid protocol)]`
			)
			expect(() =>
				T.linkUrl.validate('data:text/html,<script>alert(1)</script>')
			).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "data:text/html,<script>alert(1)</script>" (invalid protocol)]`
			)
			expect(() =>
				T.linkUrl.validate('ftp://files.example.com')
			).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "ftp://files.example.com" (invalid protocol)]`
			)
		})

		it('rejects invalid URLs', () => {
			expect(() => T.linkUrl.validate('not a url')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "not a url"]`
			)
			expect(() => T.linkUrl.validate('://missing-protocol')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "://missing-protocol"]`
			)
		})
	})

	describe('T.srcUrl', () => {
		it('accepts HTTP and HTTPS URLs', () => {
			expect(T.srcUrl.validate('https://example.com/image.png')).toBe(
				'https://example.com/image.png'
			)
			expect(T.srcUrl.validate('http://localhost/file.jpg')).toBe('http://localhost/file.jpg')
		})

		it('accepts data URLs', () => {
			const dataUrl =
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
			expect(T.srcUrl.validate(dataUrl)).toBe(dataUrl)
			expect(T.srcUrl.validate('data:text/plain;base64,SGVsbG8gV29ybGQ=')).toBe(
				'data:text/plain;base64,SGVsbG8gV29ybGQ='
			)
		})

		it('accepts asset URLs', () => {
			expect(T.srcUrl.validate('asset:abc123')).toBe('asset:abc123')
			expect(T.srcUrl.validate('asset:image-id-456')).toBe('asset:image-id-456')
		})

		it('accepts empty strings', () => {
			expect(T.srcUrl.validate('')).toBe('')
		})

		it('rejects unsafe protocols', () => {
			expect(() => T.srcUrl.validate('javascript:alert(1)')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "javascript:alert(1)" (invalid protocol)]`
			)
			expect(() => T.srcUrl.validate('ftp://files.example.com')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "ftp://files.example.com" (invalid protocol)]`
			)
			expect(() => T.srcUrl.validate('mailto:user@example.com')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "mailto:user@example.com" (invalid protocol)]`
			)
		})
	})

	describe('T.httpUrl', () => {
		it('accepts HTTP and HTTPS URLs', () => {
			expect(T.httpUrl.validate('https://api.example.com')).toBe('https://api.example.com')
			expect(T.httpUrl.validate('http://localhost:3000')).toBe('http://localhost:3000')
			expect(T.httpUrl.validate('https://sub.domain.com/api/v1/users')).toBe(
				'https://sub.domain.com/api/v1/users'
			)
		})

		it('accepts empty strings', () => {
			expect(T.httpUrl.validate('')).toBe('')
		})

		it('rejects non-HTTP protocols', () => {
			expect(() =>
				T.httpUrl.validate('ftp://files.example.com')
			).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "ftp://files.example.com" (invalid protocol)]`
			)
			expect(() =>
				T.httpUrl.validate('mailto:user@example.com')
			).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "mailto:user@example.com" (invalid protocol)]`
			)
			expect(() => T.httpUrl.validate('data:text/plain,hello')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "data:text/plain,hello" (invalid protocol)]`
			)
			expect(() => T.httpUrl.validate('asset:abc123')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected a valid url, got "asset:abc123" (invalid protocol)]`
			)
		})
	})
})

describe('Error path formatting', () => {
	it('formats simple paths correctly', () => {
		const error = new T.ValidationError('Test message', ['users', 0, 'name'])
		expect(error.message).toBe('At users.0.name: Test message')
		expect(error.path).toEqual(['users', 0, 'name'])
		expect(error.rawMessage).toBe('Test message')
	})

	it('formats union paths with discriminators', () => {
		const error = new T.ValidationError('Invalid value', ['shape', '(type = circle)', 'radius'])
		expect(error.message).toBe('At shape(type = circle).radius: Invalid value')
	})

	it('removes id fields from paths for Sentry grouping', () => {
		const error = new T.ValidationError('Test message', [
			'users',
			'(id = user123, name = Alice)',
			'email',
		])
		expect(error.message).toBe('At users(name = Alice).email: Test message')
	})

	it('handles paths starting with numbers', () => {
		const error = new T.ValidationError('Test message', [0, 'name'])
		expect(error.message).toBe('At 0.name: Test message')
	})

	it('handles empty paths', () => {
		const error = new T.ValidationError('Test message', [])
		expect(error.message).toBe('At null: Test message')
		expect(error.path).toEqual([])
	})

	it('formats multiline messages with proper indentation', () => {
		const error = new T.ValidationError('First line\nSecond line\nThird line', ['field'])
		expect(error.message).toBe('At field: First line\n  Second line\n  Third line')
	})
})

describe('ValidationError', () => {
	it('can be constructed with just a message', () => {
		const error = new T.ValidationError('Something went wrong')
		expect(error.message).toBe('At null: Something went wrong')
		expect(error.rawMessage).toBe('Something went wrong')
		expect(error.path).toEqual([])
		expect(error.name).toBe('ValidationError')
	})

	it('can be constructed with message and path', () => {
		const error = new T.ValidationError('Invalid value', ['users', 0, 'email'])
		expect(error.message).toBe('At users.0.email: Invalid value')
		expect(error.rawMessage).toBe('Invalid value')
		expect(error.path).toEqual(['users', 0, 'email'])
	})

	it('extends Error properly', () => {
		const error = new T.ValidationError('Test')
		expect(error instanceof Error).toBe(true)
		expect(error instanceof T.ValidationError).toBe(true)
	})
})

describe('Model validator', () => {
	it('adds model name to error paths', () => {
		const userModel = T.model(
			'User',
			T.object({
				id: T.string,
				name: T.string,
				age: T.number,
			})
		)

		expect(() =>
			userModel.validate({ id: 'user1', name: 'Alice', age: 'not a number' })
		).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At User.age: Expected number, got a string]`
		)
	})

	it('validates successfully with valid data', () => {
		const userModel = T.model(
			'User',
			T.object({
				id: T.string,
				name: T.string,
			})
		)

		const user = { id: 'user1', name: 'Alice' }
		expect(userModel.validate(user)).toBe(user)
	})

	it('works with performance optimization', () => {
		const userModel = T.model(
			'User',
			T.object({
				id: T.string,
				name: T.string,
			})
		)

		const user = { id: 'user1', name: 'Alice' }
		const validated = userModel.validate(user)

		const optimized = userModel.validateUsingKnownGoodVersion(validated, validated)
		expect(optimized).toBe(validated)
	})
})

describe('T.or function', () => {
	it('accepts values matching the first validator', () => {
		const stringOrNumber = T.or(T.string, T.number)
		expect(stringOrNumber.validate('hello')).toBe('hello')
		expect(stringOrNumber.validate('123')).toBe('123')
	})

	it('accepts values matching the second validator', () => {
		const stringOrNumber = T.or(T.string, T.number)
		expect(stringOrNumber.validate(42)).toBe(42)
		expect(stringOrNumber.validate(3.14)).toBe(3.14)
	})

	it('rejects values matching neither validator', () => {
		const stringOrNumber = T.or(T.string, T.number)
		expect(() => stringOrNumber.validate(true)).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At null: Expected number, got a boolean]`
		)
		expect(() => stringOrNumber.validate(null)).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At null: Expected number, got null]`
		)
	})

	it('returns the error from the second validator when both fail', () => {
		const validator = T.or(T.literal('red'), T.literal('blue'))
		expect(() => validator.validate('green')).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At null: Expected blue, got "green"]`
		)
	})

	it('works with complex validators', () => {
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

describe('Literal validators', () => {
	describe('T.literal', () => {
		it('accepts exact matching values', () => {
			expect(T.literal('hello').validate('hello')).toBe('hello')
			expect(T.literal(42).validate(42)).toBe(42)
			expect(T.literal(true).validate(true)).toBe(true)
		})

		it('rejects non-matching values', () => {
			expect(() => T.literal('hello').validate('world')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected hello, got "world"]`
			)
			expect(() => T.literal(42).validate(41)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected 42, got 41]`
			)
			expect(() => T.literal(true).validate(false)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected true, got false]`
			)
		})

		it('works with different types', () => {
			expect(() => T.literal('42').validate(42)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected 42, got 42]`
			)
			expect(() => T.literal(0).validate(false)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected 0, got false]`
			)
		})
	})

	describe('T.literalEnum', () => {
		it('accepts any of the provided literal values', () => {
			const theme = T.literalEnum('light', 'dark', 'auto')
			expect(theme.validate('light')).toBe('light')
			expect(theme.validate('dark')).toBe('dark')
			expect(theme.validate('auto')).toBe('auto')
		})

		it('rejects values not in the enum', () => {
			const theme = T.literalEnum('light', 'dark')
			expect(() => theme.validate('blue')).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected "light" or "dark", got blue]`
			)
		})

		it('works with different literal types', () => {
			const mixed = T.literalEnum('string', 42, true)
			expect(mixed.validate('string')).toBe('string')
			expect(mixed.validate(42)).toBe(42)
			expect(mixed.validate(true)).toBe(true)
		})

		it('rejects wrong types even if values seem similar', () => {
			const validator = T.literalEnum('42', 'true')
			expect(() => validator.validate(42)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected "42" or "true", got 42]`
			)
			expect(() => validator.validate(true)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected "42" or "true", got true]`
			)
		})
	})
})

describe('Performance optimized validation', () => {
	it('uses optimized path when available', () => {
		const validator = T.object({ name: T.string, count: T.number })
		const original = { name: 'test', count: 5 }
		const validated = validator.validate(original)

		// Should return the same reference when values are identical
		const optimized = validator.validateUsingKnownGoodVersion(validated, validated)
		expect(optimized).toBe(validated)
	})

	it('re-validates when values differ', () => {
		const validator = T.object({ name: T.string, count: T.number })
		const original = { name: 'test', count: 5 }
		const validated = validator.validate(original)

		const different = { name: 'test', count: 10 }
		const optimized = validator.validateUsingKnownGoodVersion(validated, different)
		expect(optimized).toBe(different)
		expect(optimized).not.toBe(validated)
	})

	it('throws errors for invalid values in optimized validation', () => {
		const validator = T.object({ name: T.string })
		const original = { name: 'test' }
		const validated = validator.validate(original)

		expect(() =>
			validator.validateUsingKnownGoodVersion(validated, { name: 123 })
		).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At name: Expected string, got a number]`
		)
	})

	it('falls back to regular validation when no optimized function is available', () => {
		// Create a validator without an optimized function
		const validator = new T.Validator<string>((value) => {
			if (typeof value !== 'string') throw new T.ValidationError('Expected string')
			return value
		})

		const original = 'test'
		const validated = validator.validate(original)

		// Should work but use regular validation
		expect(validator.validateUsingKnownGoodVersion(validated, 'different')).toBe('different')
		expect(() => validator.validateUsingKnownGoodVersion(validated, 123)).toThrow('Expected string')
	})
})

describe('Type guard methods', () => {
	describe('Validator.isValid', () => {
		it('returns true for valid values without throwing', () => {
			expect(T.string.isValid('hello')).toBe(true)
			expect(T.number.isValid(42)).toBe(true)
			expect(T.boolean.isValid(false)).toBe(true)
		})

		it('returns false for invalid values without throwing', () => {
			expect(T.string.isValid(123)).toBe(false)
			expect(T.number.isValid('not a number')).toBe(false)
			expect(T.boolean.isValid('not a boolean')).toBe(false)
		})

		it('works with complex validators', () => {
			const validator = T.object({ name: T.string, age: T.number })
			expect(validator.isValid({ name: 'Alice', age: 25 })).toBe(true)
			expect(validator.isValid({ name: 'Alice', age: 'not a number' })).toBe(false)
			expect(validator.isValid({ name: 123, age: 25 })).toBe(false)
			expect(validator.isValid('not an object')).toBe(false)
		})

		it('provides proper type narrowing', () => {
			function processValue(value: unknown) {
				if (T.string.isValid(value)) {
					// TypeScript should know value is string here
					return value.toUpperCase()
				}
				if (T.number.isValid(value)) {
					// TypeScript should know value is number here
					return value.toFixed(2)
				}
				return 'unknown type'
			}

			expect(processValue('hello')).toBe('HELLO')
			expect(processValue(3.14159)).toBe('3.14')
			expect(processValue(true)).toBe('unknown type')
		})
	})
})

describe('Edge cases for nullable() and optional()', () => {
	describe('nullable()', () => {
		it('accepts null and the base type', () => {
			const validator = T.string.nullable()
			expect(validator.validate(null)).toBe(null)
			expect(validator.validate('hello')).toBe('hello')
		})

		it('rejects undefined', () => {
			const validator = T.string.nullable()
			expect(() => validator.validate(undefined)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected string, got undefined]`
			)
		})

		it('rejects other invalid types', () => {
			const validator = T.string.nullable()
			expect(() => validator.validate(123)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected string, got a number]`
			)
		})

		it('works with performance optimization', () => {
			const validator = T.string.nullable()

			const str = 'test'
			const validated = validator.validate(str)
			expect(validator.validateUsingKnownGoodVersion(validated, validated)).toBe(validated)

			const nullValue = validator.validate(null)
			expect(validator.validateUsingKnownGoodVersion(nullValue, null)).toBe(null)

			// Should handle transitions between null and values
			expect(validator.validateUsingKnownGoodVersion(nullValue, 'new string')).toBe('new string')
			expect(validator.validateUsingKnownGoodVersion(str, null)).toBe(null)
		})
	})

	describe('optional()', () => {
		it('accepts undefined and the base type', () => {
			const validator = T.string.optional()
			expect(validator.validate(undefined)).toBe(undefined)
			expect(validator.validate('hello')).toBe('hello')
		})

		it('rejects null', () => {
			const validator = T.string.optional()
			expect(() => validator.validate(null)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected string, got null]`
			)
		})

		it('rejects other invalid types', () => {
			const validator = T.string.optional()
			expect(() => validator.validate(123)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected string, got a number]`
			)
		})

		it('works with performance optimization', () => {
			const validator = T.string.optional()

			const str = 'test'
			const validated = validator.validate(str)
			expect(validator.validateUsingKnownGoodVersion(validated, validated)).toBe(validated)

			const undefinedValue = validator.validate(undefined)
			expect(validator.validateUsingKnownGoodVersion(undefinedValue, undefined)).toBe(undefined)

			// Should handle transitions between undefined and values
			expect(validator.validateUsingKnownGoodVersion(undefinedValue, 'new string')).toBe(
				'new string'
			)
			expect(validator.validateUsingKnownGoodVersion(str, undefined)).toBe(undefined)
		})
	})

	describe('nullable().optional() chaining', () => {
		it('accepts null, undefined, and the base type', () => {
			const validator = T.string.nullable().optional()
			expect(validator.validate(null)).toBe(null)
			expect(validator.validate(undefined)).toBe(undefined)
			expect(validator.validate('hello')).toBe('hello')
		})

		it('rejects invalid types', () => {
			const validator = T.string.nullable().optional()
			expect(() => validator.validate(123)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected string, got a number]`
			)
		})
	})

	describe('optional().nullable() chaining', () => {
		it('accepts null, undefined, and the base type', () => {
			const validator = T.string.optional().nullable()
			expect(validator.validate(null)).toBe(null)
			expect(validator.validate(undefined)).toBe(undefined)
			expect(validator.validate('hello')).toBe('hello')
		})

		it('rejects invalid types', () => {
			const validator = T.string.optional().nullable()
			expect(() => validator.validate(123)).toThrowErrorMatchingInlineSnapshot(
				`[ValidationError: At null: Expected string, got a number]`
			)
		})
	})
})
