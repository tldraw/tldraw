import { describe, expect, it, vi } from 'vitest'
import { BaseRecord, RecordId } from '../BaseRecord'
import { RecordType, assertIdType, createRecordType } from '../RecordType'
import { testSchemaV1 } from './testSchema.v1'

// Test record interfaces for comprehensive testing
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

interface ExtendedBook extends BaseRecord<'extendedBook', RecordId<ExtendedBook>> {
	title: string
	author: string
	pages?: number
	isPublished?: boolean
	meta?: { isbn?: string; category?: string }
	ephemeralData?: string
}

interface OriginalBook extends BaseRecord<'originalBook', RecordId<OriginalBook>> {
	title: string
	author: string
	pages?: number
	isPublished?: boolean
	meta?: { isbn?: string; category?: string }
	ephemeralData?: string
}

interface OverrideBook extends BaseRecord<'overrideBook', RecordId<OverrideBook>> {
	title: string
	author: string
	pages?: number
	isPublished?: boolean
	meta?: { isbn?: string; category?: string }
	ephemeralData?: string
}

interface DefaultScopeBook extends BaseRecord<'defaultScopeBook', RecordId<DefaultScopeBook>> {
	title: string
	author: string
	pages?: number
	isPublished?: boolean
	meta?: { isbn?: string; category?: string }
	ephemeralData?: string
}

interface ConfiguredBook extends BaseRecord<'configuredType', RecordId<ConfiguredBook>> {
	title: string
	author: string
	pages?: number
	isPublished?: boolean
	meta?: { isbn?: string; category?: string }
	ephemeralData?: string
}

interface EmptyDefaults extends BaseRecord<'emptyDefaults', RecordId<EmptyDefaults>> {
	requiredField: string
}

interface SessionBook extends BaseRecord<'sessionBook', RecordId<SessionBook>> {
	title: string
	author: string
	pages?: number
	isPublished?: boolean
	meta?: { isbn?: string; category?: string }
	ephemeralData?: string
}

interface PresenceBook extends BaseRecord<'presenceBook', RecordId<PresenceBook>> {
	title: string
	author: string
	pages?: number
	isPublished?: boolean
	meta?: { isbn?: string; category?: string }
	ephemeralData?: string
}

// Create test record types with different configurations
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

const SessionRecordType = createRecordType<SessionBook>('sessionBook', {
	scope: 'session',
}).withDefaultProperties(() => ({
	title: 'Session Book',
	author: 'Session Author',
}))

const PresenceRecordType = createRecordType<PresenceBook>('presenceBook', {
	scope: 'presence',
}).withDefaultProperties(() => ({
	title: 'Presence Book',
	author: 'Presence Author',
}))

describe('RecordType constructor', () => {
	it('should create a RecordType with default properties', () => {
		const recordType = new RecordType<any, never>('test', {
			createDefaultProperties: () => ({ value: 'default' }),
		})

		expect(recordType.typeName).toBe('test')
		expect(recordType.scope).toBe('document') // default scope
		expect((recordType.createDefaultProperties() as any).value).toBe('default')
		expect(recordType.ephemeralKeySet.size).toBe(0)
	})

	it('should accept custom scope', () => {
		const recordType = new RecordType<any, never>('test', {
			createDefaultProperties: () => ({}),
			scope: 'session',
		})

		expect(recordType.scope).toBe('session')
	})

	it('should accept custom validator', () => {
		const mockValidator = {
			validate: vi.fn().mockReturnValue({ id: 'test:1', typeName: 'test' }),
		}
		const recordType = new RecordType<any, never>('test', {
			createDefaultProperties: () => ({}),
			validator: mockValidator,
		})

		expect(recordType.validator).toBe(mockValidator)
	})

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

	it('should create empty ephemeral key set if no ephemeral keys provided', () => {
		const recordType = new RecordType<any, never>('test', {
			createDefaultProperties: () => ({}),
		})

		expect(recordType.ephemeralKeySet.size).toBe(0)
	})
})

describe('create method', () => {
	it('should create a record with provided properties', () => {
		const book = TestBook.create({
			title: '1984',
			author: 'George Orwell',
		})

		expect(book.title).toBe('1984')
		expect(book.author).toBe('George Orwell')
		expect(book.typeName).toBe('book')
		expect(book.id).toMatch(/^book:/)
		expect(book.pages).toBe(100) // default value
		expect(book.isPublished).toBe(false) // default value
	})

	it('should generate unique IDs when not provided', () => {
		const book1 = TestBook.create({ title: 'Book 1', author: 'Author' })
		const book2 = TestBook.create({ title: 'Book 2', author: 'Author' })

		expect(book1.id).not.toBe(book2.id)
		expect(book1.id).toMatch(/^book:/)
		expect(book2.id).toMatch(/^book:/)
	})

	it('should use provided ID when given', () => {
		const customId = TestBook.createId('custom')
		const book = TestBook.create({
			id: customId,
			title: 'Custom Book',
			author: 'Custom Author',
		})

		expect(book.id).toBe(customId)
		expect(book.id).toBe('book:custom')
	})

	it('should override default properties with provided values', () => {
		const book = TestBook.create({
			title: '1984',
			author: 'George Orwell',
			pages: 328,
			isPublished: true,
		})

		expect(book.pages).toBe(328)
		expect(book.isPublished).toBe(true)
	})

	it('should ignore undefined properties', () => {
		const book = TestBook.create({
			title: '1984',
			author: 'George Orwell',
			pages: undefined,
		})

		expect(book.pages).toBe(100) // default value, not undefined
	})

	it('should handle complex nested properties', () => {
		const book = TestBook.create({
			title: '1984',
			author: 'George Orwell',
			meta: { isbn: '978-0-452-28423-4', category: 'dystopian' },
		})

		expect(book.meta?.isbn).toBe('978-0-452-28423-4')
		expect(book.meta?.category).toBe('dystopian')
	})
})

describe('clone method', () => {
	it('should create a deep copy with a new ID', () => {
		const original = TestBook.create({
			title: '1984',
			author: 'George Orwell',
			meta: { isbn: '978-0-452-28423-4' },
		})

		const cloned = TestBook.clone(original)

		expect(cloned.title).toBe(original.title)
		expect(cloned.author).toBe(original.author)
		expect(cloned.meta?.isbn).toBe(original.meta?.isbn)
		expect(cloned.id).not.toBe(original.id)
		expect(cloned.id).toMatch(/^book:/)
		expect(cloned.typeName).toBe(original.typeName)
	})

	it('should perform deep cloning of nested objects', () => {
		const original = TestBook.create({
			title: '1984',
			author: 'George Orwell',
			meta: { isbn: '978-0-452-28423-4' },
		})

		const cloned = TestBook.clone(original)

		// Modify the original's meta
		original.meta!.isbn = 'modified'

		// Cloned should not be affected
		expect(cloned.meta?.isbn).toBe('978-0-452-28423-4')
	})
})

describe('createId method', () => {
	it('should prepend the typename and a colon', () => {
		expect(testSchemaV1.types.user.createId('123')).toBe('user:123')
		expect(testSchemaV1.types.shape.createId('xyz')).toBe('shape:xyz')
		expect(TestBook.createId('custom')).toBe('book:custom')
	})

	it('should generate unique ID when no custom part provided', () => {
		const id1 = TestBook.createId()
		const id2 = TestBook.createId()

		expect(id1).toMatch(/^book:/)
		expect(id2).toMatch(/^book:/)
		expect(id1).not.toBe(id2)
	})

	it('should accept empty string as custom part', () => {
		const id = TestBook.createId('')
		expect(id).toBe('book:')
	})
})

describe('parseId method', () => {
	it('should return the part after the colon', () => {
		expect(testSchemaV1.types.user.parseId('user:123' as any)).toBe('123')
		expect(testSchemaV1.types.shape.parseId('shape:xyz' as any)).toBe('xyz')
		expect(TestBook.parseId('book:custom-id' as any)).toBe('custom-id')
	})

	it('should handle empty unique part', () => {
		expect(TestBook.parseId('book:' as any)).toBe('')
	})

	it('should handle complex unique parts with special characters', () => {
		expect(TestBook.parseId('book:abc-123_xyz.test' as any)).toBe('abc-123_xyz.test')
	})

	it('should throw if the typename does not match', () => {
		expect(() => testSchemaV1.types.user.parseId('shape:123' as any)).toThrow()
		expect(() => testSchemaV1.types.shape.parseId('user:xyz' as any)).toThrow()
		expect(() => TestBook.parseId('author:123' as any)).toThrow(
			'ID "author:123" is not a valid ID for type "book"'
		)
	})

	it('should throw for invalid ID formats', () => {
		expect(() => TestBook.parseId('invalid' as any)).toThrow()
		expect(() => TestBook.parseId('book' as any)).toThrow()
		expect(() => TestBook.parseId(':123' as any)).toThrow()
	})
})

describe('isInstance method', () => {
	it('should return true for records of the correct type', () => {
		const book = TestBook.create({ title: 'Test', author: 'Author' })
		expect(TestBook.isInstance(book)).toBe(true)
	})

	it('should return false for records of different types', () => {
		const book = TestBook.create({ title: 'Test', author: 'Author' })
		const minimal = MinimalRecordType.create({ requiredField: 'test' })

		expect(TestBook.isInstance(minimal)).toBe(false)
		expect(MinimalRecordType.isInstance(book)).toBe(false)
	})

	it('should return false for undefined', () => {
		expect(TestBook.isInstance(undefined)).toBe(false)
	})

	it('should return false for objects without typeName', () => {
		const fakeRecord = { id: 'book:123', title: 'Test' }
		expect(TestBook.isInstance(fakeRecord as any)).toBe(false)
	})

	it('should return false for objects with wrong typeName', () => {
		const fakeRecord = { id: 'book:123', typeName: 'notbook', title: 'Test' }
		expect(TestBook.isInstance(fakeRecord as any)).toBe(false)
	})
})

describe('isId method', () => {
	it('should return true for valid IDs of the correct type', () => {
		expect(TestBook.isId('book:123')).toBe(true)
		expect(TestBook.isId('book:custom-id')).toBe(true)
		expect(TestBook.isId('book:')).toBe(true)
	})

	it('should return false for IDs of different types', () => {
		expect(TestBook.isId('user:123')).toBe(false)
		expect(TestBook.isId('shape:xyz')).toBe(false)
		expect(TestBook.isId('notbook:123')).toBe(false)
	})

	it('should return false for invalid ID formats', () => {
		expect(TestBook.isId('invalid')).toBe(false)
		expect(TestBook.isId('book')).toBe(false)
		expect(TestBook.isId(':123')).toBe(false)
		expect(TestBook.isId('')).toBe(false)
		expect(TestBook.isId('123:book')).toBe(false)
	})

	it('should return false for undefined and null', () => {
		expect(TestBook.isId(undefined)).toBe(false)
		expect(TestBook.isId(null as any)).toBe(false)
	})

	it('should handle edge cases with similar typenames', () => {
		expect(TestBook.isId('books:123')).toBe(false) // longer typename
		expect(TestBook.isId('boo:123')).toBe(false) // shorter typename
		expect(TestBook.isId('Book:123')).toBe(false) // different case
	})
})

describe('withDefaultProperties method', () => {
	it('should create a new RecordType with extended default properties', () => {
		const baseType = createRecordType<ExtendedBook>('extendedBook', { scope: 'document' })
		const extendedType = baseType.withDefaultProperties(() => ({
			title: 'Default Title',
			author: 'Unknown Author',
		}))

		const book = extendedType.create({})

		expect(book.title).toBe('Default Title')
		expect(book.author).toBe('Unknown Author')
		expect(book.typeName).toBe('extendedBook')
	})

	it('should preserve original RecordType configuration', () => {
		const original = createRecordType<OriginalBook>('originalBook', {
			scope: 'session',
			validator: { validate: (r) => r as OriginalBook },
			ephemeralKeys: {
				title: false,
				author: false,
				pages: false,
				isPublished: false,
				meta: false,
				ephemeralData: true,
			},
		})

		const extended = original.withDefaultProperties(() => ({
			title: 'Default',
			author: 'Author',
		}))

		expect(extended.scope).toBe('session')
		expect(extended.validator).toBe(original.validator)
		expect(extended.ephemeralKeys).toBe(original.ephemeralKeys)
		expect(extended.typeName).toBe(original.typeName)
	})

	it('should allow overriding properties when creating records', () => {
		const type = createRecordType<OverrideBook>('overrideBook', {
			scope: 'document',
		}).withDefaultProperties(() => ({
			title: 'Default Title',
			author: 'Default Author',
			pages: 200,
		}))

		const book = type.create({
			title: 'Custom Title',
			pages: 300,
		})

		expect(book.title).toBe('Custom Title')
		expect(book.author).toBe('Default Author')
		expect(book.pages).toBe(300)
	})
})

describe('validate method', () => {
	it('should validate records using the configured validator', () => {
		const validData = {
			id: 'book:123',
			typeName: 'book',
			title: 'Valid Book',
			author: 'Valid Author',
		}

		const result = TestBook.validate(validData)
		expect(result.title).toBe('Valid Book')
		expect(result.author).toBe('Valid Author')
	})

	it('should throw for invalid records', () => {
		const invalidData = {
			id: 'book:123',
			typeName: 'book',
			// missing required fields
		}

		expect(() => TestBook.validate(invalidData)).toThrow('title must be a string')
	})

	it('should use optimized validation when recordBefore is provided', () => {
		const mockValidator = {
			validate: vi.fn().mockReturnValue({ valid: true }),
			validateUsingKnownGoodVersion: vi.fn().mockReturnValue({ optimized: true }),
		}

		const recordType = new RecordType<any, never>('test', {
			createDefaultProperties: () => ({}),
			validator: mockValidator,
		})

		const recordBefore = { id: 'test:1', typeName: 'test' } as any
		const newRecord = { id: 'test:1', typeName: 'test', updated: true }

		const result = recordType.validate(newRecord, recordBefore)

		expect(mockValidator.validateUsingKnownGoodVersion).toHaveBeenCalledWith(
			recordBefore,
			newRecord
		)
		expect(mockValidator.validate).not.toHaveBeenCalled()
		expect(result.optimized).toBe(true)
	})

	it('should fall back to regular validation if optimized version not available', () => {
		const mockValidator = {
			validate: vi.fn().mockReturnValue({ regular: true }),
		}

		const recordType = new RecordType<any, never>('test', {
			createDefaultProperties: () => ({}),
			validator: mockValidator,
		})

		const recordBefore = { id: 'test:1', typeName: 'test' } as any
		const newRecord = { id: 'test:1', typeName: 'test', updated: true }

		const result = recordType.validate(newRecord, recordBefore)

		expect(mockValidator.validate).toHaveBeenCalledWith(newRecord)
		expect(result.regular).toBe(true)
	})
})

describe('Record scopes', () => {
	it('should create document scope records by default', () => {
		const defaultType = createRecordType<DefaultScopeBook>('defaultScopeBook', {
			scope: 'document',
		})
		expect(defaultType.scope).toBe('document')
	})

	it('should create session scope records when specified', () => {
		expect(SessionRecordType.scope).toBe('session')
	})

	it('should create presence scope records when specified', () => {
		expect(PresenceRecordType.scope).toBe('presence')
	})
})

describe('Ephemeral keys handling', () => {
	it('should track ephemeral keys correctly', () => {
		expect(TestBook.ephemeralKeySet.has('ephemeralData')).toBe(true)
		expect(TestBook.ephemeralKeySet.has('title')).toBe(false)
		expect(TestBook.ephemeralKeySet.has('author')).toBe(false)
	})

	it('should preserve ephemeral keys configuration', () => {
		expect(TestBook.ephemeralKeys?.ephemeralData).toBe(true)
	})
})

describe('createRecordType function', () => {
	it('should create a RecordType with empty default properties', () => {
		const type = createRecordType<EmptyDefaults>('emptyDefaults', {
			scope: 'document',
		})

		// Should require all non-id/typeName fields
		const record = type.create({ requiredField: 'test' })
		expect(record.requiredField).toBe('test')
		expect(record.typeName).toBe('emptyDefaults')
	})

	it('should accept all configuration options', () => {
		const validator = { validate: (r: any) => r }
		const type = createRecordType<ConfiguredBook>('configuredType', {
			validator,
			scope: 'presence',
			ephemeralKeys: {
				title: false,
				author: false,
				pages: false,
				isPublished: false,
				meta: false,
				ephemeralData: true,
			},
		})

		expect(type.validator).toBe(validator)
		expect(type.scope).toBe('presence')
		expect(type.ephemeralKeys?.ephemeralData).toBe(true)
	})
})

describe('assertIdType function', () => {
	it('should not throw for valid IDs', () => {
		expect(() => assertIdType('book:123', TestBook)).not.toThrow()
		expect(() => assertIdType('book:', TestBook)).not.toThrow()
	})

	it('should throw for invalid IDs', () => {
		expect(() => assertIdType('user:123', TestBook)).toThrow(
			'string "user:123" is not a valid book id'
		)
		expect(() => assertIdType('invalid', TestBook)).toThrow(
			'string "invalid" is not a valid book id'
		)
	})

	it('should throw for undefined or empty strings', () => {
		expect(() => assertIdType(undefined, TestBook)).toThrow(
			'string undefined is not a valid book id'
		)
		expect(() => assertIdType('', TestBook)).toThrow('string "" is not a valid book id')
	})
})
