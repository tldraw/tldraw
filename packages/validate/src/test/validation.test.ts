import {
	arrayOfValidator,
	booleanValidator,
	literalValidator,
	modelValidator,
	numberValidator,
	objectValidator,
	setEnumValidator,
	stringValidator,
	unionValidator,
} from '../lib/validation'

describe('validations', () => {
	it('Returns referentially identical objects', () => {
		const validator = objectValidator({
			name: stringValidator,
			items: arrayOfValidator(stringValidator.nullable()),
		})

		const value = {
			name: 'toad',
			items: ['toad', 'berd', null, 'bot'],
		}

		expect(validator.validate(value)).toStrictEqual(value)
	})
	it('Rejects unknown object keys', () => {
		expect(() =>
			objectValidator({ moo: literalValidator('cow') }).validate({ moo: 'cow', cow: 'moo' })
		).toThrowErrorMatchingInlineSnapshot(`"At cow: Unexpected property"`)
	})
	it('Produces nice error messages', () => {
		expect(() =>
			objectValidator({
				toad: objectValidator({
					name: numberValidator,
					friends: arrayOfValidator(
						objectValidator({
							name: stringValidator,
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
			modelValidator(
				'shape',
				objectValidator({
					id: stringValidator,
					x: numberValidator,
					y: numberValidator,
				})
			).validate({
				id: 'abc123',
				x: 132,
				y: NaN,
			})
		).toThrowErrorMatchingInlineSnapshot(`"At shape(id = abc123).y: Expected a number, got NaN"`)

		expect(() =>
			modelValidator(
				'shape',
				objectValidator({
					id: stringValidator,
					color: setEnumValidator(new Set(['red', 'green', 'blue'])),
				})
			).validate({ id: 'abc13', color: 'rubbish' })
		).toThrowErrorMatchingInlineSnapshot(
			`"At shape(id = abc13).color: Expected \\"red\\" or \\"green\\" or \\"blue\\", got rubbish"`
		)
	})

	it('Understands unions & produces nice error messages', () => {
		const catSchema = objectValidator({
			type: literalValidator('cat'),
			id: stringValidator,
			meow: booleanValidator,
		})
		const dogSchema = objectValidator({
			type: literalValidator('dog'),
			id: stringValidator,
			bark: booleanValidator,
		})
		const animalSchema = unionValidator('type', {
			cat: catSchema,
			dog: dogSchema,
		})

		const nested = objectValidator({
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
			modelValidator('animal', animalSchema).validate({ type: 'cat', moo: true, id: 'abc123' })
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
