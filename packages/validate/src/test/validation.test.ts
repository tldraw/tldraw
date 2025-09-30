import * as T from '../lib/validation'
import { ValidationError } from '../lib/validation'

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
	it('Refines a validator.', () => {
		const stringToNumber = T.string.refine((str) => parseInt(str, 10))
		const originalEnv = process.env.NODE_ENV
		process.env.NODE_ENV = 'production'
		expect(stringToNumber.validate('42')).toBe(42)
		process.env.NODE_ENV = originalEnv

		const prefixedString = T.string.refine((str) =>
			str.startsWith('prefix:') ? str : `prefix:${str}`
		)
		process.env.NODE_ENV = 'production'
		expect(prefixedString.validate('test')).toBe('prefix:test')
		expect(prefixedString.validate('prefix:existing')).toBe('prefix:existing')
		process.env.NODE_ENV = originalEnv
	})

	it('Produces a type error if the refinement is not of the correct type.', () => {
		const stringToNumber = T.string.refine((str) => {
			const num = parseInt(str, 10)
			if (isNaN(num)) {
				throw new ValidationError('Invalid number format')
			}
			return num
		})

		expect(() => stringToNumber.validate('not-a-number')).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At null: Invalid number format]`
		)
	})
})

describe('T.check', () => {
	it('Adds a check to a validator.', () => {
		const evenNumber = T.number.check((value) => {
			if (value % 2 !== 0) {
				throw new ValidationError('Expected even number')
			}
		})

		expect(evenNumber.validate(4)).toBe(4)
		expect(evenNumber.validate(0)).toBe(0)
		expect(() => evenNumber.validate(3)).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At null: Expected even number]`
		)

		const namedCheck = T.number.check('positive', (value) => {
			if (value <= 0) {
				throw new ValidationError('Must be positive')
			}
		})

		expect(namedCheck.validate(5)).toBe(5)
		expect(() => namedCheck.validate(-1)).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At (check positive): Must be positive]`
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
		expect(() => T.indexKey.validate('a00')).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At null: Expected an index key, got "a00"]`
		)
		expect(() => T.indexKey.validate('')).toThrowErrorMatchingInlineSnapshot(
			`[ValidationError: At null: Expected an index key, got ""]`
		)
	})
})
