import { react } from '@tldraw/state'
import { beforeEach, describe, expect, it, test, vi } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { createRecordType } from './RecordType'
import { HistoryEntry, Store } from './Store'
import { StoreSchema } from './StoreSchema'

// Tests for SPEC.md §6 (atomic operations and the side-effect flush) and §7 (side effect
// handlers). Rule IDs like [AO4] in test names refer to that document.

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	numPages: number
}

const Book = createRecordType<Book>('book', {
	validator: { validate: (book) => book as Book },
	scope: 'document',
}).withDefaultProperties(() => ({ numPages: 1 }))

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
}

const Author = createRecordType<Author>('author', {
	validator: { validate: (author) => author as Author },
	scope: 'document',
})

type LibraryType = Book | Author

const book1Id = Book.createId('darkness')
const book1 = Book.create({ title: 'the left hand of darkness', id: book1Id })
const book2Id = Book.createId('dispossessed')
const book2 = Book.create({ title: 'the dispossessed', id: book2Id })

let store: Store<LibraryType>
beforeEach(() => {
	store = new Store({
		props: {},
		schema: StoreSchema.create<LibraryType>({ book: Book, author: Author }),
	})
})

describe('side effect handlers (SE)', () => {
	it('[SE1] handlers chain in registration order, each receiving the previous output', () => {
		store.sideEffects.registerBeforeCreateHandler('book', (record) => ({
			...record,
			numPages: record.numPages + 10,
		}))
		store.sideEffects.registerBeforeCreateHandler('book', (record) => ({
			...record,
			numPages: record.numPages * 2,
		}))

		store.put([Book.create({ title: 'test', numPages: 5, id: book1Id })])

		// first handler: 5 + 10 = 15, second handler: 15 * 2 = 30
		expect(store.get(book1Id)!.numPages).toBe(30)
	})

	it('[SE1] each register call returns a remover', () => {
		const handler = vi.fn((record: Book) => ({ ...record, title: 'transformed' }))
		const cleanup = store.sideEffects.registerBeforeCreateHandler('book', handler)

		cleanup()
		store.put([book1])

		expect(handler).not.toHaveBeenCalled()
		expect(store.get(book1Id)!.title).toBe(book1.title)
	})

	it('[SE1] register() registers many handlers and returns a single cleanup', () => {
		const beforeCreate = vi.fn((record: Book) => record)
		const afterCreate = vi.fn()
		const beforeChange = vi.fn((_prev: Book, next: Book) => next)
		const afterChange = vi.fn()
		const beforeDelete = vi.fn()
		const afterDelete = vi.fn()

		const cleanup = store.sideEffects.register({
			book: { beforeCreate, afterCreate, beforeChange, afterChange, beforeDelete, afterDelete },
		})

		store.put([book1])
		store.update(book1Id, (b) => ({ ...b, numPages: 2 }))
		store.remove([book1Id])

		expect(beforeCreate).toHaveBeenCalledTimes(1)
		expect(afterCreate).toHaveBeenCalledTimes(1)
		expect(beforeChange).toHaveBeenCalledTimes(1)
		expect(afterChange).toHaveBeenCalledTimes(1)
		expect(beforeDelete).toHaveBeenCalledTimes(1)
		expect(afterDelete).toHaveBeenCalledTimes(1)

		cleanup()
		store.put([book1])
		store.remove([book1Id])
		expect(beforeCreate).toHaveBeenCalledTimes(1)
		expect(afterDelete).toHaveBeenCalledTimes(1)
	})

	it('[SE1] handlers only fire for their registered type', () => {
		const bookHandler = vi.fn()
		store.sideEffects.registerAfterCreateHandler('book', bookHandler)

		store.put([Author.create({ name: 'Ursula K. Le Guin' })])
		expect(bookHandler).not.toHaveBeenCalled()
	})

	it('[SE2] beforeCreate transforms the record that gets stored', () => {
		store.sideEffects.registerBeforeCreateHandler('book', (record, source) => {
			expect(source).toBe('user')
			return { ...record, title: 'transformed' }
		})

		store.put([book1])
		expect(store.get(book1Id)!.title).toBe('transformed')
	})

	it('[SE3] beforeChange transforms the update', () => {
		store.put([book1])

		store.sideEffects.registerBeforeChangeHandler('book', (_prev, next) => ({
			...next,
			title: next.title + '_transformed',
		}))

		store.update(book1Id, (b) => ({ ...b, title: 'updated' }))

		expect(store.get(book1Id)!.title).toBe('updated_transformed')
	})

	it('[SE3] returning prev from beforeChange blocks the update entirely', () => {
		store.put([book1])

		store.sideEffects.registerBeforeChangeHandler('book', (prev, next) => {
			if (next.numPages > 100) return prev
			return next
		})

		const listener = vi.fn()
		store.listen(listener)

		store.update(book1Id, (b) => ({ ...b, numPages: 200 }))

		expect(store.get(book1Id)!.numPages).toBe(1) // unchanged
		expect(listener).not.toHaveBeenCalled() // no history entry either
	})

	it('[SE3] [S3] full blocking requires a reference-preserving validator', () => {
		// a validator that returns a clone defeats the reference-equality skip
		const CloningBook = createRecordType<Book>('book', {
			validator: { validate: (book) => ({ ...(book as Book) }) },
			scope: 'document',
		})
		const cloningStore = new Store<Book>({
			props: {},
			schema: StoreSchema.create<Book>({ book: CloningBook }),
		})
		cloningStore.put([book1])

		cloningStore.sideEffects.registerBeforeChangeHandler('book', (prev) => prev)
		const afterChange = vi.fn()
		cloningStore.sideEffects.registerAfterChangeHandler('book', afterChange)
		const listener = vi.fn()
		cloningStore.listen(listener)

		cloningStore.update(book1Id, (b) => ({ ...b, numPages: 200 }))

		// the value is still blocked, and afterChange is suppressed by deep
		// equality (AO5)...
		expect(cloningStore.get(book1Id)).toEqual(book1)
		expect(afterChange).not.toHaveBeenCalled()
		// ...but a (no-op) history entry is recorded: not a complete no-op
		expect(listener).toHaveBeenCalledTimes(1)
	})

	it('[SE4] beforeDelete can return false to prevent that deletion only', () => {
		store.put([book1, book2])

		store.sideEffects.registerBeforeDeleteHandler('book', (record) => {
			if (record.id === book1Id) return false
			return undefined
		})
		const afterDelete = vi.fn()
		store.sideEffects.registerAfterDeleteHandler('book', afterDelete)

		store.remove([book1Id, book2Id])

		expect(store.has(book1Id)).toBe(true)
		expect(store.has(book2Id)).toBe(false)
		expect(afterDelete).toHaveBeenCalledTimes(1)
		expect(afterDelete.mock.calls[0][0].id).toBe(book2Id)
	})

	it('[SE5] after handlers observe the final state of the operation', () => {
		const onAfterCreate = vi.fn((current: Author) => {
			expect(current).toEqual(
				Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })
			)
			expect(store.get(Author.createId('tolkein'))).toEqual(current)
		})
		store.sideEffects.registerAfterCreateHandler('author', onAfterCreate)
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])
		expect(onAfterCreate).toHaveBeenCalledTimes(1)

		const onAfterChange = vi.fn((prev: Author, current: Author) => {
			expect(prev.name).toBe('J.R.R Tolkein')
			expect(current.name).toBe('Butch Cassidy')
			expect(store.get(Author.createId('tolkein'))!.name).toBe('Butch Cassidy')
		})
		store.sideEffects.registerAfterChangeHandler('author', onAfterChange)
		store.update(Author.createId('tolkein'), (r) => ({ ...r, name: 'Butch Cassidy' }))
		expect(onAfterChange).toHaveBeenCalledTimes(1)

		const onAfterDelete = vi.fn((prev: Author) => {
			expect(prev.name).toBe('Butch Cassidy')
			expect(store.has(Author.createId('tolkein'))).toBe(false)
		})
		store.sideEffects.registerAfterDeleteHandler('author', onAfterDelete)
		store.remove([Author.createId('tolkein')])
		expect(onAfterDelete).toHaveBeenCalledTimes(1)
	})

	it('[SE5] handlers receive the source', () => {
		const sources: string[] = []
		store.sideEffects.registerAfterCreateHandler('book', (_record, source) => {
			sources.push(source)
		})

		store.put([book1])
		store.mergeRemoteChanges(() => {
			store.put([book2])
		})

		expect(sources).toEqual(['user', 'remote'])
	})

	it('[SE6] side effects disabled for an operation bypass all handlers', () => {
		const beforeCreate = vi.fn((r: Book) => ({ ...r, title: 'transformed' }))
		const afterCreate = vi.fn()
		const beforeDelete = vi.fn(() => false as const)
		const afterDelete = vi.fn()
		const operationComplete = vi.fn()

		store.sideEffects.registerBeforeCreateHandler('book', beforeCreate)
		store.sideEffects.registerAfterCreateHandler('book', afterCreate)
		store.sideEffects.registerBeforeDeleteHandler('book', beforeDelete)
		store.sideEffects.registerAfterDeleteHandler('book', afterDelete)
		store.sideEffects.registerOperationCompleteHandler(operationComplete)

		store.atomic(() => {
			store.put([book1])
		}, false)
		expect(store.get(book1Id)!.title).toBe(book1.title) // not transformed

		store.atomic(() => {
			store.remove([book1Id])
		}, false)
		expect(store.has(book1Id)).toBe(false) // beforeDelete could not block

		expect(beforeCreate).not.toHaveBeenCalled()
		expect(afterCreate).not.toHaveBeenCalled()
		expect(beforeDelete).not.toHaveBeenCalled()
		expect(afterDelete).not.toHaveBeenCalled()
		expect(operationComplete).not.toHaveBeenCalled()
	})

	it('[SE6] setIsEnabled(false) keeps handlers off across standalone mutations', () => {
		const beforeCreate = vi.fn((r: Book) => ({ ...r, title: 'transformed' }))
		const afterCreate = vi.fn()
		store.sideEffects.registerBeforeCreateHandler('book', beforeCreate)
		store.sideEffects.registerAfterCreateHandler('book', afterCreate)

		store.sideEffects.setIsEnabled(false)
		store.put([book1])

		expect(beforeCreate).not.toHaveBeenCalled()
		expect(afterCreate).not.toHaveBeenCalled()
		expect(store.get(book1Id)!.title).toBe(book1.title)

		// a nested attempt to switch them back on has no effect either
		store.atomic(() => {
			store.put([book2])
		}, true)
		expect(afterCreate).not.toHaveBeenCalled()

		store.sideEffects.setIsEnabled(true)
		store.remove([book1Id, book2Id])
		store.put([book1])
		expect(afterCreate).toHaveBeenCalledTimes(1)
	})
})

describe('atomic operations (AO)', () => {
	let callbacks: any[] = []

	let onAfterCreate: ReturnType<typeof vi.fn<(...args: any[]) => any>>
	let onAfterChange: ReturnType<typeof vi.fn<(...args: any[]) => any>>
	let onAfterDelete: ReturnType<typeof vi.fn<(...args: any[]) => any>>

	let onBeforeCreate: ReturnType<typeof vi.fn<(...args: any[]) => any>>
	let onBeforeChange: ReturnType<typeof vi.fn<(...args: any[]) => any>>
	let onBeforeDelete: ReturnType<typeof vi.fn<(...args: any[]) => any>>

	let onOperationComplete: ReturnType<typeof vi.fn<(...args: any[]) => any>>

	beforeEach(() => {
		onAfterCreate = vi.fn((record) => callbacks.push({ type: 'create', record }))
		onAfterChange = vi.fn((from, to) => callbacks.push({ type: 'change', from, to }))
		onAfterDelete = vi.fn((record) => callbacks.push({ type: 'delete', record }))

		onBeforeCreate = vi.fn((record) => record)
		onBeforeChange = vi.fn((_from, to) => to)
		onBeforeDelete = vi.fn((_record) => {})

		onOperationComplete = vi.fn(() => callbacks.push({ type: 'complete' }))
		callbacks = []

		store.sideEffects.registerAfterCreateHandler('book', onAfterCreate)
		store.sideEffects.registerAfterChangeHandler('book', onAfterChange)
		store.sideEffects.registerAfterDeleteHandler('book', onAfterDelete)

		store.sideEffects.registerBeforeCreateHandler('book', onBeforeCreate)
		store.sideEffects.registerBeforeChangeHandler('book', onBeforeChange)
		store.sideEffects.registerBeforeDeleteHandler('book', onBeforeDelete)

		store.sideEffects.registerOperationCompleteHandler(onOperationComplete)
	})

	it('[AO1] atomic returns the function result and applies changes as one batch to effects', () => {
		const sizes: number[] = []
		const stop = react('count', () => {
			sizes.push(store.query.ids('book').get().size)
		})

		const result = store.atomic(() => {
			store.put([book1])
			store.put([book2])
			return 'completed'
		})

		expect(result).toBe('completed')
		// the effect saw the empty store, then both books at once
		expect(sizes).toEqual([0, 2])
		stop()
	})

	it('[AO6] after callbacks fire when the outermost atomic completes', () => {
		store.atomic(() => {
			expect(callbacks).toHaveLength(0)

			store.put([book1, book2])

			expect(callbacks).toHaveLength(0)
		})

		expect(callbacks).toMatchObject([
			{ type: 'create', record: { id: book1Id } },
			{ type: 'create', record: { id: book2Id } },
			{ type: 'complete' },
		])
	})

	it('[AO2] nested atomic calls fold into the outer operation', () => {
		store.atomic(() => {
			store.put([book1])
			store.atomic(() => {
				store.put([book2])
			})
			expect(callbacks).toHaveLength(0)
		})

		expect(callbacks).toMatchObject([
			{ type: 'create', record: { id: book1Id } },
			{ type: 'create', record: { id: book2Id } },
			{ type: 'complete' },
		])
	})

	it('[AO2] mergeRemoteChanges inside an atomic operation throws', () => {
		expect(() => {
			store.atomic(() => {
				store.mergeRemoteChanges(() => {
					// never reached
				})
			})
		}).toThrow('Cannot merge remote changes while in atomic operation')
	})

	it('[AO3] runCallbacks: false disables the before handlers', () => {
		store.atomic(() => {
			store.put([book1])
		}, false)

		expect(onBeforeCreate).not.toHaveBeenCalled()
		expect(onAfterCreate).not.toHaveBeenCalled()
		expect(store.has(book1Id)).toBe(true)
	})

	test('[AO3] a nested atomic can switch callbacks off but not back on', () => {
		store.atomic(() => {
			store.put([book1])
			store.atomic(() => {
				store.put([book2])
			}, false)
		})

		expect(onBeforeCreate).toHaveBeenCalledTimes(1)
		expect(onAfterCreate).toHaveBeenCalledTimes(2)

		store.atomic(() => {
			store.update(book1Id, (book) => ({ ...book, numPages: book.numPages + 1 }))
			store.atomic(() => {
				store.update(book2Id, (book) => ({ ...book, numPages: book.numPages + 1 }))
			}, false)
		})

		expect(onBeforeChange).toHaveBeenCalledTimes(1)
		expect(onAfterChange).toHaveBeenCalledTimes(2)

		store.atomic(() => {
			store.remove([book1Id])
			store.atomic(() => {
				store.remove([book2Id])
			}, false)
		})
		expect(onBeforeDelete).toHaveBeenCalledTimes(1)
		expect(onAfterDelete).toHaveBeenCalledTimes(2)

		// switching ON inside an OFF block does not work
		store.atomic(() => {
			store.atomic(() => {
				store.put([book1])
			}, true)
		}, false)
		expect(onBeforeCreate).toHaveBeenCalledTimes(1)
	})

	it('[AO4] a record created then deleted in one operation produces no callbacks', () => {
		store.atomic(() => {
			store.put([book1])
			store.remove([book1Id])
		})
		expect(callbacks).toMatchObject([{ type: 'complete' }])
	})

	it('[AO4] a record created then updated produces one afterCreate with the final value', () => {
		store.atomic(() => {
			store.put([book1])
			store.update(book1Id, (b) => ({ ...b, numPages: 99 }))
		})

		expect(onAfterCreate).toHaveBeenCalledTimes(1)
		expect(onAfterChange).not.toHaveBeenCalled()
		expect(onAfterCreate.mock.calls[0][0].numPages).toBe(99)
	})

	it('[AO4] a record updated repeatedly produces one afterChange spanning first to last', () => {
		store.put([book1])
		callbacks = []

		store.atomic(() => {
			store.update(book1Id, (b) => ({ ...b, numPages: 2 }))
			store.update(book1Id, (b) => ({ ...b, numPages: 3 }))
			store.update(book1Id, (b) => ({ ...b, numPages: 4 }))
		})

		expect(onAfterChange).toHaveBeenCalledTimes(1)
		expect(onAfterChange.mock.calls[0][0].numPages).toBe(1) // before
		expect(onAfterChange.mock.calls[0][1].numPages).toBe(4) // after
	})

	test('[AO5] a round trip back to a deep-equal value does not fire afterChange', () => {
		const book1A = book1
		const book1B = { ...book1, title: book1.title + ' is a really great book fr fr' }
		const book1C = structuredClone(book1A)
		store.put([book1A])

		store.atomic(() => {
			store.put([book1B])
			store.put([book1C])
		})
		expect(onAfterChange).toHaveBeenCalledTimes(0)

		store.atomic(() => {
			store.put([book1B])
			store.put([book1C])
			store.put([book1B])
		})

		expect(onAfterChange).toHaveBeenCalledTimes(1)
	})

	it('[AO6] changes made by after handlers run another round, with a depth limit', () => {
		let limit = 10
		onAfterCreate.mockImplementation((record: any) => {
			if (record.numPages < limit) {
				store.put([{ ...record, numPages: record.numPages + 1 }])
			}
		})
		onAfterChange.mockImplementation((_from: any, to: any) => {
			if (to.numPages < limit) {
				store.put([{ ...to, numPages: to.numPages + 1 }])
			}
		})

		// this should be fine:
		store.put([book1])
		expect(store.get(book1Id)!.numPages).toBe(limit)

		// if we increase the limit, it should bail out:
		limit = 10000
		store.clear()
		expect(() => {
			store.put([book2])
		}).toThrowErrorMatchingInlineSnapshot(
			`[Error: Maximum store update depth exceeded, bailing out]`
		)
	})

	it('[AO7] operationComplete keeps firing until the operation quiesces', () => {
		// steps:
		// 0, 1, 2: after change increment pages
		// 3: after change, do nothing
		// 4: operation complete, increment pages by 1000
		// 5, 6: after change increment pages
		// 7: after change, do nothing
		// 8: operation complete, do nothing
		// 9: done!
		let step = 0

		store.put([book1])

		onAfterChange.mockImplementation((_prev: any, next: any) => {
			if ([0, 1, 2, 5, 6].includes(step)) {
				step++
				store.put([{ ...next, numPages: next.numPages + 1 }])
			} else if ([3, 7].includes(step)) {
				step++
			} else {
				throw new Error(`Wrong step: ${step}`)
			}
		})

		onOperationComplete.mockImplementation(() => {
			if (step === 4) {
				step++
				const book = store.get(book1Id)!
				store.put([{ ...book, numPages: book.numPages + 1000 }])
			} else if (step === 8) {
				step++
			} else {
				throw new Error(`Wrong step: ${step}`)
			}
		})

		store.put([{ ...book1, numPages: 2 }])

		expect(store.get(book1Id)!.numPages).toBe(1007)
		expect(step).toBe(9)
	})

	it('[AO8] nested mergeRemoteChanges just runs its function', () => {
		const sources: string[] = []
		store.sideEffects.registerAfterCreateHandler('book', (_r, source) => sources.push(source))

		store.mergeRemoteChanges(() => {
			store.put([book1])
			store.mergeRemoteChanges(() => {
				store.put([book2])
			})
		})

		expect(sources).toEqual(['remote', 'remote'])
	})

	test('[AO8] side-effect cascades from remote changes are attributed to user', () => {
		const diffs: HistoryEntry<LibraryType>[] = []
		store.listen((entry) => {
			diffs.push(entry)
		})

		const firstOrderEffectSources: string[] = []
		store.sideEffects.registerAfterCreateHandler('book', (record, source) => {
			firstOrderEffectSources.push(source)
			if (record.title.startsWith('Harry Potter')) {
				store.put([{ ...record, title: record.title + ' is a really great book fr fr' }])
			}
		})

		const secondOrderEffectSources: string[] = []
		store.sideEffects.registerAfterChangeHandler('book', (_from, _to, source) => {
			secondOrderEffectSources.push(source)
		})

		store.mergeRemoteChanges(() => {
			store.put([{ ...book1, title: "Harry Potter and the Philosopher's Stone" }])
		})

		expect(firstOrderEffectSources).toEqual(['remote'])
		// recursive changes are always user
		expect(secondOrderEffectSources).toEqual(['user'])

		expect(diffs).toMatchObject([
			{
				source: 'remote',
				changes: {
					added: { [book1Id]: { title: "Harry Potter and the Philosopher's Stone" } },
				},
			},
			{
				source: 'user',
				changes: {
					updated: {
						[book1Id]: [
							{ title: "Harry Potter and the Philosopher's Stone" },
							{
								title: "Harry Potter and the Philosopher's Stone is a really great book fr fr",
							},
						],
					},
				},
			},
		])
	})
})
