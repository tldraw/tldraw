import * as T from '../lib/validation'
import { ValidationError } from '../lib/validation'

describe('§2 Validation errors and paths', () => {
	it('[E1] exposes name, rawMessage, and path', () => {
		const error = new ValidationError('msg', ['a', 0, 'b'])
		expect(error).toBeInstanceOf(Error)
		expect(error.name).toBe('ValidationError')
		expect(error.rawMessage).toBe('msg')
		expect(error.path).toEqual(['a', 0, 'b'])

		const noPath = new ValidationError('msg')
		expect(noPath.path).toEqual([])
	})

	it('[E2] prefixes the formatted path onto the message when the path is non-empty', () => {
		expect(new ValidationError('msg', ['a', 0, 'b']).message).toBe('At a.0.b: msg')
	})

	it('[E3] joins string segments with dots and renders numeric indices', () => {
		const validator = T.object({
			toad: T.object({
				friends: T.arrayOf(T.object({ name: T.string })),
			}),
		})

		expect(() =>
			validator.validate({ toad: { friends: [{ name: 'bird' }, { name: 1235 }] } })
		).toThrow('At toad.friends.1.name: Expected string, got a number')
	})

	it('[E4] appends parenthesized segments without a dot', () => {
		const animal = T.union('type', {
			cat: T.object({ type: T.literal('cat'), id: T.string, meow: T.boolean }),
			dog: T.object({ type: T.literal('dog'), id: T.string, bark: T.boolean }),
		})
		const nested = T.object({ animal })

		expect(() => nested.validate({ animal: { type: 'cat', meow: 'yes', id: 'abc123' } })).toThrow(
			'At animal(type = cat).meow: Expected boolean, got a string'
		)
	})

	it('[E4] merges consecutive parenthesized segments into one group', () => {
		const validator = T.union('type', {
			cat: T.object({ type: T.literal('cat'), n: T.number }).check('named', () => {
				throw new ValidationError('boom')
			}),
		})

		expect(() => validator.validate({ type: 'cat', n: 1 })).toThrow(
			'At (type = cat, check named): boom'
		)
	})

	it('[E5] strips id = … content from formatted paths', () => {
		const validator = T.object({
			thing: T.union('id', {
				foo: T.object({ id: T.literal('foo'), n: T.number }),
			}),
		})

		expect(() => validator.validate({ thing: { id: 'foo', n: 'bad' } })).toThrow(
			'At thing().n: Expected number, got a string'
		)
	})

	it('[E6] indents every line after the first in multi-line messages', () => {
		const validator = T.object({
			x: T.number.check(() => {
				throw new ValidationError('line1\nline2\nline3')
			}),
		})

		expect(() => validator.validate({ x: 1 })).toThrow('At x: line1\n  line2\n  line3')
	})

	it('[E7] accumulates the path outside-in while preserving rawMessage', () => {
		const validator = T.object({
			users: T.arrayOf(T.object({ email: T.string })),
		})

		try {
			validator.validate({ users: [{ email: 'a@b.com' }, { email: 42 }] })
			throw new Error('should have thrown')
		} catch (error) {
			expect(error).toBeInstanceOf(ValidationError)
			expect((error as ValidationError).rawMessage).toBe('Expected string, got a number')
			expect((error as ValidationError).path).toEqual(['users', 1, 'email'])
			expect((error as ValidationError).message).toBe(
				'At users.1.email: Expected string, got a number'
			)
		}
	})

	it('[E7] wraps non-ValidationError exceptions using their toString', () => {
		const validator = T.object({
			x: T.number.check(() => {
				throw new Error('plain')
			}),
		})

		try {
			validator.validate({ x: 1 })
			throw new Error('should have thrown')
		} catch (error) {
			expect(error).toBeInstanceOf(ValidationError)
			expect((error as ValidationError).rawMessage).toBe('Error: plain')
			expect((error as ValidationError).path).toEqual(['x'])
		}
	})
})
