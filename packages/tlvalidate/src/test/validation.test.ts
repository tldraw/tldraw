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
		).toThrowErrorMatchingInlineSnapshot(`"At cow: Unexpected property"`)
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
		).toThrowErrorMatchingInlineSnapshot(`"At toad.name: Expected number, got a string"`)

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
		).toThrowErrorMatchingInlineSnapshot(`"At shape(id = abc123).y: Expected a number, got NaN"`)

		expect(() =>
			T.model(
				'shape',
				T.object({
					id: T.string,
					color: T.setEnum(new Set(['red', 'green', 'blue'])),
				})
			).validate({ id: 'abc13', color: 'rubbish' })
		).toThrowErrorMatchingInlineSnapshot(
			`"At shape(id = abc13).color: Expected \\"red\\" or \\"green\\" or \\"blue\\", got rubbish"`
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
			`"At animal.type: Expected one of \\"cat\\" or \\"dog\\", got \\"cow\\""`
		)

		expect(() =>
			nested.validate({ animal: { type: 'cat', meow: 'yes', id: 'abc123' } })
		).toThrowErrorMatchingInlineSnapshot(
			`"At animal(type = cat).meow: Expected boolean, got a string"`
		)

		expect(() =>
			T.model('animal', animalSchema).validate({ type: 'cat', moo: true, id: 'abc123' })
		).toThrowErrorMatchingInlineSnapshot(
			`"At animal(id = abc123, type = cat).meow: Expected boolean, got undefined"`
		)
	})
})

describe('T.refine', () => {
	it.todo('Refines a validator.')
	it.todo('Produces a type error if the refinement is not of the correct type.')
})

describe('T.check', () => {
	it.todo('Adds a check to a validator.')
})
