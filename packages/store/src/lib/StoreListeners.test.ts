import { react, RESET_VALUE, transact } from '@tldraw/state'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { RecordsDiff, reverseRecordsDiff } from './RecordsDiff'
import { createRecordType } from './RecordType'
import { Store } from './Store'
import { StoreSchema } from './StoreSchema'

// Tests for SPEC.md §8 (history and listeners).
// Rule IDs like [H4] in test names refer to that document.

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	author: RecordId<Author>
	numPages: number
}

const Book = createRecordType<Book>('book', {
	validator: { validate: (book) => book as Book },
	scope: 'document',
}).withDefaultProperties(() => ({ numPages: 100 }))

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
	isPseudonym: boolean
}

const Author = createRecordType<Author>('author', {
	validator: { validate: (author) => author as Author },
	scope: 'document',
}).withDefaultProperties(() => ({ isPseudonym: false }))

interface Visit extends BaseRecord<'visit', RecordId<Visit>> {
	visitorName: string
	lastActive: number
}

const Visit = createRecordType<Visit>('visit', {
	validator: { validate: (visit) => visit as Visit },
	scope: 'session',
	ephemeralKeys: { visitorName: false, lastActive: true },
}).withDefaultProperties(() => ({ visitorName: 'Anonymous', lastActive: 0 }))

interface Cursor extends BaseRecord<'cursor', RecordId<Cursor>> {
	x: number
}

const Cursor = createRecordType<Cursor>('cursor', {
	scope: 'presence',
}).withDefaultProperties(() => ({ x: 0 }))

type LibraryType = Book | Author | Visit | Cursor

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

const tolkein = () => Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })
const hobbit = () =>
	Book.create({
		title: 'The Hobbit',
		id: Book.createId('hobbit'),
		author: Author.createId('tolkein'),
		numPages: 300,
	})

describe('the history atom (H)', () => {
	it('[H1] increments by exactly one per committed change-set, carrying the diff', () => {
		let lastDiff: RecordsDiff<LibraryType>[] | typeof RESET_VALUE | undefined
		const stop = react('history', (lastReactedEpoch) => {
			store.history.get()
			lastDiff = store.history.getDiffSince(lastReactedEpoch)
		})

		const before = store.history.get()
		const author = tolkein()
		store.put([author])

		expect(store.history.get()).toBe(before + 1)
		expect(lastDiff).toEqual([{ added: { [author.id]: author }, updated: {}, removed: {} }])

		// a transaction with several mutations commits as one change per put/remove call
		transact(() => {
			store.put([hobbit()])
			store.remove([author.id])
		})
		expect(store.history.get()).toBe(before + 3)
		stop()
	})
})

describe('listeners (H)', () => {
	it('[H2] listen returns a remover and notification is deferred to the next frame', async () => {
		try {
			// @ts-expect-error - test-only escape hatch
			globalThis.__FORCE_RAF_IN_TESTS__ = true
			const listener = vi.fn()
			const removeListener = store.listen(listener)

			store.put([tolkein()])
			// not called synchronously
			expect(listener).toHaveBeenCalledTimes(0)

			await new Promise((resolve) => requestAnimationFrame(resolve))
			expect(listener).toHaveBeenCalledTimes(1)

			removeListener()
			store.put([hobbit()])
			await new Promise((resolve) => requestAnimationFrame(resolve))
			expect(listener).toHaveBeenCalledTimes(1)
		} finally {
			// @ts-expect-error - test-only escape hatch
			globalThis.__FORCE_RAF_IN_TESTS__ = false
		}
	})

	it('[H3] a flush squashes adjacent same-source entries, preserving source boundaries', async () => {
		try {
			// @ts-expect-error - test-only escape hatch
			globalThis.__FORCE_RAF_IN_TESTS__ = true
			const entries: Array<{ source: string; addedIds: string[] }> = []
			store.listen((entry) => {
				entries.push({ source: entry.source, addedIds: Object.keys(entry.changes.added) })
			})

			const author = tolkein()
			const book = hobbit()
			const remoteAuthor = Author.create({ name: 'Remote', id: Author.createId('remote') })
			const lastAuthor = Author.create({ name: 'Last', id: Author.createId('last') })

			store.put([author])
			store.put([book])
			store.mergeRemoteChanges(() => {
				store.put([remoteAuthor])
			})
			store.put([lastAuthor])

			await new Promise((resolve) => requestAnimationFrame(resolve))

			// [user, user, remote, user] -> [user, remote, user]
			expect(entries).toEqual([
				{ source: 'user', addedIds: [author.id, book.id] },
				{ source: 'remote', addedIds: [remoteAuthor.id] },
				{ source: 'user', addedIds: [lastAuthor.id] },
			])
		} finally {
			// @ts-expect-error - test-only escape hatch
			globalThis.__FORCE_RAF_IN_TESTS__ = false
		}
	})

	it('[H3] changes within one transaction arrive as one squashed entry', async () => {
		const listener = vi.fn()
		store.listen(listener)

		const author = tolkein()
		transact(() => {
			store.put([author])
			store.update(author.id, (r) => ({ ...r, name: 'Jimmy Tolks' }))
		})

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(listener).toHaveBeenCalledTimes(1)
		expect(listener.mock.calls[0][0]).toEqual({
			source: 'user',
			changes: {
				added: { [author.id]: { ...author, name: 'Jimmy Tolks' } },
				updated: {},
				removed: {},
			},
		})
	})

	it('[H4] source filters drop entries from other sources', () => {
		const userListener = vi.fn()
		const remoteListener = vi.fn()
		store.listen(userListener, { source: 'user' })
		store.listen(remoteListener, { source: 'remote' })

		store.put([tolkein()])
		expect(userListener).toHaveBeenCalledTimes(1)
		expect(remoteListener).toHaveBeenCalledTimes(0)

		store.mergeRemoteChanges(() => {
			store.put([hobbit()])
		})
		expect(userListener).toHaveBeenCalledTimes(1)
		expect(remoteListener).toHaveBeenCalledTimes(1)
		expect(remoteListener.mock.calls[0][0].source).toBe('remote')
	})

	it('[H4] scope filters reduce each entry to records of that scope', () => {
		const documentListener = vi.fn()
		const sessionListener = vi.fn()
		const presenceListener = vi.fn()

		store.listen(documentListener, { scope: 'document' })
		store.listen(sessionListener, { scope: 'session' })
		store.listen(presenceListener, { scope: 'presence' })

		const author = tolkein()
		const visit = Visit.create({ visitorName: 'John Doe' })
		const cursor = Cursor.create({ x: 1 })

		store.put([author, visit, cursor])

		expect(documentListener).toHaveBeenCalledTimes(1)
		expect(Object.keys(documentListener.mock.calls[0][0].changes.added)).toEqual([author.id])

		expect(sessionListener).toHaveBeenCalledTimes(1)
		expect(Object.keys(sessionListener.mock.calls[0][0].changes.added)).toEqual([visit.id])

		expect(presenceListener).toHaveBeenCalledTimes(1)
		expect(Object.keys(presenceListener.mock.calls[0][0].changes.added)).toEqual([cursor.id])
	})

	it('[H4] a listener is not called when its scope filter leaves nothing', () => {
		const sessionListener = vi.fn()
		store.listen(sessionListener, { scope: 'session' })

		// document-only change
		store.put([tolkein(), hobbit()])
		expect(sessionListener).toHaveBeenCalledTimes(0)

		// mixed change still arrives, filtered
		store.put([Visit.create({ visitorName: 'Jimmy Beans' }), Author.create({ name: 'Other' })])
		expect(sessionListener).toHaveBeenCalledTimes(1)
	})

	it('[H5] a new listener never sees changes made before it subscribed', async () => {
		try {
			// @ts-expect-error - test-only escape hatch
			globalThis.__FORCE_RAF_IN_TESTS__ = true
			store.put([tolkein()])
			const firstListener = vi.fn()
			store.listen(firstListener)
			expect(firstListener).toHaveBeenCalledTimes(0)

			store.put([Author.create({ name: 'Chips McCoy', id: Author.createId('chips') })])

			expect(firstListener).toHaveBeenCalledTimes(0)

			// attaching a second listener flushes pending history to the first
			const secondListener = vi.fn()
			store.listen(secondListener)

			expect(firstListener).toHaveBeenCalledTimes(1)
			expect(secondListener).toHaveBeenCalledTimes(0)

			await new Promise((resolve) => requestAnimationFrame(resolve))

			expect(firstListener).toHaveBeenCalledTimes(1)
			expect(secondListener).toHaveBeenCalledTimes(0)
		} finally {
			// @ts-expect-error - test-only escape hatch
			globalThis.__FORCE_RAF_IN_TESTS__ = false
		}
	})

	it('[H6] accumulated history is discarded while no listeners are attached', () => {
		store.put([tolkein()])
		// H6 has no public observation point, so this reaches into private state
		expect((store as any).historyAccumulator._history).toHaveLength(0)
	})
})

describe('extracting and intercepting changes (H)', () => {
	const authorId = Author.createId('tolkein')
	const bookId = Book.createId('hobbit')

	it('[H7] extractingChanges returns the squashed diff of exactly the changes in fn', () => {
		const author = tolkein()
		const book = hobbit()

		expect(
			store.extractingChanges(() => {
				store.put([author])
				store.put([book])
			})
		).toEqual({
			added: { [author.id]: author, [book.id]: book },
			updated: {},
			removed: {},
		})

		const renamed = { ...book, title: 'The Hobbit: There and Back Again' }
		expect(
			store.extractingChanges(() => {
				store.remove([authorId])
				store.update(bookId, () => renamed)
			})
		).toEqual({
			added: {},
			updated: { [book.id]: [book, renamed] },
			removed: { [author.id]: author },
		})
	})

	it('[H7] listeners still see changes made inside extractingChanges', () => {
		const listener = vi.fn()
		store.listen(listener)

		store.extractingChanges(() => {
			store.put([tolkein()])
		})

		expect(listener).toHaveBeenCalledTimes(1)
	})

	it('[H8] addHistoryInterceptor sees every change-set synchronously, with its source', () => {
		const entries: any[] = []
		const interceptor = vi.fn((entry, source) => entries.push({ entry, source }))
		const remove = store.addHistoryInterceptor(interceptor)

		const author = tolkein()
		store.put([author])
		expect(interceptor).toHaveBeenCalledTimes(1)
		expect(entries[0].source).toBe('user')
		expect(entries[0].entry.changes.added).toEqual({ [author.id]: author })

		store.mergeRemoteChanges(() => {
			store.put([hobbit()])
		})
		expect(interceptor).toHaveBeenCalledTimes(2)
		expect(entries[1].source).toBe('remote')

		remove()
		store.remove([author.id])
		expect(interceptor).toHaveBeenCalledTimes(2)
	})
})

describe('applying diffs (H)', () => {
	const authorId = Author.createId('tolkein')
	const bookId = Book.createId('hobbit')

	it('[H9] applyDiff puts added and updated records and removes removed ones', () => {
		const author = tolkein()
		store.applyDiff({
			added: { [author.id]: author },
			updated: {},
			removed: {},
		} as RecordsDiff<LibraryType>)
		expect(store.get(authorId)).toEqual(author)

		const renamed = { ...author, name: 'Jimmy Tolks' }
		store.applyDiff({
			added: {},
			updated: { [author.id]: [author, renamed] },
			removed: {},
		} as RecordsDiff<LibraryType>)
		expect(store.get(authorId)).toEqual(renamed)

		store.applyDiff({
			added: {},
			updated: {},
			removed: { [author.id]: renamed },
		} as RecordsDiff<LibraryType>)
		expect(store.has(authorId)).toBe(false)
	})

	it('[H9] applying a diff and then its reverse restores the prior state', () => {
		store.put([tolkein(), hobbit()])

		const checkpoint1 = store.getStoreSnapshot()

		const forwardsDiff = store.extractingChanges(() => {
			store.remove([authorId])
			store.update(bookId, (book) => ({ ...book, title: 'The Hobbit: There and Back Again' }))
		})

		const checkpoint2 = store.getStoreSnapshot()

		store.applyDiff(reverseRecordsDiff(forwardsDiff))
		expect(store.getStoreSnapshot()).toEqual(checkpoint1)

		store.applyDiff(forwardsDiff)
		expect(store.getStoreSnapshot()).toEqual(checkpoint2)
	})

	it('[H9] runCallbacks: false applies the diff without side effects', () => {
		const afterCreate = vi.fn()
		store.sideEffects.registerAfterCreateHandler('author', afterCreate)

		const author = tolkein()
		store.applyDiff(
			{ added: { [author.id]: author }, updated: {}, removed: {} } as RecordsDiff<LibraryType>,
			{ runCallbacks: false }
		)

		expect(store.get(authorId)).toEqual(author)
		expect(afterCreate).not.toHaveBeenCalled()
	})

	describe('[H10] ignoreEphemeralKeys', () => {
		const visitId = Visit.createId('jane')
		const visit = () => Visit.create({ id: visitId, visitorName: 'Jane', lastActive: 100 })

		it('drops updates that touch only ephemeral keys', () => {
			store.put([visit()])
			const listener = vi.fn()
			store.listen(listener)

			store.applyDiff(
				{
					added: {},
					updated: { [visitId]: [visit(), { ...visit(), lastActive: 999 }] },
					removed: {},
				} as RecordsDiff<LibraryType>,
				{ ignoreEphemeralKeys: true }
			)

			expect((store.get(visitId) as Visit).lastActive).toBe(100)
			expect(listener).not.toHaveBeenCalled()
		})

		it('merges non-ephemeral changes onto the stored record, keeping ephemeral values', () => {
			store.put([visit()])

			store.applyDiff(
				{
					added: {},
					updated: {
						[visitId]: [visit(), { ...visit(), visitorName: 'Janet', lastActive: 999 }],
					},
					removed: {},
				} as RecordsDiff<LibraryType>,
				{ ignoreEphemeralKeys: true }
			)

			const result = store.get(visitId) as Visit
			expect(result.visitorName).toBe('Janet')
			expect(result.lastActive).toBe(100) // the stored ephemeral value is kept
		})

		it('applies updates for missing records, and added records, in full', () => {
			store.applyDiff(
				{
					added: {},
					updated: {
						[visitId]: [visit(), { ...visit(), visitorName: 'Janet', lastActive: 999 }],
					},
					removed: {},
				} as RecordsDiff<LibraryType>,
				{ ignoreEphemeralKeys: true }
			)

			const result = store.get(visitId) as Visit
			expect(result.visitorName).toBe('Janet')
			expect(result.lastActive).toBe(999)
		})
	})
})
