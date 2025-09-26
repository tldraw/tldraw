import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { RecordsDiff } from './RecordsDiff'
import { createRecordType } from './RecordType'
import {
	ChangeSource,
	CollectionDiff,
	createComputedCache,
	HistoryEntry,
	SerializedStore,
	Store,
	StoreListenerFilters,
	StoreSnapshot,
} from './Store'
import { StoreSchema } from './StoreSchema'

// Test record types
interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	author: RecordId<Author>
	numPages: number
	genre?: string
	inStock?: boolean
}

const Book = createRecordType<Book>('book', {
	validator: { validate: (book) => book as Book },
	scope: 'document',
}).withDefaultProperties(() => ({
	inStock: true,
	numPages: 100,
}))

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
	isPseudonym: boolean
	birthYear?: number
}

const Author = createRecordType<Author>('author', {
	validator: { validate: (author) => author as Author },
	scope: 'document',
}).withDefaultProperties(() => ({
	isPseudonym: false,
}))

interface Visit extends BaseRecord<'visit', RecordId<Visit>> {
	visitorName: string
	booksInBasket: RecordId<Book>[]
	timestamp: number
}

const Visit = createRecordType<Visit>('visit', {
	validator: { validate: (visit) => visit as Visit },
	scope: 'session',
}).withDefaultProperties(() => ({
	visitorName: 'Anonymous',
	booksInBasket: [],
	timestamp: Date.now(),
}))

interface Cursor extends BaseRecord<'cursor', RecordId<Cursor>> {
	x: number
	y: number
	userId: string
}

const Cursor = createRecordType<Cursor>('cursor', {
	validator: { validate: (cursor) => cursor as Cursor },
	scope: 'presence',
})

type LibraryType = Book | Author | Visit | Cursor

describe('Store', () => {
	let store: Store<LibraryType>

	beforeEach(() => {
		store = new Store({
			props: {},
			schema: StoreSchema.create<LibraryType>({
				book: Book,
				author: Author,
				visit: Visit,
				cursor: Cursor,
			}),
		})
	})

	afterEach(() => {
		store.dispose()
	})

	describe('construction', () => {
		it('creates a store with default id', () => {
			expect(store.id).toBeDefined()
			expect(typeof store.id).toBe('string')
		})

		it('creates a store with custom id', () => {
			const customStore = new Store({
				id: 'custom-store-id',
				props: { test: 'value' },
				schema: StoreSchema.create<LibraryType>({
					book: Book,
					author: Author,
					visit: Visit,
					cursor: Cursor,
				}),
			})
			expect(customStore.id).toBe('custom-store-id')
			expect(customStore.props).toEqual({ test: 'value' })
			customStore.dispose()
		})

		it('initializes with initial data', () => {
			const initialData = {
				[Author.createId('tolkien')]: Author.create({
					name: 'J.R.R. Tolkien',
					id: Author.createId('tolkien'),
				}),
				[Book.createId('hobbit')]: Book.create({
					title: 'The Hobbit',
					id: Book.createId('hobbit'),
					author: Author.createId('tolkien'),
					numPages: 310,
				}),
			}

			const storeWithData = new Store({
				props: {},
				schema: StoreSchema.create<LibraryType>({
					book: Book,
					author: Author,
					visit: Visit,
					cursor: Cursor,
				}),
				initialData,
			})

			expect(storeWithData.get(Author.createId('tolkien'))).toEqual(
				expect.objectContaining({ name: 'J.R.R. Tolkien' })
			)
			expect(storeWithData.get(Book.createId('hobbit'))).toEqual(
				expect.objectContaining({ title: 'The Hobbit' })
			)
			storeWithData.dispose()
		})

		it('has correct scoped types', () => {
			expect(store.scopedTypes.document).toEqual(new Set(['book', 'author']))
			expect(store.scopedTypes.session).toEqual(new Set(['visit']))
			expect(store.scopedTypes.presence).toEqual(new Set(['cursor']))
		})
	})

	describe('basic record operations', () => {
		it('puts records into the store', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})

			store.put([author, book])

			expect(store.get(author.id)).toEqual(author)
			expect(store.get(book.id)).toEqual(book)
		})

		it('updates existing records', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			const updatedAuthor = { ...author, name: 'John Ronald Reuel Tolkien' }
			store.put([updatedAuthor])

			expect(store.get(author.id)?.name).toBe('John Ronald Reuel Tolkien')
		})

		it('removes records from the store', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})

			store.put([author, book])
			expect(store.has(author.id)).toBe(true)
			expect(store.has(book.id)).toBe(true)

			store.remove([author.id, book.id])
			expect(store.has(author.id)).toBe(false)
			expect(store.has(book.id)).toBe(false)
		})

		it('updates records using update method', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			store.update(author.id, (current) => ({
				...current,
				name: 'John Ronald Reuel Tolkien',
			}))

			expect(store.get(author.id)?.name).toBe('John Ronald Reuel Tolkien')
		})

		it('handles update of non-existent record', () => {
			const nonExistentId = Author.createId('non-existent')
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			store.update(nonExistentId, (record) => ({ ...record, name: 'Updated' }))

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Record author:non-existent not found')
			)
			consoleSpy.mockRestore()
		})

		it('gets all records', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})

			store.put([author, book])
			const allRecords = store.allRecords()

			expect(allRecords).toHaveLength(2)
			expect(allRecords).toContainEqual(author)
			expect(allRecords).toContainEqual(book)
		})

		it('clears all records', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})

			store.put([author, book])
			expect(store.allRecords()).toHaveLength(2)

			store.clear()
			expect(store.allRecords()).toHaveLength(0)
		})

		it('checks record existence with has method', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })

			expect(store.has(author.id)).toBe(false)
			store.put([author])
			expect(store.has(author.id)).toBe(true)
		})

		it('gets records without reactive capture', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			const result = store.unsafeGetWithoutCapture(author.id)
			expect(result).toEqual(author)
		})
	})

	describe('atomic operations', () => {
		it('performs atomic operations', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})

			const result = store.atomic(() => {
				store.put([author])
				store.put([book])
				return 'completed'
			})

			expect(result).toBe('completed')
			expect(store.get(author.id)).toEqual(author)
			expect(store.get(book.id)).toEqual(book)
		})

		it('handles nested atomic operations', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})

			store.atomic(() => {
				store.put([author])
				store.atomic(() => {
					store.put([book])
				})
			})

			expect(store.get(author.id)).toEqual(author)
			expect(store.get(book.id)).toEqual(book)
		})

		it('can disable callbacks in atomic operations', () => {
			const callback = vi.fn()
			store.sideEffects.registerAfterCreateHandler('author', callback)

			const author = Author.create({ name: 'J.R.R. Tolkien' })

			store.atomic(() => {
				store.put([author])
			}, false) // runCallbacks = false

			// Callback should not have been called
			expect(callback).not.toHaveBeenCalled()
		})
	})

	describe('history tracking', () => {
		it('tracks history of changes', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const initialHistory = store.history.get()

			store.put([author])
			expect(store.history.get()).toBeGreaterThan(initialHistory)
		})

		it('extracts changes from operations', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})

			const changes = store.extractingChanges(() => {
				store.put([author, book])
			})

			expect(changes.added).toHaveProperty(author.id)
			expect(changes.added).toHaveProperty(book.id)
			expect(Object.keys(changes.updated)).toHaveLength(0)
			expect(Object.keys(changes.removed)).toHaveLength(0)
		})

		it('extracts update changes', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			const changes = store.extractingChanges(() => {
				store.update(author.id, (a) => ({ ...a, name: 'John Ronald Reuel Tolkien' }))
			})

			expect(Object.keys(changes.added)).toHaveLength(0)
			expect(changes.updated).toHaveProperty(author.id)
			expect(Object.keys(changes.removed)).toHaveLength(0)
		})

		it('extracts removal changes', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			const changes = store.extractingChanges(() => {
				store.remove([author.id])
			})

			expect(Object.keys(changes.added)).toHaveLength(0)
			expect(Object.keys(changes.updated)).toHaveLength(0)
			expect(changes.removed).toHaveProperty(author.id)
		})
	})

	describe('listeners', () => {
		it('adds and removes listeners', async () => {
			const listener = vi.fn()
			const removeListener = store.listen(listener)

			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			// Wait for async history flush
			await new Promise((resolve) => requestAnimationFrame(resolve))

			expect(listener).toHaveBeenCalledTimes(1)
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					source: 'user',
					changes: expect.objectContaining({
						added: expect.objectContaining({
							[author.id]: author,
						}),
					}),
				})
			)

			removeListener()

			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})
			store.put([book])

			// Wait for async history flush
			await new Promise((resolve) => requestAnimationFrame(resolve))

			// Should still be called only once
			expect(listener).toHaveBeenCalledTimes(1)
		})

		it('filters listeners by source', async () => {
			const userListener = vi.fn()
			const remoteListener = vi.fn()

			store.listen(userListener, { source: 'user', scope: 'all' })
			store.listen(remoteListener, { source: 'remote', scope: 'all' })

			const author = Author.create({ name: 'J.R.R. Tolkien' })

			// User change
			store.put([author])
			await new Promise((resolve) => requestAnimationFrame(resolve))

			expect(userListener).toHaveBeenCalledTimes(1)
			expect(remoteListener).not.toHaveBeenCalled()

			// Remote change
			store.mergeRemoteChanges(() => {
				const book = Book.create({
					title: 'The Hobbit',
					author: author.id,
					numPages: 310,
				})
				store.put([book])
			})
			await new Promise((resolve) => requestAnimationFrame(resolve))

			expect(userListener).toHaveBeenCalledTimes(1)
			expect(remoteListener).toHaveBeenCalledTimes(1)
		})

		it('filters listeners by scope', async () => {
			const documentListener = vi.fn()
			const sessionListener = vi.fn()
			const presenceListener = vi.fn()

			store.listen(documentListener, { source: 'all', scope: 'document' })
			store.listen(sessionListener, { source: 'all', scope: 'session' })
			store.listen(presenceListener, { source: 'all', scope: 'presence' })

			const author = Author.create({ name: 'J.R.R. Tolkien' }) // document scope
			const visit = Visit.create({ visitorName: 'John Doe' }) // session scope
			const cursor = Cursor.create({ x: 100, y: 200, userId: 'user1' }) // presence scope

			store.put([author, visit, cursor])
			await new Promise((resolve) => requestAnimationFrame(resolve))

			expect(documentListener).toHaveBeenCalledTimes(1)
			expect(sessionListener).toHaveBeenCalledTimes(1)
			expect(presenceListener).toHaveBeenCalledTimes(1)

			// Check that each listener only received records from their scope
			expect(documentListener.mock.calls[0][0].changes.added).toHaveProperty(author.id)
			expect(documentListener.mock.calls[0][0].changes.added).not.toHaveProperty(visit.id)
			expect(documentListener.mock.calls[0][0].changes.added).not.toHaveProperty(cursor.id)

			expect(sessionListener.mock.calls[0][0].changes.added).not.toHaveProperty(author.id)
			expect(sessionListener.mock.calls[0][0].changes.added).toHaveProperty(visit.id)
			expect(sessionListener.mock.calls[0][0].changes.added).not.toHaveProperty(cursor.id)

			expect(presenceListener.mock.calls[0][0].changes.added).not.toHaveProperty(author.id)
			expect(presenceListener.mock.calls[0][0].changes.added).not.toHaveProperty(visit.id)
			expect(presenceListener.mock.calls[0][0].changes.added).toHaveProperty(cursor.id)
		})

		it('flushes history before adding listeners', async () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			// Add listener after changes
			const listener = vi.fn()
			store.listen(listener)

			// Should not receive historical changes
			await new Promise((resolve) => requestAnimationFrame(resolve))
			expect(listener).not.toHaveBeenCalled()

			// Should receive new changes
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})
			store.put([book])

			await new Promise((resolve) => requestAnimationFrame(resolve))
			expect(listener).toHaveBeenCalledTimes(1)
		})
	})

	describe('remote changes', () => {
		it('merges remote changes with correct source', async () => {
			const listener = vi.fn()
			store.listen(listener)

			const author = Author.create({ name: 'J.R.R. Tolkien' })

			store.mergeRemoteChanges(() => {
				store.put([author])
			})

			await new Promise((resolve) => requestAnimationFrame(resolve))

			expect(listener).toHaveBeenCalledWith(expect.objectContaining({ source: 'remote' }))
		})

		it('ensures store is usable after remote changes', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })

			store.mergeRemoteChanges(() => {
				store.put([author])
			})

			expect(store.get(author.id)).toEqual(author)
		})

		it('throws error when merging remote changes during atomic operation', () => {
			expect(() => {
				store.atomic(() => {
					store.mergeRemoteChanges(() => {
						// This should throw
					})
				})
			}).toThrow('Cannot merge remote changes while in atomic operation')
		})
	})

	describe('serialization and snapshots', () => {
		beforeEach(() => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})
			const visit = Visit.create({ visitorName: 'John Doe' })
			const cursor = Cursor.create({ x: 100, y: 200, userId: 'user1' })

			store.put([author, book, visit, cursor])
		})

		it('serializes store with document scope by default', () => {
			const serialized = store.serialize()
			const records = Object.values(serialized)

			// Should include document records only
			expect(records.some((r) => r.typeName === 'author')).toBe(true)
			expect(records.some((r) => r.typeName === 'book')).toBe(true)
			expect(records.some((r) => r.typeName === 'visit')).toBe(false)
			expect(records.some((r) => r.typeName === 'cursor')).toBe(false)
		})

		it('serializes store with specific scope', () => {
			const sessionSerialized = store.serialize('session')
			const sessionRecords = Object.values(sessionSerialized)

			expect(sessionRecords.some((r) => r.typeName === 'visit')).toBe(true)
			expect(sessionRecords.some((r) => r.typeName === 'author')).toBe(false)
		})

		it('serializes store with all scopes', () => {
			const allSerialized = store.serialize('all')
			const allRecords = Object.values(allSerialized)

			expect(allRecords.some((r) => r.typeName === 'author')).toBe(true)
			expect(allRecords.some((r) => r.typeName === 'book')).toBe(true)
			expect(allRecords.some((r) => r.typeName === 'visit')).toBe(true)
			expect(allRecords.some((r) => r.typeName === 'cursor')).toBe(true)
		})

		it('creates and loads store snapshots', () => {
			const snapshot = store.getStoreSnapshot()

			expect(snapshot).toHaveProperty('store')
			expect(snapshot).toHaveProperty('schema')

			const newStore = new Store({
				props: {},
				schema: StoreSchema.create<LibraryType>({
					book: Book,
					author: Author,
					visit: Visit,
					cursor: Cursor,
				}),
			})

			newStore.loadStoreSnapshot(snapshot)

			// Should have same document records (default scope)
			const originalDocumentRecords = store.serialize('document')
			const newDocumentRecords = newStore.serialize('document')

			expect(newDocumentRecords).toEqual(originalDocumentRecords)
			newStore.dispose()
		})

		it('migrates snapshots', () => {
			const snapshot = store.getStoreSnapshot()
			const migratedSnapshot = store.migrateSnapshot(snapshot)

			expect(migratedSnapshot).toEqual(snapshot) // No migrations needed
		})

		it('throws error on migration failure', () => {
			const invalidSnapshot = {
				store: {},
				schema: { version: -1 }, // Invalid version
			} as any

			expect(() => store.migrateSnapshot(invalidSnapshot)).toThrow()
		})
	})

	describe('computed caches', () => {
		it('creates and uses computed cache', () => {
			const computeExpensiveData = vi.fn((book: Book) => `expensive-${book.title}`)

			const cache = store.createComputedCache('expensiveBook', computeExpensiveData)

			const book = Book.create({
				title: 'The Hobbit',
				author: Author.createId('tolkien'),
				numPages: 310,
			})
			store.put([book])

			const result1 = cache.get(book.id)
			expect(result1).toBe('expensive-The Hobbit')
			expect(computeExpensiveData).toHaveBeenCalledTimes(1)

			// Should use cached result
			const result2 = cache.get(book.id)
			expect(result2).toBe('expensive-The Hobbit')
			expect(computeExpensiveData).toHaveBeenCalledTimes(1)
		})

		it('invalidates cache when record changes', () => {
			const computeExpensiveData = vi.fn((book: Book) => `expensive-${book.title}`)
			const cache = store.createComputedCache('expensiveBook', computeExpensiveData)

			const book = Book.create({
				title: 'The Hobbit',
				author: Author.createId('tolkien'),
				numPages: 310,
			})
			store.put([book])

			cache.get(book.id)
			expect(computeExpensiveData).toHaveBeenCalledTimes(1)

			// Update the book
			store.update(book.id, (b) => ({ ...b, title: 'The Hobbit: Updated' }))

			// Should recompute
			const result = cache.get(book.id)
			expect(result).toBe('expensive-The Hobbit: Updated')
			expect(computeExpensiveData).toHaveBeenCalledTimes(2)
		})

		it('returns undefined for non-existent records', () => {
			const cache = store.createComputedCache('test', (book: Book) => book.title)
			const nonExistentId = Book.createId('non-existent')

			const result = cache.get(nonExistentId)
			expect(result).toBeUndefined()
		})

		it('creates computed cache with custom equality functions', () => {
			const derive = vi.fn((book: Book) => ({ processed: book.title }))
			const areRecordsEqual = vi.fn((a: Book, b: Book) => a.title === b.title)
			const areResultsEqual = vi.fn((a: any, b: any) => a.processed === b.processed)

			const cache = store.createComputedCache('custom', derive, {
				areRecordsEqual,
				areResultsEqual,
			})

			const book = Book.create({
				title: 'The Hobbit',
				author: Author.createId('tolkien'),
				numPages: 310,
			})
			store.put([book])

			cache.get(book.id)
			expect(derive).toHaveBeenCalledTimes(1)

			// Update with same title - should use custom equality
			store.update(book.id, (b) => ({ ...b, numPages: 400 }))
			cache.get(book.id)

			// Should have used custom equality functions
			expect(areRecordsEqual).toHaveBeenCalled()
		})
	})

	describe('standalone createComputedCache', () => {
		it('works with store objects', () => {
			const derive = vi.fn(
				(context: { store: Store<LibraryType> }, book: Book) => `${book.title}-${context.store.id}`
			)

			const cache = createComputedCache('standalone', derive)

			const book = Book.create({
				title: 'The Hobbit',
				author: Author.createId('tolkien'),
				numPages: 310,
			})
			store.put([book])

			const result = cache.get({ store }, book.id)
			expect(result).toBe(`The Hobbit-${store.id}`)
			expect(derive).toHaveBeenCalledTimes(1)
		})

		it('works directly with store instances', () => {
			const derive = vi.fn((store: Store<LibraryType>, book: Book) => `${book.title}-${store.id}`)

			const cache = createComputedCache('standalone', derive)

			const book = Book.create({
				title: 'The Hobbit',
				author: Author.createId('tolkien'),
				numPages: 310,
			})
			store.put([book])

			const result = cache.get(store, book.id)
			expect(result).toBe(`The Hobbit-${store.id}`)
			expect(derive).toHaveBeenCalledTimes(1)
		})
	})

	describe('diff application', () => {
		it('applies diffs to the store', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})

			const diff: RecordsDiff<LibraryType> = {
				added: {
					[author.id]: author,
					[book.id]: book,
				},
				updated: {},
				removed: {},
			}

			store.applyDiff(diff)

			expect(store.get(author.id)).toEqual(author)
			expect(store.get(book.id)).toEqual(book)
		})

		it('applies diffs with updates', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			const updatedAuthor = { ...author, name: 'John Ronald Reuel Tolkien' }
			const diff: RecordsDiff<LibraryType> = {
				added: {},
				updated: {
					[author.id]: [author, updatedAuthor],
				},
				removed: {},
			}

			store.applyDiff(diff)

			expect(store.get(author.id)?.name).toBe('John Ronald Reuel Tolkien')
		})

		it('applies diffs with removals', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			const diff: RecordsDiff<LibraryType> = {
				added: {},
				updated: {},
				removed: {
					[author.id]: author,
				},
			}

			store.applyDiff(diff)

			expect(store.has(author.id)).toBe(false)
		})

		it('applies diffs without callbacks', () => {
			const callback = vi.fn()
			store.sideEffects.registerAfterCreateHandler('author', callback)

			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const diff: RecordsDiff<LibraryType> = {
				added: { [author.id]: author },
				updated: {},
				removed: {},
			}

			store.applyDiff(diff, { runCallbacks: false })

			expect(store.get(author.id)).toEqual(author)
			expect(callback).not.toHaveBeenCalled()
		})
	})

	describe('validation', () => {
		it('validates all records', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})

			store.put([author, book])

			// Should not throw
			expect(() => store.validate('tests')).not.toThrow()
		})
	})

	describe('integrity checking', () => {
		it('ensures store is usable', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			// Should not throw
			expect(() => store.ensureStoreIsUsable()).not.toThrow()
		})

		it('tracks corruption state', () => {
			expect(store.isPossiblyCorrupted()).toBe(false)

			store.markAsPossiblyCorrupted()
			expect(store.isPossiblyCorrupted()).toBe(true)
		})
	})

	describe('history accumulator', () => {
		it('adds history interceptors', () => {
			const interceptor = vi.fn()
			const removeInterceptor = store.addHistoryInterceptor(interceptor)

			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			expect(interceptor).toHaveBeenCalledWith(
				expect.objectContaining({
					changes: expect.objectContaining({
						added: expect.objectContaining({ [author.id]: author }),
					}),
				}),
				'user'
			)

			removeInterceptor()

			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})
			store.put([book])

			// Should not be called again after removal
			expect(interceptor).toHaveBeenCalledTimes(1)
		})
	})

	describe('side effects integration', () => {
		it('has side effects manager', () => {
			expect(store.sideEffects).toBeDefined()
			expect(typeof store.sideEffects.registerAfterCreateHandler).toBe('function')
		})

		it('integrates with side effects for put operations', () => {
			const beforeCreate = vi.fn((record: Author) => record)
			const afterCreate = vi.fn()

			store.sideEffects.registerBeforeCreateHandler('author', beforeCreate)
			store.sideEffects.registerAfterCreateHandler('author', afterCreate)

			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			expect(beforeCreate).toHaveBeenCalledWith(author, 'user')
			expect(afterCreate).toHaveBeenCalledWith(author, 'user')
		})

		it('integrates with side effects for update operations', () => {
			const beforeChange = vi.fn((prev: Author, next: Author) => next)
			const afterChange = vi.fn()

			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			store.sideEffects.registerBeforeChangeHandler('author', beforeChange)
			store.sideEffects.registerAfterChangeHandler('author', afterChange)

			const updatedAuthor = { ...author, name: 'John Ronald Reuel Tolkien' }
			store.put([updatedAuthor])

			expect(beforeChange).toHaveBeenCalledWith(author, updatedAuthor, 'user')
			expect(afterChange).toHaveBeenCalledWith(author, updatedAuthor, 'user')
		})

		it('integrates with side effects for remove operations', () => {
			const beforeDelete = vi.fn()
			const afterDelete = vi.fn()

			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			store.sideEffects.registerBeforeDeleteHandler('author', beforeDelete)
			store.sideEffects.registerAfterDeleteHandler('author', afterDelete)

			store.remove([author.id])

			expect(beforeDelete).toHaveBeenCalledWith(author, 'user')
			expect(afterDelete).toHaveBeenCalledWith(author, 'user')
		})
	})

	describe('queries integration', () => {
		it('has query object', () => {
			expect(store.query).toBeDefined()
			expect(typeof store.query.records).toBe('function')
		})

		it('provides reactive queries', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			const book = Book.create({
				title: 'The Hobbit',
				author: author.id,
				numPages: 310,
			})

			store.put([author, book])

			const bookRecords = store.query.records('book')
			expect(bookRecords.get()).toHaveLength(1)
			expect(bookRecords.get()[0]).toEqual(book)
		})
	})

	describe('error handling', () => {
		it('handles put with no changes gracefully', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			// Put the same record again - should be a no-op
			store.put([author])

			expect(store.get(author.id)).toEqual(author)
		})

		it('handles remove of non-existent records gracefully', () => {
			const nonExistentId = Author.createId('non-existent')

			// Should not throw
			expect(() => store.remove([nonExistentId])).not.toThrow()
		})
	})

	describe('memory management', () => {
		it('disposes of the store', () => {
			const author = Author.create({ name: 'J.R.R. Tolkien' })
			store.put([author])

			// Should not throw
			expect(() => store.dispose()).not.toThrow()
		})
	})
})

describe('Store type exports', () => {
	it('exports all required types', () => {
		// These should compile without errors if types are properly exported
		const _collectionDiff: CollectionDiff<string> = { added: new Set(['test']) }
		const _changeSource: ChangeSource = 'user'
		const _filters: StoreListenerFilters = { source: 'all', scope: 'all' }
		const _historyEntry: HistoryEntry<Book> = {
			changes: { added: {}, updated: {}, removed: {} },
			source: 'user',
		}
		const _serializedStore: SerializedStore<Book> = {}
		const _storeSnapshot: StoreSnapshot<Book> = { store: {}, schema: {} as any }

		// Should be defined
		expect(_collectionDiff).toBeDefined()
		expect(_changeSource).toBeDefined()
		expect(_filters).toBeDefined()
		expect(_historyEntry).toBeDefined()
		expect(_serializedStore).toBeDefined()
		expect(_storeSnapshot).toBeDefined()
	})
})
