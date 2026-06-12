import { react } from '@tldraw/state'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { createMigrationSequence } from './migrate'
import { createRecordType } from './RecordType'
import { createComputedCache, Store } from './Store'
import { StoreSchema } from './StoreSchema'

// Tests for SPEC.md §5 (reading and writing), §9 (validation), §10 (computed caches),
// and §21 (integrity). Rule IDs like [S3] in test names refer to that document.

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	author: RecordId<Author>
	numPages: number
}

const Book = createRecordType<Book>('book', {
	validator: {
		validate(value) {
			const book = value as Book
			if (!book.id.startsWith('book:')) throw Error('invalid book id')
			if (book.typeName !== 'book') throw Error('invalid book typeName')
			if (typeof book.title !== 'string') throw Error('invalid book title')
			if (!Number.isFinite(book.numPages) || book.numPages < 0) {
				throw Error('invalid book numPages')
			}
			return book
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({ numPages: 100 }))

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
	isPseudonym: boolean
}

const Author = createRecordType<Author>('author', {
	validator: {
		validate(value) {
			const author = value as Author
			if (!author.id.startsWith('author:')) throw Error('invalid author id')
			if (author.typeName !== 'author') throw Error('invalid author typeName')
			if (typeof author.name !== 'string') throw Error('invalid author name')
			if (typeof author.isPseudonym !== 'boolean') throw Error('invalid author isPseudonym')
			return author
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({ isPseudonym: false }))

interface Visit extends BaseRecord<'visit', RecordId<Visit>> {
	visitorName: string
}

const Visit = createRecordType<Visit>('visit', {
	scope: 'session',
}).withDefaultProperties(() => ({ visitorName: 'Anonymous' }))

interface Cursor extends BaseRecord<'cursor', RecordId<Cursor>> {
	x: number
	y: number
}

const Cursor = createRecordType<Cursor>('cursor', {
	scope: 'presence',
})

type LibraryType = Book | Author | Visit | Cursor

const schema = () =>
	StoreSchema.create<LibraryType>({
		book: Book,
		author: Author,
		visit: Visit,
		cursor: Cursor,
	})

describe('Store: reading and writing (S)', () => {
	let store: Store<LibraryType>

	beforeEach(() => {
		store = new Store({ props: {}, schema: schema() })
	})

	afterEach(() => {
		store.dispose()
	})

	it('[S1] a new store is empty', () => {
		expect(store.allRecords()).toEqual([])
	})

	it('[S1] initialData populates the store', () => {
		const author = Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })
		const populated = new Store({
			props: {},
			schema: schema(),
			initialData: { [author.id]: author } as any,
		})
		expect(populated.allRecords()).toEqual([author])
		populated.dispose()
	})

	it('[S1] records read from the store are frozen in dev/test builds', () => {
		const author = Author.create({ name: 'J.R.R Tolkein' })
		store.put([author])
		expect(Object.isFrozen(store.get(author.id))).toBe(true)
	})

	it('[S2] put creates records and get/has read them', () => {
		const author = Author.create({ name: 'J.R.R Tolkein' })
		const book = Book.create({ title: 'The Hobbit', author: author.id, numPages: 310 })

		store.put([author, book])

		expect(store.get(author.id)).toEqual(author)
		expect(store.get(book.id)).toEqual(book)
		expect(store.has(author.id)).toBe(true)
		expect(store.has(Book.createId('missing'))).toBe(false)
		expect(store.get(Book.createId('missing'))).toBeUndefined()
	})

	it('[S2] put updates records whose ids are already present', () => {
		const author = Author.create({ name: 'J.R.R Tolkein' })
		store.put([author])

		store.put([{ ...author, name: 'John Ronald Reuel Tolkien' }])

		expect(store.get(author.id)?.name).toBe('John Ronald Reuel Tolkien')
	})

	it('[S3] re-putting the stored object is a complete no-op', () => {
		const author = Author.create({ name: 'J.R.R Tolkein' })
		store.put([author])

		const listener = vi.fn()
		store.listen(listener)

		store.update(author.id, (a) => a)
		store.put([store.get(author.id)!])

		expect(listener).not.toHaveBeenCalled()
	})

	it('[S3] a no-op put produces no history entry even among real changes', () => {
		const author = Author.create({ name: 'J.R.R Tolkein' })
		store.put([author])

		const other = Author.create({ name: 'Ursula K. Le Guin' })
		const diff = store.extractingChanges(() => {
			store.put([store.get(author.id)!, other])
		})

		expect(Object.keys(diff.updated)).toEqual([])
		expect(Object.keys(diff.added)).toEqual([other.id])
	})

	it('[S4] update applies an updater function to the current record', () => {
		const author = Author.create({ name: 'J.R.R Tolkein' })
		store.put([author])

		store.update(author.id, (current) => ({ ...current, name: 'Jimmy Tolks' }))

		expect(store.get(author.id)?.name).toBe('Jimmy Tolks')
	})

	it('[S4] update of a missing id logs an error and does not throw', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() => {
			store.update(Author.createId('missing'), (a) => a)
		}).not.toThrow()

		expect(consoleSpy).toHaveBeenCalled()
		consoleSpy.mockRestore()
	})

	it('[S5] remove deletes records and ignores missing ids', () => {
		const author = Author.create({ name: 'J.R.R Tolkein' })
		const book = Book.create({ title: 'The Hobbit', author: author.id })
		store.put([author, book])

		store.remove([author.id, Book.createId('missing')])

		expect(store.has(author.id)).toBe(false)
		expect(store.has(book.id)).toBe(true)
	})

	it('[S5] removing nothing produces no history entry', () => {
		const diff = store.extractingChanges(() => {
			store.remove([Author.createId('missing')])
		})
		expect(diff).toEqual({ added: {}, updated: {}, removed: {} })
	})

	it('[S5] clear removes all records', () => {
		store.put([Author.create({ name: 'J.R.R Tolkein' }), Visit.create({ visitorName: 'John Doe' })])
		expect(store.allRecords()).toHaveLength(2)

		store.clear()
		expect(store.allRecords()).toHaveLength(0)
	})

	it('[S6] get is reactive; unsafeGetWithoutCapture is not', () => {
		const author = Author.create({ name: 'J.R.R Tolkein' })
		store.put([author])

		const reactiveReads: (string | undefined)[] = []
		const unsafeReads: (string | undefined)[] = []
		const stop = react('reader', () => {
			reactiveReads.push(store.get(author.id)?.name)
			unsafeReads.push(store.unsafeGetWithoutCapture(author.id)?.name)
		})

		store.update(author.id, (a) => ({ ...a, name: 'Jimmy Tolks' }))

		expect(reactiveReads).toEqual(['J.R.R Tolkein', 'Jimmy Tolks'])
		stop()

		const unsafeOnly: (string | undefined)[] = []
		const stop2 = react('unsafe-reader', () => {
			unsafeOnly.push(store.unsafeGetWithoutCapture(author.id)?.name)
		})
		store.update(author.id, (a) => ({ ...a, name: 'John Ronald' }))
		// the effect did not re-run because nothing was captured
		expect(unsafeOnly).toEqual(['Jimmy Tolks'])
		stop2()
	})
})

describe('Store: serialization and snapshots (S)', () => {
	let store: Store<LibraryType>

	beforeEach(() => {
		store = new Store({ props: {}, schema: schema() })
		store.put([
			Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') }),
			Book.create({
				title: 'The Hobbit',
				id: Book.createId('hobbit'),
				author: Author.createId('tolkein'),
				numPages: 300,
			}),
			Visit.create({ visitorName: 'John Doe', id: Visit.createId('doe') }),
			Cursor.create({ x: 1, y: 2, id: Cursor.createId('c') }),
		])
	})

	afterEach(() => {
		store.dispose()
	})

	it('[S7] serialize defaults to document scope', () => {
		const typeNames = Object.values(store.serialize()).map((r) => r.typeName)
		expect(typeNames.sort()).toEqual(['author', 'book'])
	})

	it('[S7] serialize filters by the given scope, and "all" includes everything', () => {
		expect(Object.values(store.serialize('session')).map((r) => r.typeName)).toEqual(['visit'])
		expect(Object.values(store.serialize('presence')).map((r) => r.typeName)).toEqual(['cursor'])
		expect(
			Object.values(store.serialize('all'))
				.map((r) => r.typeName)
				.sort()
		).toEqual(['author', 'book', 'cursor', 'visit'])
	})

	it('[S7] scopedTypes maps each scope to its type names', () => {
		expect(store.scopedTypes).toEqual({
			document: new Set(['book', 'author']),
			session: new Set(['visit']),
			presence: new Set(['cursor']),
		})
	})

	it('[S8] getStoreSnapshot bundles the serialized records and schema', () => {
		const snapshot = store.getStoreSnapshot('all')
		expect(snapshot.store).toEqual(store.serialize('all'))
		expect(snapshot.schema).toEqual(store.schema.serialize())
	})

	it('[S9] loadStoreSnapshot replaces all current data', () => {
		const snapshot = store.getStoreSnapshot()

		const store2 = new Store({ props: {}, schema: schema() })
		store2.put([Author.create({ name: 'Someone Else' })])
		store2.loadStoreSnapshot(snapshot)

		expect(store2.serialize('all')).toEqual(store.serialize('document'))
		expect(store2.getStoreSnapshot()).toEqual(snapshot)
		store2.dispose()
	})

	it('[S9] loadStoreSnapshot does not run side effects', () => {
		const snapshot = store.getStoreSnapshot()

		const store2 = new Store({ props: {}, schema: schema() })
		const afterCreate = vi.fn()
		const beforeCreate = vi.fn((r: Book) => r)
		store2.sideEffects.registerAfterCreateHandler('book', afterCreate)
		store2.sideEffects.registerBeforeCreateHandler('book', beforeCreate)

		store2.loadStoreSnapshot(snapshot)

		expect(beforeCreate).not.toHaveBeenCalled()
		expect(afterCreate).not.toHaveBeenCalled()
		// side effects are re-enabled afterwards
		store2.put([Book.create({ title: 'New', author: Author.createId('x') })])
		expect(afterCreate).toHaveBeenCalledTimes(1)
		store2.dispose()
	})

	it('[S9] loadStoreSnapshot migrates the snapshot first', () => {
		const snapshot = store.getStoreSnapshot()
		const up = vi.fn((s: any) => {
			s['book:hobbit'].numPages = 42
		})

		const store2 = new Store<LibraryType>({
			props: {},
			schema: StoreSchema.create<LibraryType>(
				{ book: Book, author: Author, visit: Visit, cursor: Cursor },
				{
					migrations: [
						createMigrationSequence({
							sequenceId: 'com.tldraw',
							retroactive: true,
							sequence: [{ id: 'com.tldraw/1', scope: 'store', up }],
						}),
					],
				}
			),
		})

		store2.loadStoreSnapshot(snapshot)

		expect(up).toHaveBeenCalledTimes(1)
		expect((store2.get(Book.createId('hobbit')) as Book).numPages).toBe(42)
		store2.dispose()
	})

	it('[S9] storage-scope migrations run during loadStoreSnapshot', () => {
		const snapshot = store.getStoreSnapshot()
		const up = vi.fn((storage: any) => {
			const book = storage.get('book:hobbit')
			storage.set('book:hobbit', { ...book, numPages: 42 })
			storage.delete('author:tolkein')
		})

		const store2 = new Store<LibraryType>({
			props: {},
			schema: StoreSchema.create<LibraryType>(
				{ book: Book, author: Author, visit: Visit, cursor: Cursor },
				{
					migrations: [
						createMigrationSequence({
							sequenceId: 'com.tldraw',
							retroactive: true,
							sequence: [{ id: 'com.tldraw/1', scope: 'storage', up }],
						}),
					],
				}
			),
		})

		store2.loadStoreSnapshot(snapshot)

		expect(up).toHaveBeenCalledTimes(1)
		expect((store2.get(Book.createId('hobbit')) as Book).numPages).toBe(42)
		expect(store2.get(Author.createId('tolkein'))).toBeUndefined()
		store2.dispose()
	})

	it('[S9] loadStoreSnapshot throws on migration failure and leaves the store unchanged', () => {
		const snapshot = store.getStoreSnapshot()

		const store2 = new Store({
			props: {},
			schema: StoreSchema.create<Book>({ book: Book }), // no author type
		})
		const existing = Book.create({ title: 'Keep me', author: Author.createId('x') })
		store2.put([existing])

		expect(() => {
			store2.loadStoreSnapshot(snapshot as any)
		}).toThrow('Missing definition for record type author')
		expect(store2.get(existing.id)).toEqual(existing)
		store2.dispose()
	})

	it('[S10] migrateSnapshot returns the snapshot stamped with the current schema', () => {
		const snapshot = store.getStoreSnapshot()
		const migrated = store.migrateSnapshot(snapshot)
		expect(migrated).toEqual(snapshot) // no migrations needed

		expect(() =>
			store.migrateSnapshot({ store: {}, schema: { schemaVersion: -1 } } as any)
		).toThrow('Failed to migrate snapshot')
	})
})

describe('Store: validation (V)', () => {
	let store: Store<LibraryType>

	beforeEach(() => {
		store = new Store({ props: {}, schema: schema() })
	})

	afterEach(() => {
		store.dispose()
	})

	it('[V1] put validates created records', () => {
		expect(() => {
			store.put([
				Book.create({
					// @ts-expect-error - deliberately invalid data
					title: 4,
					author: Author.createId('tolkein'),
				}),
			])
		}).toThrow('invalid book title')
		expect(store.allRecords()).toEqual([])
	})

	it('[V1] put validates updated records', () => {
		const book = Book.create({ title: 'The Hobbit', author: Author.createId('tolkein') })
		store.put([book])

		expect(() => {
			store.put([{ ...book, numPages: -1 }])
		}).toThrow('invalid book numPages')
		expect(store.get(book.id)).toEqual(book)
	})

	it('[V1] the store constructor validates initial data', () => {
		const author = Author.create({ name: 'J.R.R Tolkein' })
		expect(() => {
			new Store({
				props: {},
				schema: schema(),
				initialData: { [author.id]: { ...author, name: 4 } } as any,
			})
		}).toThrow('invalid author name')
	})

	it('[V2] updates pass the previous record to validateUsingKnownGoodVersion', () => {
		const validateUsingKnownGoodVersion = vi.fn((_prev: Author, next: unknown) => next as Author)
		const TrackedAuthor = createRecordType<Author>('author', {
			validator: {
				validate: (r) => r as Author,
				validateUsingKnownGoodVersion,
			},
			scope: 'document',
		})
		const trackedStore = new Store({
			props: {},
			schema: StoreSchema.create<Author>({ author: TrackedAuthor }),
		})

		const author = Author.create({ name: 'J.R.R Tolkein' })
		trackedStore.put([author])
		expect(validateUsingKnownGoodVersion).not.toHaveBeenCalled()

		const updated = { ...author, name: 'Jimmy Tolks' }
		trackedStore.put([updated])
		expect(validateUsingKnownGoodVersion).toHaveBeenCalledWith(author, updated)
		trackedStore.dispose()
	})

	it('[V3] a validation throw rolls back the whole operation', () => {
		const goodAuthor = Author.create({ name: 'Fine' })

		expect(() => {
			store.put([
				goodAuthor,
				Book.create({
					// @ts-expect-error - deliberately invalid data
					title: 4,
					author: goodAuthor.id,
				}),
			])
		}).toThrow()

		// the valid record earlier in the same put was rolled back too
		expect(store.get(goodAuthor.id)).toBeUndefined()
		expect(store.allRecords()).toEqual([])
	})

	it('[V5] store.validate re-validates every record', () => {
		const author = Author.create({ name: 'J.R.R Tolkein' })
		const book = Book.create({ title: 'The Hobbit', author: author.id })
		store.put([author, book])

		const validateRecord = vi.spyOn(store.schema, 'validateRecord')
		store.validate('tests')
		expect(validateRecord).toHaveBeenCalledTimes(2)
		expect(validateRecord).toHaveBeenCalledWith(store, author, 'tests', null)
		expect(validateRecord).toHaveBeenCalledWith(store, book, 'tests', null)
		validateRecord.mockRestore()
	})
})

describe('computed caches (CC)', () => {
	let store: Store<LibraryType>

	beforeEach(() => {
		store = new Store({ props: {}, schema: schema() })
	})

	afterEach(() => {
		store.dispose()
	})

	it('[CC1] get derives for existing records and returns undefined for missing ones', () => {
		const derive = vi.fn((book: Book) => `derived-${book.title}`)
		const cache = store.createComputedCache('cache', derive)

		expect(cache.get(Book.createId('missing'))).toBeUndefined()
		expect(derive).not.toHaveBeenCalled()

		const book = Book.create({ title: 'The Hobbit', author: Author.createId('tolkien') })
		store.put([book])

		expect(cache.get(book.id)).toBe('derived-The Hobbit')
	})

	it('[CC2] values are cached until the record changes', () => {
		const derive = vi.fn((book: Book) => `derived-${book.title}`)
		const cache = store.createComputedCache('cache', derive)

		const book = Book.create({ title: 'The Hobbit', author: Author.createId('tolkien') })
		store.put([book])

		expect(cache.get(book.id)).toBe('derived-The Hobbit')
		expect(cache.get(book.id)).toBe('derived-The Hobbit')
		expect(derive).toHaveBeenCalledTimes(1)

		store.update(book.id, (b) => ({ ...b, title: 'The Hobbit: Updated' }) as Book)

		expect(cache.get(book.id)).toBe('derived-The Hobbit: Updated')
		expect(derive).toHaveBeenCalledTimes(2)
	})

	it('[CC1] a deleted record makes get return undefined again', () => {
		const cache = store.createComputedCache('cache', (book: Book) => book.title)
		const book = Book.create({ title: 'The Hobbit', author: Author.createId('tolkien') })
		store.put([book])

		expect(cache.get(book.id)).toBe('The Hobbit')
		store.remove([book.id])
		expect(cache.get(book.id)).toBeUndefined()
	})

	it('[CC3] areRecordsEqual controls which record changes invalidate the cache', () => {
		const derive = vi.fn((book: Book) => book.title)
		const cache = store.createComputedCache('cache', derive, {
			areRecordsEqual: (a, b) => a.title === b.title,
		})

		const book = Book.create({ title: 'The Hobbit', author: Author.createId('tolkien') })
		store.put([book])
		expect(cache.get(book.id)).toBe('The Hobbit')
		expect(derive).toHaveBeenCalledTimes(1)

		// a change the equality function ignores does not re-derive
		store.update(book.id, (b) => ({ ...b, numPages: 999 }) as Book)
		expect(cache.get(book.id)).toBe('The Hobbit')
		expect(derive).toHaveBeenCalledTimes(1)

		// a change it observes does
		store.update(book.id, (b) => ({ ...b, title: 'New Title' }) as Book)
		expect(cache.get(book.id)).toBe('New Title')
		expect(derive).toHaveBeenCalledTimes(2)
	})

	it('[CC3] areResultsEqual keeps the previous result object for equal results', () => {
		const cache = store.createComputedCache(
			'cache',
			(book: Book) => ({ words: book.title.split(' ') }),
			{ areResultsEqual: (a, b) => a.words.join() === b.words.join() }
		)

		const book = Book.create({ title: 'The Hobbit', author: Author.createId('tolkien') })
		store.put([book])
		const first = cache.get(book.id)

		// the record changed, but the derived result is "equal" -> same object back
		store.update(book.id, (b) => ({ ...b, numPages: 999 }) as Book)
		expect(cache.get(book.id)).toBe(first)
	})

	it('[CC4] the standalone createComputedCache keys caches per context object', () => {
		const derive = vi.fn((context: Store<LibraryType>, book: Book) => `${book.title}-${context.id}`)
		const cache = createComputedCache('standalone', derive)

		const store2 = new Store({ props: {}, schema: schema() })
		const book = Book.create({ title: 'The Hobbit', author: Author.createId('tolkien') })
		store.put([book])
		store2.put([book])

		expect(cache.get(store, book.id)).toBe(`The Hobbit-${store.id}`)
		expect(cache.get(store2, book.id)).toBe(`The Hobbit-${store2.id}`)
		expect(derive).toHaveBeenCalledTimes(2)
		store2.dispose()
	})

	it('[CC4] the standalone cache accepts objects containing a store', () => {
		const cache = createComputedCache(
			'standalone',
			(context: { store: Store<LibraryType> }, book: Book) => `${book.title}-${context.store.id}`
		)

		const book = Book.create({ title: 'The Hobbit', author: Author.createId('tolkien') })
		store.put([book])

		expect(cache.get({ store }, book.id)).toBe(`The Hobbit-${store.id}`)
	})

	it('[CC5] createCache calls create once per record and not for missing ids', () => {
		const create = vi.fn((id: any, recordSignal: any) => {
			// return the record signal itself: the cached value is the record
			return recordSignal
		})
		const cache = store.createCache(create)

		expect(cache.get(Book.createId('missing'))).toBeUndefined()
		expect(create).not.toHaveBeenCalled()

		const book = Book.create({ title: 'The Hobbit', author: Author.createId('tolkien') })
		store.put([book])

		expect(cache.get(book.id)).toEqual(book)
		cache.get(book.id)
		expect(create).toHaveBeenCalledTimes(1)
	})
})

describe('integrity (IC)', () => {
	it('[IC1] ensureStoreIsUsable creates the integrity checker once and runs it', () => {
		const integrityChecker = vi.fn()
		const createIntegrityChecker = vi.fn(() => integrityChecker)
		const integritySchema = StoreSchema.create<LibraryType>(
			{ book: Book, author: Author, visit: Visit, cursor: Cursor },
			{ createIntegrityChecker: createIntegrityChecker as any }
		)
		const store = new Store({ props: {}, schema: integritySchema })

		store.ensureStoreIsUsable()
		store.ensureStoreIsUsable()

		expect(createIntegrityChecker).toHaveBeenCalledTimes(1)
		expect(createIntegrityChecker).toHaveBeenCalledWith(store)
		expect(integrityChecker).toHaveBeenCalledTimes(2)
		store.dispose()
	})

	it('[IC1] the integrity checker runs after mergeRemoteChanges', () => {
		const integrityChecker = vi.fn()
		const integritySchema = StoreSchema.create<LibraryType>(
			{ book: Book, author: Author, visit: Visit, cursor: Cursor },
			{ createIntegrityChecker: (() => integrityChecker) as any }
		)
		const store = new Store({ props: {}, schema: integritySchema })

		store.mergeRemoteChanges(() => {
			store.put([Author.create({ name: 'J.R.R Tolkein' })])
		})

		expect(integrityChecker).toHaveBeenCalled()
		store.dispose()
	})

	it('[IC2] markAsPossiblyCorrupted sets a readable flag', () => {
		const store = new Store({ props: {}, schema: schema() })
		expect(store.isPossiblyCorrupted()).toBe(false)
		store.markAsPossiblyCorrupted()
		expect(store.isPossiblyCorrupted()).toBe(true)
		store.dispose()
	})
})
