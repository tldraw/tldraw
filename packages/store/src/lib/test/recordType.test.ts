import { describe, expect, it, vi } from 'vitest'
import { BaseRecord, RecordId } from '../BaseRecord'
import { RecordType, assertIdType, createRecordType } from '../RecordType'

interface TestBook extends BaseRecord<'book', RecordId<TestBook>> {
	title: string
	author: string
	pages?: number
	isPublished?: boolean
	meta?: { isbn?: string; category?: string }
	ephemeralData?: string
}

interface MinimalRecord extends BaseRecord<'minimal', RecordId<MinimalRecord>> {
	requiredField: string
}

const TestBook = createRecordType<TestBook>('book', {
	validator: {
		validate: (record: any) => {
			if (!record || typeof record !== 'object') {
				throw new Error('Record must be an object')
			}
			if (!record.title || typeof record.title !== 'string') {
				throw new Error('title must be a string')
			}
			if (!record.author || typeof record.author !== 'string') {
				throw new Error('author must be a string')
			}
			return record as TestBook
		},
	},
	scope: 'document',
	ephemeralKeys: {
		title: false,
		author: false,
		pages: false,
		isPublished: false,
		meta: false,
		ephemeralData: true,
	},
}).withDefaultProperties(() => ({
	pages: 100,
	isPublished: false,
}))

const MinimalRecordType = createRecordType<MinimalRecord>('minimal', {
	scope: 'session',
})

describe('RecordType constructor', () => {
	it('should process ephemeral keys correctly', () => {
		const recordType = new RecordType<any, never>('test', {
			createDefaultProperties: () => ({}),
			ephemeralKeys: {
				key1: true,
				key2: false,
				key3: true,
			},
		})

		expect(recordType.ephemeralKeySet.has('key1')).toBe(true)
		expect(recordType.ephemeralKeySet.has('key2')).toBe(false)
		expect(recordType.ephemeralKeySet.has('key3')).toBe(true)
		expect(recordType.ephemeralKeySet.size).toBe(2)
	})
})

describe('create method', () => {
	it('should create record with default properties and generate unique IDs', () => {
		const book1 = TestBook.create({
			title: '1984',
			author: 'George Orwell',
		})
		const book2 = TestBook.create({ title: 'Book 2', author: 'Author' })

		expect(book1.title).toBe('1984')
		expect(book1.author).toBe('George Orwell')
		expect(book1.typeName).toBe('book')
		expect(book1.id).toMatch(/^book:/)
		expect(book1.pages).toBe(100) // default value
		expect(book1.isPublished).toBe(false) // default value

		// Test unique ID generation
		expect(book1.id).not.toBe(book2.id)
	})

	it('should use custom ID when provided', () => {
		const customId = TestBook.createId('custom')
		const book = TestBook.create({
			id: customId,
			title: 'Custom Book',
			author: 'Custom Author',
		})

		expect(book.id).toBe('book:custom')
	})

	it('should override defaults and ignore undefined properties', () => {
		const book = TestBook.create({
			title: '1984',
			author: 'George Orwell',
			pages: undefined, // should use default
			isPublished: true, // should override default
		})

		expect(book.pages).toBe(100) // default value used
		expect(book.isPublished).toBe(true) // override applied
	})
})

describe('clone method', () => {
	it('should create deep copy with new ID', () => {
		const original = TestBook.create({
			title: '1984',
			author: 'George Orwell',
			meta: { isbn: '978-0-452-28423-4' },
		})

		const cloned = TestBook.clone(original)

		expect(cloned.title).toBe(original.title)
		expect(cloned.meta?.isbn).toBe(original.meta?.isbn)
		expect(cloned.id).not.toBe(original.id)
		expect(cloned.id).toMatch(/^book:/)

		// Verify deep cloning
		original.meta!.isbn = 'modified'
		expect(cloned.meta?.isbn).toBe('978-0-452-28423-4')
	})
})

describe('createId method', () => {
	it('should create properly formatted IDs', () => {
		expect(TestBook.createId('custom')).toBe('book:custom')
		expect(TestBook.createId('')).toBe('book:')

		// Test unique ID generation
		const id1 = TestBook.createId()
		const id2 = TestBook.createId()
		expect(id1).toMatch(/^book:/)
		expect(id1).not.toBe(id2)
	})
})

describe('parseId method', () => {
	it('should extract unique part from valid IDs', () => {
		expect(TestBook.parseId('book:custom-id' as any)).toBe('custom-id')
		expect(TestBook.parseId('book:' as any)).toBe('')
		expect(TestBook.parseId('book:abc-123_xyz.test' as any)).toBe('abc-123_xyz.test')
	})

	it('should throw for invalid IDs', () => {
		expect(() => TestBook.parseId('author:123' as any)).toThrow(
			'ID "author:123" is not a valid ID for type "book"'
		)
		expect(() => TestBook.parseId('invalid' as any)).toThrow()
		expect(() => TestBook.parseId(':123' as any)).toThrow()
	})
})

describe('isInstance method', () => {
	it('should correctly identify record types', () => {
		const book = TestBook.create({ title: 'Test', author: 'Author' })
		const minimal = MinimalRecordType.create({ requiredField: 'test' })

		expect(TestBook.isInstance(book)).toBe(true)
		expect(TestBook.isInstance(minimal)).toBe(false)
		expect(TestBook.isInstance(undefined)).toBe(false)
		expect(TestBook.isInstance({ id: 'book:123', typeName: 'notbook' } as any)).toBe(false)
	})
})

describe('isId method', () => {
	it('should validate ID format correctly', () => {
		// Valid IDs
		expect(TestBook.isId('book:123')).toBe(true)
		expect(TestBook.isId('book:custom-id')).toBe(true)
		expect(TestBook.isId('book:')).toBe(true)

		// Invalid IDs
		expect(TestBook.isId('user:123')).toBe(false)
		expect(TestBook.isId('books:123')).toBe(false) // longer typename
		expect(TestBook.isId('Book:123')).toBe(false) // case sensitive
		expect(TestBook.isId('invalid')).toBe(false)
		expect(TestBook.isId('')).toBe(false)
		expect(TestBook.isId(undefined)).toBe(false)
	})
})

describe('withDefaultProperties method', () => {
	it('should extend RecordType with default properties', () => {
		interface ExtendedBook extends BaseRecord<'extended', RecordId<ExtendedBook>> {
			title: string
			author: string
		}

		const baseType = createRecordType<ExtendedBook>('extended', { scope: 'document' })
		const extendedType = baseType.withDefaultProperties(() => ({
			title: 'Default Title',
			author: 'Unknown Author',
		}))

		const book = extendedType.create({})
		const overridden = extendedType.create({ title: 'Custom Title' })

		expect(book.title).toBe('Default Title')
		expect(book.author).toBe('Unknown Author')
		expect(overridden.title).toBe('Custom Title')
		expect(overridden.author).toBe('Unknown Author') // default preserved
	})
})

describe('validate method', () => {
	it('should validate records and handle validation errors', () => {
		const validData = {
			id: 'book:123',
			typeName: 'book',
			title: 'Valid Book',
			author: 'Valid Author',
		}

		const result = TestBook.validate(validData)
		expect(result.title).toBe('Valid Book')

		// Test validation failure
		const invalidData = { id: 'book:123', typeName: 'book' }
		expect(() => TestBook.validate(invalidData)).toThrow('title must be a string')
	})

	it('should use optimized validation when available', () => {
		const mockValidator = {
			validate: vi.fn().mockReturnValue({ regular: true }),
			validateUsingKnownGoodVersion: vi.fn().mockReturnValue({ optimized: true }),
		}

		const recordType = new RecordType<any, never>('test', {
			createDefaultProperties: () => ({}),
			validator: mockValidator,
		})

		const recordBefore = { id: 'test:1', typeName: 'test' } as any
		const newRecord = { id: 'test:1', typeName: 'test', updated: true }

		// With recordBefore, should use optimized validation
		let result = recordType.validate(newRecord, recordBefore)
		expect(mockValidator.validateUsingKnownGoodVersion).toHaveBeenCalled()
		expect(result.optimized).toBe(true)

		// Without recordBefore, should use regular validation
		result = recordType.validate(newRecord)
		expect(mockValidator.validate).toHaveBeenCalled()
	})
})

describe('Record scopes and ephemeral keys', () => {
	it('should handle different record scopes', () => {
		const documentType = createRecordType<TestBook>('book', { scope: 'document' })
		const sessionType = createRecordType<MinimalRecord>('minimal', { scope: 'session' })
		const presenceType = createRecordType<MinimalRecord>('minimal', { scope: 'presence' })

		expect(documentType.scope).toBe('document')
		expect(sessionType.scope).toBe('session')
		expect(presenceType.scope).toBe('presence')
	})

	it('should track ephemeral keys correctly', () => {
		expect(TestBook.ephemeralKeySet.has('ephemeralData')).toBe(true)
		expect(TestBook.ephemeralKeySet.has('title')).toBe(false)
	})
})

describe('assertIdType function', () => {
	it('should validate ID types correctly', () => {
		// Valid IDs should not throw
		expect(() => assertIdType('book:123', TestBook)).not.toThrow()
		expect(() => assertIdType('book:', TestBook)).not.toThrow()

		// Invalid IDs should throw with descriptive messages
		expect(() => assertIdType('user:123', TestBook)).toThrow(
			'string "user:123" is not a valid book id'
		)
		expect(() => assertIdType(undefined, TestBook)).toThrow(
			'string undefined is not a valid book id'
		)
	})
})
