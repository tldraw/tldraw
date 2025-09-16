import { describe, expect, it, vi } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { createRecordType } from './RecordType'
import { SerializedStore, Store, StoreSnapshot } from './Store'
import { SerializedSchemaV1, SerializedSchemaV2, StoreSchema, upgradeSchema } from './StoreSchema'
import { createMigrationSequence, MigrationFailureReason } from './migrate'

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
		it('creates a schema with record types', () => {
			const schema = StoreSchema.create({
				book: Book,
				author: Author,
			})

			expect(schema).toBeInstanceOf(StoreSchema)
			expect((schema.types as any).book).toBe(Book)
			expect((schema.types as any).author).toBe(Author)
		})

		it('creates a schema with migrations', () => {
			const bookMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.book',
				sequence: [
					{
						id: 'com.tldraw.book/1',
						scope: 'record',
						up: (record: any) => ({ ...record, genre: 'Unknown' }),
						down: (record: any) => {
							const { genre, ...rest } = record
							return rest
						},
					},
				],
			})

			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			expect(schema.migrations['com.tldraw.book']).toBeDefined()
			expect(schema.sortedMigrations).toHaveLength(1)
		})

		it('creates a schema with validation failure handler', () => {
			const onValidationFailure = vi.fn()
			const schema = StoreSchema.create({ book: Book }, { onValidationFailure })

			expect(schema).toBeInstanceOf(StoreSchema)
		})

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
		it('validates a valid record', () => {
			const schema = StoreSchema.create({ book: Book })
			const store = new Store({ schema, props: {} })

			const book = Book.create({
				title: '1984',
				author: 'George Orwell',
				publishedYear: 1949,
			})

			const validated = schema.validateRecord(store, book, 'createRecord', null)
			expect(validated).toEqual(book)
		})

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

		it('handles different validation phases', () => {
			const onValidationFailure = vi.fn().mockReturnValue({
				id: Book.createId(),
				typeName: 'book' as const,
				title: 'Fixed',
				author: 'Fixed',
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

			const invalidBook = { id: StrictBook.createId(), typeName: 'book' as const } as any
			const beforeBook = StrictBook.create({
				title: 'Before',
				author: 'Before',
				publishedYear: 2022,
			})

			schema.validateRecord(store, invalidBook, 'updateRecord', beforeBook)

			expect(onValidationFailure).toHaveBeenCalledWith(
				expect.objectContaining({
					phase: 'updateRecord',
					recordBefore: beforeBook,
				})
			)
		})
	})

	describe('getMigrationsSince', () => {
		const bookMigrations = createMigrationSequence({
			sequenceId: 'com.tldraw.book',
			sequence: [
				{
					id: 'com.tldraw.book/1',
					scope: 'record',
					up: (record: any) => ({ ...record, genre: 'Unknown' }),
				},
				{
					id: 'com.tldraw.book/2',
					scope: 'record',
					up: (record: any) => ({ ...record, rating: 0 }),
				},
			],
		})

		it('returns empty array when no migrations needed', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const currentSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 2 },
			}

			const result = schema.getMigrationsSince(currentSchema)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toEqual([])
			}
		})

		it('returns needed migrations for outdated schema', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const oldSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 0 },
			}

			const result = schema.getMigrationsSince(oldSchema)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toHaveLength(2)
				expect(result.value[0].id).toBe('com.tldraw.book/1')
				expect(result.value[1].id).toBe('com.tldraw.book/2')
			}
		})

		it('returns partial migrations for partially updated schema', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const partialSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 1 },
			}

			const result = schema.getMigrationsSince(partialSchema)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toHaveLength(1)
				expect(result.value[0].id).toBe('com.tldraw.book/2')
			}
		})

		it('handles retroactive migrations', () => {
			const retroactiveMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.author',
				retroactive: true,
				sequence: [
					{
						id: 'com.tldraw.author/1',
						scope: 'record',
						up: (record: any) => ({ ...record, isAlive: true }),
					},
				],
			})

			const schema = StoreSchema.create(
				{ book: Book, author: Author },
				{ migrations: [retroactiveMigrations] }
			)

			// Schema without the author sequence (simulates new sequence being added)
			const oldSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: {},
			}

			const result = schema.getMigrationsSince(oldSchema)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toHaveLength(1)
				expect(result.value[0].id).toBe('com.tldraw.author/1')
			}
		})

		it('ignores non-retroactive migrations for missing sequences', () => {
			const nonRetroactiveMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.author',
				retroactive: false,
				sequence: [
					{
						id: 'com.tldraw.author/1',
						scope: 'record',
						up: (record: any) => ({ ...record, isAlive: true }),
					},
				],
			})

			const schema = StoreSchema.create(
				{ book: Book, author: Author },
				{ migrations: [nonRetroactiveMigrations] }
			)

			const oldSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: {},
			}

			const result = schema.getMigrationsSince(oldSchema)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toEqual([])
			}
		})

		it('caches migration results', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const oldSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 0 },
			}

			// First call
			const result1 = schema.getMigrationsSince(oldSchema)
			// Second call with same schema should return cached result
			const result2 = schema.getMigrationsSince(oldSchema)

			expect(result1).toBe(result2) // Same object reference (cached)
		})

		it('handles schema upgrade errors', () => {
			const schema = StoreSchema.create({ book: Book })

			const invalidSchema = {
				schemaVersion: 999, // Invalid version
			} as any

			const result = schema.getMigrationsSince(invalidSchema)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toBe('Bad schema version')
			}
		})

		it('handles incompatible schema errors', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			// Schema with version that doesn't exist in migration sequence
			const incompatibleSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 999 }, // Version doesn't exist
			}

			const result = schema.getMigrationsSince(incompatibleSchema)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toBe('Incompatible schema?')
			}
		})
	})

	describe('migratePersistedRecord', () => {
		const bookMigrations = createMigrationSequence({
			sequenceId: 'com.tldraw.book',
			sequence: [
				{
					id: 'com.tldraw.book/1',
					scope: 'record',
					filter: (record: any) => record.typeName === 'book',
					up: (record: any) => ({ ...record, genre: record.genre || 'Unknown' }),
					down: (record: any) => {
						const { genre, ...rest } = record
						return rest
					},
				},
				{
					id: 'com.tldraw.book/2',
					scope: 'record',
					up: (record: any) => ({ ...record, rating: 5 }),
					down: (record: any) => {
						const { rating, ...rest } = record
						return rest
					},
				},
			],
		})

		it('migrates a record successfully (up direction)', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const oldRecord = Book.create({
				title: '1984',
				author: 'George Orwell',
				publishedYear: 1949,
			})

			const oldSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 0 },
			}

			const result = schema.migratePersistedRecord(oldRecord, oldSchema, 'up')

			expect(result.type).toBe('success')
			if (result.type === 'success') {
				expect((result.value as any).genre).toBe('Unknown')
				expect((result.value as any).rating).toBe(5)
			}
		})

		it('returns success when no down migrations needed', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const record = Book.create({
				title: '1984',
				author: 'George Orwell',
				publishedYear: 1949,
			})

			// Schema is already current, no migrations needed regardless of direction
			const currentSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 2 },
			}

			const result = schema.migratePersistedRecord(record, currentSchema, 'down')

			expect(result.type).toBe('success')
			if (result.type === 'success') {
				expect(result.value).toEqual(record)
			}
		})

		it('returns success when no migrations needed', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const record = Book.create({
				title: '1984',
				author: 'George Orwell',
				publishedYear: 1949,
			})

			const currentSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 2 },
			}

			const result = schema.migratePersistedRecord(record, currentSchema)

			expect(result.type).toBe('success')
			if (result.type === 'success') {
				expect(result.value).toEqual(record)
			}
		})

		it('handles store-level migrations error', () => {
			const storeMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.store',
				sequence: [
					{
						id: 'com.tldraw.store/1',
						scope: 'store',
						up: (store: any) => store,
					},
				],
			})

			const schema = StoreSchema.create({ book: Book }, { migrations: [storeMigrations] })

			const record = Book.create({
				title: '1984',
				author: 'George Orwell',
				publishedYear: 1949,
			})

			const oldSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.store': 0 },
			}

			const result = schema.migratePersistedRecord(record, oldSchema)

			expect(result.type).toBe('error')
			if (result.type === 'error') {
				expect(result.reason).toBe(MigrationFailureReason.TargetVersionTooNew)
			}
		})

		it('handles down migration without down function', () => {
			const upOnlyMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.book',
				sequence: [
					{
						id: 'com.tldraw.book/1',
						scope: 'record',
						up: (record: any) => ({ ...record, newField: true }),
						// No down function
					},
				],
			})

			const schema = StoreSchema.create({ book: Book }, { migrations: [upOnlyMigrations] })

			const record = Book.create({
				title: '1984',
				author: 'George Orwell',
				publishedYear: 1949,
			})

			const oldSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 0 },
			}

			const result = schema.migratePersistedRecord(record, oldSchema, 'down')

			expect(result.type).toBe('error')
			if (result.type === 'error') {
				expect(result.reason).toBe(MigrationFailureReason.TargetVersionTooOld)
			}
		})

		it('handles migration errors', () => {
			const errorMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.book',
				sequence: [
					{
						id: 'com.tldraw.book/1',
						scope: 'record',
						up: () => {
							throw new Error('Migration failed')
						},
					},
				],
			})

			const schema = StoreSchema.create({ book: Book }, { migrations: [errorMigrations] })

			const record = Book.create({
				title: '1984',
				author: 'George Orwell',
				publishedYear: 1949,
			})

			const oldSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 0 },
			}

			const result = schema.migratePersistedRecord(record, oldSchema)

			expect(result.type).toBe('error')
			if (result.type === 'error') {
				expect(result.reason).toBe(MigrationFailureReason.MigrationError)
			}
		})

		it('respects migration filters', () => {
			const filteredMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.book',
				sequence: [
					{
						id: 'com.tldraw.book/1',
						scope: 'record',
						filter: (record: any) => record.title === 'Target Book',
						up: (record: any) => ({ ...record, filtered: true }),
					},
				],
			})

			const schema = StoreSchema.create({ book: Book }, { migrations: [filteredMigrations] })

			// This record should not be affected by the migration due to filter
			const record = Book.create({
				title: 'Other Book',
				author: 'Author',
				publishedYear: 1949,
			})

			const oldSchema: SerializedSchemaV2 = {
				schemaVersion: 2,
				sequences: { 'com.tldraw.book': 0 },
			}

			const result = schema.migratePersistedRecord(record, oldSchema)

			expect(result.type).toBe('success')
			if (result.type === 'success') {
				expect(result.value).not.toHaveProperty('filtered')
			}
		})
	})

	describe('migrateStoreSnapshot', () => {
		const bookMigrations = createMigrationSequence({
			sequenceId: 'com.tldraw.book',
			sequence: [
				{
					id: 'com.tldraw.book/1',
					scope: 'record',
					filter: (record: any) => record.typeName === 'book',
					up: (record: any) => ({ ...record, genre: 'Unknown' }),
				},
			],
		})

		const storeMigrations = createMigrationSequence({
			sequenceId: 'com.tldraw.store',
			sequence: [
				{
					id: 'com.tldraw.store/1',
					scope: 'store',
					up: (store: any) => {
						// Add metadata to store
						return { ...store, metadata: { migrated: true } }
					},
				},
			],
		})

		it('migrates store snapshot with record migrations', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const book1 = Book.create({ title: 'Book 1', author: 'Author 1', publishedYear: 2020 })
			const book2 = Book.create({ title: 'Book 2', author: 'Author 2', publishedYear: 2021 })

			const snapshot: StoreSnapshot<Book> = {
				store: {
					[book1.id]: book1,
					[book2.id]: book2,
				} as SerializedStore<Book>,
				schema: {
					schemaVersion: 2,
					sequences: { 'com.tldraw.book': 0 },
				},
			}

			const result = schema.migrateStoreSnapshot(snapshot)

			expect(result.type).toBe('success')
			if (result.type === 'success') {
				const migratedBooks = Object.values(result.value) as Book[]
				expect(migratedBooks).toHaveLength(2)
				migratedBooks.forEach((book) => {
					expect(book.genre).toBe('Unknown')
				})
			}
		})

		it('migrates store snapshot with store migrations', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [storeMigrations] })

			const book = Book.create({ title: 'Book', author: 'Author', publishedYear: 2020 })

			const snapshot: StoreSnapshot<Book> = {
				store: {
					[book.id]: book,
				} as SerializedStore<Book>,
				schema: {
					schemaVersion: 2,
					sequences: { 'com.tldraw.store': 0 },
				},
			}

			const result = schema.migrateStoreSnapshot(snapshot)

			expect(result.type).toBe('success')
			if (result.type === 'success') {
				expect((result.value as any).metadata).toEqual({ migrated: true })
			}
		})

		it('returns success when no migrations needed', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const book = Book.create({ title: 'Book', author: 'Author', publishedYear: 2020 })

			const snapshot: StoreSnapshot<Book> = {
				store: {
					[book.id]: book,
				} as SerializedStore<Book>,
				schema: {
					schemaVersion: 2,
					sequences: { 'com.tldraw.book': 1 }, // Already up to date
				},
			}

			const result = schema.migrateStoreSnapshot(snapshot)

			expect(result.type).toBe('success')
			if (result.type === 'success') {
				expect(result.value).toBe(snapshot.store) // Same reference
			}
		})

		it('handles mutateInputStore option', () => {
			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const book = Book.create({ title: 'Book', author: 'Author', publishedYear: 2020 })

			const snapshot: StoreSnapshot<Book> = {
				store: {
					[book.id]: book,
				} as SerializedStore<Book>,
				schema: {
					schemaVersion: 2,
					sequences: { 'com.tldraw.book': 0 },
				},
			}

			const originalStore = snapshot.store
			const result = schema.migrateStoreSnapshot(snapshot, { mutateInputStore: true })

			expect(result.type).toBe('success')
			if (result.type === 'success') {
				// Should mutate the original store
				expect(result.value).toBe(originalStore)
			}
		})

		it('handles migration errors', () => {
			const errorMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.book',
				sequence: [
					{
						id: 'com.tldraw.book/1',
						scope: 'record',
						up: () => {
							throw new Error('Migration failed')
						},
					},
				],
			})

			const schema = StoreSchema.create({ book: Book }, { migrations: [errorMigrations] })

			const book = Book.create({ title: 'Book', author: 'Author', publishedYear: 2020 })

			const snapshot: StoreSnapshot<Book> = {
				store: {
					[book.id]: book,
				} as SerializedStore<Book>,
				schema: {
					schemaVersion: 2,
					sequences: { 'com.tldraw.book': 0 },
				},
			}

			const result = schema.migrateStoreSnapshot(snapshot)

			expect(result.type).toBe('error')
			if (result.type === 'error') {
				expect(result.reason).toBe(MigrationFailureReason.MigrationError)
			}
		})
	})

	describe('createIntegrityChecker', () => {
		it('returns undefined when no integrity checker provided', () => {
			const schema = StoreSchema.create({ book: Book })
			const store = new Store({ schema, props: {} })

			const checker = schema.createIntegrityChecker(store)
			expect(checker).toBeUndefined()
		})

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

		it('serializes schema with empty sequences when no migrations', () => {
			const schema = StoreSchema.create({ book: Book })

			const serialized = schema.serialize()

			expect(serialized).toEqual({
				schemaVersion: 2,
				sequences: {},
			})
		})

		it('handles empty migration sequences', () => {
			const emptyMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.empty',
				sequence: [],
			})

			const schema = StoreSchema.create({ book: Book }, { migrations: [emptyMigrations] })

			const serialized = schema.serialize()

			expect(serialized).toEqual({
				schemaVersion: 2,
				sequences: {
					'com.tldraw.empty': 0,
				},
			})
		})
	})

	describe('serializeEarliestVersion', () => {
		it('serializes schema with all sequences set to version 0', () => {
			const bookMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.book',
				sequence: [
					{ id: 'com.tldraw.book/1', scope: 'record', up: (r: any) => r },
					{ id: 'com.tldraw.book/2', scope: 'record', up: (r: any) => r },
				],
			})

			const schema = StoreSchema.create({ book: Book }, { migrations: [bookMigrations] })

			const serialized = schema.serializeEarliestVersion()

			expect(serialized).toEqual({
				schemaVersion: 2,
				sequences: {
					'com.tldraw.book': 0,
				},
			})
		})
	})

	describe('getType', () => {
		it('returns the record type for valid type name', () => {
			const schema = StoreSchema.create({ book: Book, author: Author })

			expect(schema.getType('book')).toBe(Book)
			expect(schema.getType('author')).toBe(Author)
		})

		it('throws for invalid type name', () => {
			const schema = StoreSchema.create({ book: Book })

			expect(() => schema.getType('nonexistent')).toThrow('record type does not exists')
		})
	})
})

describe('upgradeSchema', () => {
	it('upgrades v1 schema to v2', () => {
		const v1Schema: SerializedSchemaV1 = {
			schemaVersion: 1,
			storeVersion: 2,
			recordVersions: {
				book: { version: 3 },
				author: { version: 1 },
				shape: {
					version: 2,
					subTypeKey: 'type',
					subTypeVersions: {
						rectangle: 1,
						circle: 2,
					},
				},
			},
		}

		const result = upgradeSchema(v1Schema)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value).toEqual({
				schemaVersion: 2,
				sequences: {
					'com.tldraw.store': 2,
					'com.tldraw.book': 3,
					'com.tldraw.author': 1,
					'com.tldraw.shape': 2,
					'com.tldraw.shape.rectangle': 1,
					'com.tldraw.shape.circle': 2,
				},
			})
		}
	})

	it('returns v2 schema unchanged', () => {
		const v2Schema: SerializedSchemaV2 = {
			schemaVersion: 2,
			sequences: { 'com.tldraw.book': 1 },
		}

		const result = upgradeSchema(v2Schema)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value).toBe(v2Schema)
		}
	})

	it('rejects invalid schema versions', () => {
		const invalidSchema = { schemaVersion: 0 } as any
		const result = upgradeSchema(invalidSchema)

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toBe('Bad schema version')
		}

		const tooNewSchema = { schemaVersion: 3 } as any
		const result2 = upgradeSchema(tooNewSchema)

		expect(result2.ok).toBe(false)
		if (!result2.ok) {
			expect(result2.error).toBe('Bad schema version')
		}
	})
})
