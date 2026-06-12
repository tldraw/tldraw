import { describe, expect, it } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { assertIdType, createRecordType, RecordType } from './RecordType'

// Tests for SPEC.md §2 (records) and §3 (RecordType).
// Rule IDs like [RT2] in test names refer to that document.

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
	living: boolean
	age: number
}

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
}

const Author = createRecordType<Author>('author', { scope: 'document' }).withDefaultProperties(
	() => ({ living: true, age: 35 })
)

const Book = createRecordType<Book>('book', { scope: 'document' })

describe('creating record types (RT)', () => {
	it('[RT1] createRecordType uses the given scope and defaults to pass-through validation', () => {
		const Session = createRecordType('session', { scope: 'session' })
		expect(Session.scope).toBe('session')

		const anything = { id: 'session:1', typeName: 'session', whatever: NaN }
		expect(Session.validator.validate(anything)).toBe(anything)
	})

	it('[RT1] the RecordType constructor defaults scope to document', () => {
		const type = new RecordType<Book, never>('book', {
			createDefaultProperties: () => ({}) as any,
		})
		expect(type.scope).toBe('document')
	})

	it('[RT1] createRecordType uses the given validator', () => {
		const validator = {
			validate: (r: unknown) => {
				if ((r as Book).title === 'invalid') throw new Error('bad')
				return r as Book
			},
		}
		const Strict = createRecordType<Book>('book', { scope: 'document', validator })
		expect(() => Strict.validate({ title: 'invalid' })).toThrow('bad')
		const ok = { id: 'book:1', typeName: 'book', title: 'fine' }
		expect(Strict.validate(ok)).toBe(ok)
	})

	it('[RT9] ephemeralKeySet contains exactly the keys mapped to true', () => {
		const WithEphemeral = createRecordType<Author>('author', {
			scope: 'document',
			ephemeralKeys: { name: false, living: true, age: true },
		})
		expect(WithEphemeral.ephemeralKeySet).toEqual(new Set(['living', 'age']))

		expect(Author.ephemeralKeySet).toEqual(new Set())
	})
})

describe('creating records (RT)', () => {
	it('[RT2] create merges defaults with the given props', () => {
		const author = Author.create({ name: 'Le Guin' })
		expect(author).toEqual({
			id: author.id,
			typeName: 'author',
			name: 'Le Guin',
			living: true,
			age: 35,
		})

		const dead = Author.create({ name: 'Tolstoy', living: false })
		expect(dead.living).toBe(false)
	})

	it('[RT2] undefined prop values do not override defaults', () => {
		const author = Author.create({ name: 'Le Guin', living: undefined })
		expect(author.living).toBe(true)
	})

	it('[RT3] create uses the given id, else generates one', () => {
		const id = Author.createId('ursula')
		expect(Author.create({ name: 'Le Guin', id }).id).toBe(id)

		const generated = Author.create({ name: 'Le Guin' })
		expect(generated.id).toMatch(/^author:/)
	})

	it('[R2] [RT3] createId returns typeName:uniquePart, honoring a custom part', () => {
		expect(Author.createId('123')).toBe('author:123')
		expect(Book.createId('xyz')).toBe('book:xyz')

		const a = Author.createId()
		const b = Author.createId()
		expect(a).toMatch(/^author:/)
		expect(a).not.toBe(b)
	})

	it('[RT4] clone deep-clones the record and assigns a fresh id', () => {
		const Nested = createRecordType<Book & { props: { tags: string[] } }>('book', {
			scope: 'document',
		})
		const original = Nested.create({ title: '1984', props: { tags: ['dystopia'] } })
		const copy = Nested.clone(original)

		expect(copy.id).not.toBe(original.id)
		expect(copy.title).toBe(original.title)
		expect(copy.props).toEqual(original.props)
		expect(copy.props).not.toBe(original.props)
	})
})

describe('ids and type guards (RT)', () => {
	it('[RT5] parseId returns the part after the colon and throws for other types', () => {
		expect(Author.parseId('author:123' as any)).toBe('123')
		expect(Book.parseId('book:xyz' as any)).toBe('xyz')

		expect(() => Author.parseId('book:123' as any)).toThrow()
		expect(() => Book.parseId('author:xyz' as any)).toThrow()
	})

	it('[RT5] isId is true exactly for ids starting with typeName:', () => {
		expect(Author.isId('author:123')).toBe(true)
		expect(Author.isId('book:123')).toBe(false)
		expect(Author.isId('author')).toBe(false)
		expect(Author.isId('authors:123')).toBe(false)
		expect(Author.isId('')).toBe(false)
		expect(Author.isId(undefined)).toBe(false)
	})

	it('[RT5] isInstance checks the typeName', () => {
		const author = Author.create({ name: 'Le Guin' })
		const book = Book.create({ title: '1984' })

		expect(Author.isInstance(author)).toBe(true)
		expect(Author.isInstance(book)).toBe(false)
		expect(Author.isInstance(undefined)).toBe(false)
	})

	it('[RT6] assertIdType throws for invalid ids and passes for valid ones', () => {
		expect(() => assertIdType(Author.createId('ok'), Author)).not.toThrow()

		expect(() => assertIdType(undefined, Author)).toThrow()
		expect(() => assertIdType('', Author)).toThrow()
		expect(() => assertIdType('book:123', Author)).toThrow()
	})
})

describe('extending and validating (RT)', () => {
	it('[RT7] withDefaultProperties keeps the type name, validator, scope, and ephemeral keys', () => {
		const validator = { validate: (r: unknown) => r as Author }
		const base = createRecordType<Author>('author', {
			scope: 'presence',
			validator,
			ephemeralKeys: { name: false, living: false, age: true },
		})
		const extended = base.withDefaultProperties(() => ({ living: false }))

		expect(extended.typeName).toBe('author')
		expect(extended.scope).toBe('presence')
		expect(extended.validator).toBe(validator)
		expect(extended.ephemeralKeys).toBe(base.ephemeralKeys)
		expect(extended.ephemeralKeySet).toEqual(new Set(['age']))

		const author = extended.create({ name: 'Woolf', age: 59 })
		expect(author.living).toBe(false)
	})

	it('[RT8] validate uses validateUsingKnownGoodVersion when a previous record is given', () => {
		const calls: string[] = []
		const Tracked = createRecordType<Book>('book', {
			scope: 'document',
			validator: {
				validate: (r) => {
					calls.push('validate')
					return r as Book
				},
				validateUsingKnownGoodVersion: (_prev, r) => {
					calls.push('validateUsingKnownGoodVersion')
					return r as Book
				},
			},
		})
		const book = Tracked.create({ title: '1984' })

		Tracked.validate({ ...book, title: 'Animal Farm' })
		expect(calls).toEqual(['validate'])

		Tracked.validate({ ...book, title: 'Animal Farm' }, book)
		expect(calls).toEqual(['validate', 'validateUsingKnownGoodVersion'])
	})

	it('[RT8] validate falls back to validate when validateUsingKnownGoodVersion is absent', () => {
		const calls: string[] = []
		const Plain = createRecordType<Book>('book', {
			scope: 'document',
			validator: {
				validate: (r) => {
					calls.push('validate')
					return r as Book
				},
			},
		})
		const book = Plain.create({ title: '1984' })
		Plain.validate({ ...book }, book)
		expect(calls).toEqual(['validate'])
	})
})
