import { describe, expect, it, vi } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { createRecordType } from './RecordType'
import { Store } from './Store'
import { StoreSchema } from './StoreSchema'
import { createMigrationSequence } from './migrate'

// Test record types
interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	author: string
	publishedYear: number
	genre?: string
	inStock?: boolean
}

const Book = createRecordType<Book>('book', {
	validator: { validate: (book) => book as Book },
	scope: 'document',
}).withDefaultProperties(() => ({
	inStock: true,
	publishedYear: 2023,
}))

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
	birthYear: number
	isAlive?: boolean
}

const Author = createRecordType<Author>('author', {
	validator: { validate: (author) => author as Author },
	scope: 'document',
}).withDefaultProperties(() => ({
	isAlive: true,
}))

describe('StoreSchema', () => {
	describe('create', () => {
		it('validates migration dependencies during creation', () => {
			const invalidMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.book',
				sequence: [
					{
						id: 'com.tldraw.book/1',
						scope: 'record',
						dependsOn: ['com.tldraw.book/999'],
						up: (record: any) => record,
					},
				],
			})

			expect(() => {
				StoreSchema.create({ book: Book }, { migrations: [invalidMigrations] })
			}).toThrow()
		})

		it('prevents duplicate migration sequence IDs', () => {
			const migration1 = createMigrationSequence({
				sequenceId: 'com.tldraw.book',
				sequence: [
					{
						id: 'com.tldraw.book/1',
						scope: 'record',
						up: (record: any) => record,
					},
				],
			})

			const migration2 = createMigrationSequence({
				sequenceId: 'com.tldraw.book', // Same ID
				sequence: [
					{
						id: 'com.tldraw.book/1',
						scope: 'record',
						up: (record: any) => record,
					},
				],
			})

			expect(() => {
				StoreSchema.create({ book: Book }, { migrations: [migration1, migration2] })
			}).toThrow('Duplicate migration sequenceId com.tldraw.book')
		})
	})

	describe('validateRecord', () => {
		it('throws for invalid record without validation failure handler', () => {
			// Create a validator that actually throws
			const StrictBook = createRecordType<Book>('book', {
				validator: {
					validate: (book) => {
						if (!(book as any).title || !(book as any).author) {
							throw new Error('Missing required fields')
						}
						return book as Book
					},
				},
				scope: 'document',
			})

			const schema = StoreSchema.create({ book: StrictBook })
			const store = new Store({ schema, props: {} })

			// Missing required fields
			const invalidBook = {
				id: StrictBook.createId(),
				typeName: 'book' as const,
				// Missing title, author, publishedYear
			} as any

			expect(() => {
				schema.validateRecord(store, invalidBook, 'createRecord', null)
			}).toThrow('Missing required fields')
		})

		it('calls validation failure handler for invalid record', () => {
			const onValidationFailure = vi.fn().mockReturnValue({
				id: Book.createId(),
				typeName: 'book' as const,
				title: 'Fixed Title',
				author: 'Fixed Author',
				publishedYear: 2023,
				inStock: true,
			})

			// Create a validator that throws
			const StrictBook = createRecordType<Book>('book', {
				validator: {
					validate: (book) => {
						if (!(book as any).title || !(book as any).author) {
							throw new Error('Missing required fields')
						}
						return book as Book
					},
				},
				scope: 'document',
			})

			const schema = StoreSchema.create({ book: StrictBook }, { onValidationFailure })
			const store = new Store({ schema, props: {} })

			const invalidBook = {
				id: StrictBook.createId(),
				typeName: 'book' as const,
			} as any

			const result = schema.validateRecord(store, invalidBook, 'createRecord', null)

			expect(onValidationFailure).toHaveBeenCalledWith({
				store,
				record: invalidBook,
				phase: 'createRecord',
				recordBefore: null,
				error: expect.any(Error),
			})
			expect(result.title).toBe('Fixed Title')
		})

		it('throws for unknown record type', () => {
			const schema = StoreSchema.create({ book: Book })
			const store = new Store({ schema, props: {} })

			const unknownRecord = {
				id: 'unknown:1',
				typeName: 'unknown',
			} as any

			expect(() => {
				schema.validateRecord(store, unknownRecord, 'createRecord', null)
			}).toThrow('Missing definition for record type unknown')
		})
	})

	describe('createIntegrityChecker', () => {
		it('calls createIntegrityChecker option when provided', () => {
			const createIntegrityChecker = vi.fn()
			const schema = StoreSchema.create({ book: Book }, { createIntegrityChecker })
			const store = new Store({ schema, props: {} })

			schema.createIntegrityChecker(store)

			expect(createIntegrityChecker).toHaveBeenCalledWith(store)
		})
	})

	describe('serialize', () => {
		it('serializes schema with current migration versions', () => {
			const bookMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.book',
				sequence: [
					{ id: 'com.tldraw.book/1', scope: 'record', up: (r: any) => r },
					{ id: 'com.tldraw.book/2', scope: 'record', up: (r: any) => r },
				],
			})

			const authorMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.author',
				sequence: [{ id: 'com.tldraw.author/1', scope: 'record', up: (r: any) => r }],
			})

			const schema = StoreSchema.create(
				{ book: Book, author: Author },
				{ migrations: [bookMigrations, authorMigrations] }
			)

			const serialized = schema.serialize()

			expect(serialized).toEqual({
				schemaVersion: 2,
				sequences: {
					'com.tldraw.book': 2,
					'com.tldraw.author': 1,
				},
			})
		})
	})

	describe('getType', () => {
		it('throws for invalid type name', () => {
			const schema = StoreSchema.create({ book: Book })

			expect(() => schema.getType('nonexistent')).toThrow('record type does not exists')
		})
	})
})
