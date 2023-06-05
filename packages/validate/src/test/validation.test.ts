import {
	arrayOf,
	boolean,
	literal,
	model,
	number,
	object,
	setEnum,
	string,
	union,
} from '../lib/validation'

describe('validations', () => {
	it('Returns referentially identical objects', () => {
		const validator = object({
			name: string,
			items: arrayOf(string.nullable()),
		})

		const value = {
			name: 'toad',
			items: ['toad', 'berd', null, 'bot'],
		}

		expect(validator.validate(value)).toStrictEqual(value)
	})
	it('Rejects unknown object keys', () => {
		expect(() =>
			object({ moo: literal('cow') }).validate({ moo: 'cow', cow: 'moo' })
		).toThrowErrorMatchingInlineSnapshot(`"At cow: Unexpected property"`)
	})
	it('Produces nice error messages', () => {
		expect(() =>
			object({
				toad: object({
					name: number,
					friends: arrayOf(
						object({
							name: string,
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
			model(
				'shape',
				object({
					id: string,
					x: number,
					y: number,
				})
			).validate({
				id: 'abc123',
				x: 132,
				y: NaN,
			})
		).toThrowErrorMatchingInlineSnapshot(`"At shape(id = abc123).y: Expected a number, got NaN"`)

		expect(() =>
			model(
				'shape',
				object({
					id: string,
					color: setEnum(new Set(['red', 'green', 'blue'])),
				})
			).validate({ id: 'abc13', color: 'rubbish' })
		).toThrowErrorMatchingInlineSnapshot(
			`"At shape(id = abc13).color: Expected \\"red\\" or \\"green\\" or \\"blue\\", got rubbish"`
		)
	})

	it('Understands unions & produces nice error messages', () => {
		const catSchema = object({
			type: literal('cat'),
			id: string,
			meow: boolean,
		})
		const dogSchema = object({
			type: literal('dog'),
			id: string,
			bark: boolean,
		})
		const animalSchema = union('type', {
			cat: catSchema,
			dog: dogSchema,
		})

		const nested = object({
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
			model('animal', animalSchema).validate({ type: 'cat', moo: true, id: 'abc123' })
		).toThrowErrorMatchingInlineSnapshot(
			`"At animal(id = abc123, type = cat).meow: Expected boolean, got undefined"`
		)
	})
})

describe('refine', () => {
	it.todo('Refines a validator.')
	it.todo('Produces a type error if the refinement is not of the correct type.')
})

describe('check', () => {
	it.todo('Adds a check to a validator.')
})
