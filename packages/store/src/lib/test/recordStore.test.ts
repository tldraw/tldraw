import { Computed, react, RESET_VALUE, transact } from '@tldraw/state'
import { vi } from 'vitest'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createMigrationSequence } from '../migrate'
import { RecordsDiff, reverseRecordsDiff } from '../RecordsDiff'
import { createRecordType } from '../RecordType'
import { CollectionDiff, HistoryEntry, Store } from '../Store'
import { StoreSchema } from '../StoreSchema'

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	author: RecordId<Author>
	numPages: number
}

const Book = createRecordType<Book>('book', {
	validator: { validate: (book) => book as Book },
	scope: 'document',
})

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
	isPseudonym: boolean
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
}

const Visit = createRecordType<Visit>('visit', {
	validator: { validate: (visit) => visit as Visit },
	scope: 'session',
}).withDefaultProperties(() => ({
	visitorName: 'Anonymous',
	booksInBasket: [],
}))

type LibraryType = Book | Author | Visit

describe('Store', () => {
	let store: Store<Book | Author | Visit>
	beforeEach(() => {
		store = new Store({
			props: {},
			schema: StoreSchema.create<LibraryType>({
				book: Book,
				author: Author,
				visit: Visit,
			}),
		})
	})

	it('allows records to be added', () => {
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])
		expect(store.query.records('author').get()).toEqual([
			{ id: 'author:tolkein', typeName: 'author', name: 'J.R.R Tolkein', isPseudonym: false },
		])

		store.put([
			{
				id: Book.createId('the-hobbit'),
				typeName: 'book',
				title: 'The Hobbit',
				numPages: 423,
				author: Author.createId('tolkein'),
			},
		])

		expect(store.query.records('book').get()).toEqual([
			{
				id: 'book:the-hobbit',
				typeName: 'book',
				title: 'The Hobbit',
				numPages: 423,
				author: 'author:tolkein',
			},
		])
	})

	describe('with history', () => {
		let authorHistory: Computed<number, RecordsDiff<Author>>
		let lastDiff: RecordsDiff<Author>[] | typeof RESET_VALUE = 'undefined' as any
		beforeEach(() => {
			authorHistory = store.query.filterHistory('author')
			react('', (lastReactedEpoch) => {
				lastDiff = authorHistory.getDiffSince(lastReactedEpoch)
			})

			expect(lastDiff!).toBe(RESET_VALUE)
		})

		it('allows listening to the change history', () => {
			store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])

			expect(lastDiff!).toMatchInlineSnapshot(`
			        [
			          {
			            "added": {
			              "author:tolkein": {
			                "id": "author:tolkein",
			                "isPseudonym": false,
			                "name": "J.R.R Tolkein",
			                "typeName": "author",
			              },
			            },
			            "removed": {},
			            "updated": {},
			          },
			        ]
		      `)

			store.update(Author.createId('tolkein'), (r) => ({ ...r, name: 'Jimmy Tolks' }))

			expect(lastDiff!).toMatchInlineSnapshot(`
			        [
			          {
			            "added": {},
			            "removed": {},
			            "updated": {
			              "author:tolkein": [
			                {
			                  "id": "author:tolkein",
			                  "isPseudonym": false,
			                  "name": "J.R.R Tolkein",
			                  "typeName": "author",
			                },
			                {
			                  "id": "author:tolkein",
			                  "isPseudonym": false,
			                  "name": "Jimmy Tolks",
			                  "typeName": "author",
			                },
			              ],
			            },
			          },
			        ]
		      `)

			store.remove([Author.createId('tolkein')])

			expect(lastDiff!).toMatchInlineSnapshot(`
			        [
			          {
			            "added": {},
			            "removed": {
			              "author:tolkein": {
			                "id": "author:tolkein",
			                "isPseudonym": false,
			                "name": "Jimmy Tolks",
			                "typeName": "author",
			              },
			            },
			            "updated": {},
			          },
			        ]
		      `)

			transact(() => {
				store.put([
					Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') }),
					Author.create({ name: 'David Foster Wallace', id: Author.createId('dfw') }),
					Author.create({ name: 'Cynan Jones', id: Author.createId('cj') }),
				])

				store.update(Author.createId('tolkein'), (r) => ({ ...r, name: 'Jimmy Tolks' }))
				store.update(Author.createId('cj'), (r) => ({ ...r, name: 'Carter, Jimmy' }))
			})

			expect(lastDiff!).toMatchInlineSnapshot(`
			[
			  {
			    "added": {
			      "author:cj": {
			        "id": "author:cj",
			        "isPseudonym": false,
			        "name": "Carter, Jimmy",
			        "typeName": "author",
			      },
			      "author:dfw": {
			        "id": "author:dfw",
			        "isPseudonym": false,
			        "name": "David Foster Wallace",
			        "typeName": "author",
			      },
			      "author:tolkein": {
			        "id": "author:tolkein",
			        "isPseudonym": false,
			        "name": "Jimmy Tolks",
			        "typeName": "author",
			      },
			    },
			    "removed": {},
			    "updated": {},
			  },
			]
		`)
		})
	})

	it('allows adding onAfterChange callbacks that see the final state of the world', () => {
		/* ADDING */
		const onAfterCreate = vi.fn((current) => {
			expect(current).toEqual(
				Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })
			)
			expect([...store.query.ids('author').get()]).toEqual([Author.createId('tolkein')])
		})
		store.sideEffects.registerAfterCreateHandler('author', onAfterCreate)
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])

		expect(onAfterCreate).toHaveBeenCalledTimes(1)

		/* UPDATING */
		const onAfterChange = vi.fn((prev, current) => {
			expect(prev.name).toBe('J.R.R Tolkein')
			expect(current.name).toBe('Butch Cassidy')

			expect(store.get(Author.createId('tolkein'))!.name).toBe('Butch Cassidy')
		})
		store.sideEffects.registerAfterChangeHandler('author', onAfterChange)

		store.update(Author.createId('tolkein'), (r) => ({ ...r, name: 'Butch Cassidy' }))

		expect(onAfterChange).toHaveBeenCalledTimes(1)

		/* REMOVING */
		const onAfterDelete = vi.fn((prev) => {
			if (prev.typeName === 'author') {
				expect(prev.name).toBe('Butch Cassidy')
			}
		})
		store.sideEffects.registerAfterDeleteHandler('author', onAfterDelete)

		store.remove([Author.createId('tolkein')])

		expect(onAfterDelete).toHaveBeenCalledTimes(1)
	})

	it('allows finding and filtering records with a predicate', () => {
		store.put([
			Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') }),
			Author.create({ name: 'James McAvoy', id: Author.createId('mcavoy') }),
			Author.create({ name: 'Butch Cassidy', id: Author.createId('cassidy') }),
			Author.create({ name: 'Cynan Jones', id: Author.createId('cj') }),
			Author.create({ name: 'David Foster Wallace', id: Author.createId('dfw') }),
		])
		const Js = store.query
			.records('author')
			.get()
			.filter((r) => r.name.startsWith('J'))
		expect(Js.map((j) => j.name).sort()).toEqual(['J.R.R Tolkein', 'James McAvoy'])

		const david = store.query
			.records('author')
			.get()
			.find((r) => r.name.startsWith('David'))
		expect(david?.name).toBe('David Foster Wallace')
	})

	it('allows keeping track of the ids of a particular type', () => {
		let lastIdDiff: CollectionDiff<RecordId<Author>>[] | RESET_VALUE = []

		const authorIds = store.query.ids('author')

		react('', (lastReactedEpoch) => {
			lastIdDiff = authorIds.getDiffSince(lastReactedEpoch)
		})

		expect(lastIdDiff).toBe(RESET_VALUE)

		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])

		expect(lastIdDiff).toMatchInlineSnapshot(`
		      [
		        {
		          "added": Set {
		            "author:tolkein",
		          },
		        },
		      ]
	    `)

		transact(() => {
			store.put([Author.create({ name: 'James McAvoy', id: Author.createId('mcavoy') })])
			store.put([Author.create({ name: 'Butch Cassidy', id: Author.createId('cassidy') })])
			store.remove([Author.createId('tolkein')])
		})

		expect(lastIdDiff).toMatchInlineSnapshot(`
		      [
		        {
		          "added": Set {
		            "author:mcavoy",
		            "author:cassidy",
		          },
		          "removed": Set {
		            "author:tolkein",
		          },
		        },
		      ]
	    `)
	})

	it('supports listening for changes to the whole store', async () => {
		const listener = vi.fn()
		store.listen(listener)

		transact(() => {
			store.put([
				Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') }),
				Author.create({ name: 'James McAvoy', id: Author.createId('mcavoy') }),
				Author.create({ name: 'Butch Cassidy', id: Author.createId('cassidy') }),
				Book.create({
					title: 'The Hobbit',
					id: Book.createId('hobbit'),
					author: Author.createId('tolkein'),
					numPages: 300,
				}),
			])
			store.put([
				Book.create({
					title: 'The Lord of the Rings',
					id: Book.createId('lotr'),
					author: Author.createId('tolkein'),
					numPages: 1000,
				}),
			])
		})

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(listener).toHaveBeenCalledTimes(1)
		expect(listener.mock.lastCall?.[0]).toMatchInlineSnapshot(`
		{
		  "changes": {
		    "added": {
		      "author:cassidy": {
		        "id": "author:cassidy",
		        "isPseudonym": false,
		        "name": "Butch Cassidy",
		        "typeName": "author",
		      },
		      "author:mcavoy": {
		        "id": "author:mcavoy",
		        "isPseudonym": false,
		        "name": "James McAvoy",
		        "typeName": "author",
		      },
		      "author:tolkein": {
		        "id": "author:tolkein",
		        "isPseudonym": false,
		        "name": "J.R.R Tolkein",
		        "typeName": "author",
		      },
		      "book:hobbit": {
		        "author": "author:tolkein",
		        "id": "book:hobbit",
		        "numPages": 300,
		        "title": "The Hobbit",
		        "typeName": "book",
		      },
		      "book:lotr": {
		        "author": "author:tolkein",
		        "id": "book:lotr",
		        "numPages": 1000,
		        "title": "The Lord of the Rings",
		        "typeName": "book",
		      },
		    },
		    "removed": {},
		    "updated": {},
		  },
		  "source": "user",
		}
	`)

		transact(() => {
			store.update(Author.createId('tolkein'), (author) => ({
				...author,
				name: 'Jimmy Tolks',
			}))
			store.update(Book.createId('lotr'), (book) => ({ ...book, numPages: 42 }))
		})

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(listener).toHaveBeenCalledTimes(2)

		expect(listener.mock.lastCall?.[0]).toMatchInlineSnapshot(`
		{
		  "changes": {
		    "added": {},
		    "removed": {},
		    "updated": {
		      "author:tolkein": [
		        {
		          "id": "author:tolkein",
		          "isPseudonym": false,
		          "name": "J.R.R Tolkein",
		          "typeName": "author",
		        },
		        {
		          "id": "author:tolkein",
		          "isPseudonym": false,
		          "name": "Jimmy Tolks",
		          "typeName": "author",
		        },
		      ],
		      "book:lotr": [
		        {
		          "author": "author:tolkein",
		          "id": "book:lotr",
		          "numPages": 1000,
		          "title": "The Lord of the Rings",
		          "typeName": "book",
		        },
		        {
		          "author": "author:tolkein",
		          "id": "book:lotr",
		          "numPages": 42,
		          "title": "The Lord of the Rings",
		          "typeName": "book",
		        },
		      ],
		    },
		  },
		  "source": "user",
		}
	`)

		transact(() => {
			store.update(Author.createId('mcavoy'), (author) => ({
				...author,
				name: 'Sookie Houseboat',
			}))
			store.remove([Book.createId('lotr')])
		})

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(listener).toHaveBeenCalledTimes(3)

		expect(listener.mock.lastCall?.[0]).toMatchInlineSnapshot(`
		{
		  "changes": {
		    "added": {},
		    "removed": {
		      "book:lotr": {
		        "author": "author:tolkein",
		        "id": "book:lotr",
		        "numPages": 42,
		        "title": "The Lord of the Rings",
		        "typeName": "book",
		      },
		    },
		    "updated": {
		      "author:mcavoy": [
		        {
		          "id": "author:mcavoy",
		          "isPseudonym": false,
		          "name": "James McAvoy",
		          "typeName": "author",
		        },
		        {
		          "id": "author:mcavoy",
		          "isPseudonym": false,
		          "name": "Sookie Houseboat",
		          "typeName": "author",
		        },
		      ],
		    },
		  },
		  "source": "user",
		}
	`)
	})

	it('supports filtering history by scope', () => {
		const listener = vi.fn()
		store.listen(listener, {
			scope: 'session',
		})

		store.put([
			Author.create({ name: 'J.R.R Tolkien', id: Author.createId('tolkien') }),
			Book.create({
				title: 'The Hobbit',
				id: Book.createId('hobbit'),
				author: Author.createId('tolkien'),
				numPages: 300,
			}),
		])

		expect(listener).toHaveBeenCalledTimes(0)

		store.put([
			Author.create({ name: 'J.D. Salinger', id: Author.createId('salinger') }),
			Visit.create({ id: Visit.createId('jimmy'), visitorName: 'Jimmy Beans' }),
		])

		expect(listener).toHaveBeenCalledTimes(1)

		expect(listener.mock.calls[0][0].changes).toMatchInlineSnapshot(`
		{
		  "added": {
		    "visit:jimmy": {
		      "booksInBasket": [],
		      "id": "visit:jimmy",
		      "typeName": "visit",
		      "visitorName": "Jimmy Beans",
		    },
		  },
		  "removed": {},
		  "updated": {},
		}
	`)
	})

	it('supports filtering history by scope (2)', () => {
		const listener = vi.fn()
		store.listen(listener, {
			scope: 'document',
		})

		store.put([
			Author.create({ name: 'J.D. Salinger', id: Author.createId('salinger') }),
			Visit.create({ id: Visit.createId('jimmy'), visitorName: 'Jimmy Beans' }),
		])

		expect(listener).toHaveBeenCalledTimes(1)

		expect(listener.mock.calls[0][0].changes).toMatchInlineSnapshot(`
		{
		  "added": {
		    "author:salinger": {
		      "id": "author:salinger",
		      "isPseudonym": false,
		      "name": "J.D. Salinger",
		      "typeName": "author",
		    },
		  },
		  "removed": {},
		  "updated": {},
		}
	`)
	})

	it('supports filtering history by source', () => {
		const listener = vi.fn()
		store.listen(listener, {
			source: 'remote',
		})

		store.put([
			Author.create({ name: 'J.D. Salinger', id: Author.createId('salinger') }),
			Visit.create({ id: Visit.createId('jimmy'), visitorName: 'Jimmy Beans' }),
		])

		expect(listener).toHaveBeenCalledTimes(0)

		store.mergeRemoteChanges(() => {
			store.put([
				Author.create({ name: 'J.R.R Tolkien', id: Author.createId('tolkien') }),
				Book.create({
					title: 'The Hobbit',
					id: Book.createId('hobbit'),
					author: Author.createId('tolkien'),
					numPages: 300,
				}),
			])
		})

		expect(listener).toHaveBeenCalledTimes(1)

		expect(listener.mock.calls[0][0].changes).toMatchInlineSnapshot(`
		{
		  "added": {
		    "author:tolkien": {
		      "id": "author:tolkien",
		      "isPseudonym": false,
		      "name": "J.R.R Tolkien",
		      "typeName": "author",
		    },
		    "book:hobbit": {
		      "author": "author:tolkien",
		      "id": "book:hobbit",
		      "numPages": 300,
		      "title": "The Hobbit",
		      "typeName": "book",
		    },
		  },
		  "removed": {},
		  "updated": {},
		}
	`)
	})

	it('supports filtering history by source (user)', () => {
		const listener = vi.fn()
		store.listen(listener, {
			source: 'user',
		})

		store.mergeRemoteChanges(() => {
			store.put([
				Author.create({ name: 'J.R.R Tolkien', id: Author.createId('tolkien') }),
				Book.create({
					title: 'The Hobbit',
					id: Book.createId('hobbit'),
					author: Author.createId('tolkien'),
					numPages: 300,
				}),
			])
		})

		expect(listener).toHaveBeenCalledTimes(0)

		store.put([
			Author.create({ name: 'J.D. Salinger', id: Author.createId('salinger') }),
			Visit.create({ id: Visit.createId('jimmy'), visitorName: 'Jimmy Beans' }),
		])

		expect(listener).toHaveBeenCalledTimes(1)

		expect(listener.mock.calls[0][0].changes).toMatchInlineSnapshot(`
		{
		  "added": {
		    "author:salinger": {
		      "id": "author:salinger",
		      "isPseudonym": false,
		      "name": "J.D. Salinger",
		      "typeName": "author",
		    },
		    "visit:jimmy": {
		      "booksInBasket": [],
		      "id": "visit:jimmy",
		      "typeName": "visit",
		      "visitorName": "Jimmy Beans",
		    },
		  },
		  "removed": {},
		  "updated": {},
		}
	`)
	})

	it('does not keep global history if no listeners are attached', () => {
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])
		expect((store as any).historyAccumulator._history).toHaveLength(0)
	})

	it('flushes history before attaching listeners', async () => {
		try {
			// @ts-expect-error
			globalThis.__FORCE_RAF_IN_TESTS__ = true
			store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])
			const firstListener = vi.fn()
			store.listen(firstListener)
			expect(firstListener).toHaveBeenCalledTimes(0)

			store.put([Author.create({ name: 'Chips McCoy', id: Author.createId('chips') })])

			expect(firstListener).toHaveBeenCalledTimes(0)

			const secondListener = vi.fn()

			store.listen(secondListener)

			expect(firstListener).toHaveBeenCalledTimes(1)
			expect(secondListener).toHaveBeenCalledTimes(0)

			await new Promise((resolve) => requestAnimationFrame(resolve))

			expect(firstListener).toHaveBeenCalledTimes(1)
			expect(secondListener).toHaveBeenCalledTimes(0)
		} finally {
			// @ts-expect-error
			globalThis.__FORCE_RAF_IN_TESTS__ = false
		}
	})

	it('does not overwrite default properties with undefined', () => {
		const tolkein = Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })
		expect(tolkein.isPseudonym).toBe(false)

		const harkaway = Author.create({
			name: 'Nick Harkaway',
			id: Author.createId('harkaway'),
			isPseudonym: true,
		})
		expect(harkaway.isPseudonym).toBe(true)

		const burns = Author.create({
			name: 'Anna Burns',
			id: Author.createId('burns'),
			isPseudonym: undefined,
		})

		expect(burns.isPseudonym).toBe(false)
	})

	it('allows changed to be merged without triggering listeners', () => {
		const id = Author.createId('tolkein')
		store.put([Author.create({ name: 'J.R.R Tolkein', id })])

		const listener = vi.fn()
		store.listen(listener)

		// Return the exact same value that came in
		store.update(id, (author) => author)

		expect(listener).not.toHaveBeenCalled()
	})

	it('tells listeners the source of the changes so they can decide if they want to run or not', async () => {
		const listener = vi.fn()
		store.listen(listener)

		store.put([Author.create({ name: 'Jimmy Beans', id: Author.createId('jimmy') })])

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(listener).toHaveBeenCalledTimes(1)
		expect(listener.mock.calls[0][0].source).toBe('user')

		store.mergeRemoteChanges(() => {
			store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])
			store.put([
				Book.create({
					title: 'The Hobbit',
					id: Book.createId('hobbit'),
					author: Author.createId('tolkein'),
					numPages: 300,
				}),
			])
		})

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(listener).toHaveBeenCalledTimes(2)
		expect(listener.mock.calls[1][0].source).toBe('remote')

		store.put([Author.create({ name: 'Steve Ok', id: Author.createId('stever') })])

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(listener).toHaveBeenCalledTimes(3)
		expect(listener.mock.calls[2][0].source).toBe('user')
	})
})

describe('snapshots', () => {
	let store: Store<Book | Author>

	beforeEach(() => {
		store = new Store({
			props: {},
			schema: StoreSchema.create<Book | Author>({
				book: Book,
				author: Author,
			}),
		})

		transact(() => {
			store.put([
				Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') }),
				Author.create({ name: 'James McAvoy', id: Author.createId('mcavoy') }),
				Author.create({ name: 'Butch Cassidy', id: Author.createId('cassidy') }),
				Book.create({
					title: 'The Hobbit',
					id: Book.createId('hobbit'),
					author: Author.createId('tolkein'),
					numPages: 300,
				}),
			])
			store.put([
				Book.create({
					title: 'The Lord of the Rings',
					id: Book.createId('lotr'),
					author: Author.createId('tolkein'),
					numPages: 1000,
				}),
			])
		})
	})

	it('creates and loads a snapshot', () => {
		const serializedStore1 = store.serialize('all')
		const serializedSchema1 = store.schema.serialize()

		const snapshot1 = store.getStoreSnapshot()

		const store2 = new Store({
			props: {},
			schema: StoreSchema.create<Book | Author>({
				book: Book,
				author: Author,
			}),
		})

		store2.loadStoreSnapshot(snapshot1)

		const serializedStore2 = store2.serialize('all')
		const serializedSchema2 = store2.schema.serialize()
		const snapshot2 = store2.getStoreSnapshot()

		expect(serializedStore1).toEqual(serializedStore2)
		expect(serializedSchema1).toEqual(serializedSchema2)
		expect(snapshot1).toEqual(snapshot2)
	})

	it('throws errors when loading a snapshot with a different schema', () => {
		const snapshot1 = store.getStoreSnapshot()

		const store2 = new Store({
			props: {},
			schema: StoreSchema.create<Book>({
				book: Book,
				// no author
			}),
		})

		expect(() => {
			// @ts-expect-error
			store2.loadStoreSnapshot(snapshot1)
		}).toThrowErrorMatchingInlineSnapshot(`[Error: Missing definition for record type author]`)
	})

	it('throws errors when loading a snapshot with a different schema', () => {
		const snapshot1 = store.getStoreSnapshot()

		const store2 = new Store({
			props: {},
			schema: StoreSchema.create<Book>({
				book: Book,
			}),
		})

		expect(() => {
			store2.loadStoreSnapshot(snapshot1 as any)
		}).toThrowErrorMatchingInlineSnapshot(`[Error: Missing definition for record type author]`)
	})

	it('migrates the snapshot', () => {
		const snapshot1 = store.getStoreSnapshot()
		const up = vi.fn((s: any) => {
			s['book:lotr'].numPages = 42
		})

		expect((snapshot1.store as any)['book:lotr'].numPages).toBe(1000)

		const store2 = new Store({
			props: {},
			schema: StoreSchema.create<Book | Author>(
				{
					book: Book,
					author: Author,
				},
				{
					migrations: [
						createMigrationSequence({
							sequenceId: 'com.tldraw',
							retroactive: true,
							sequence: [
								{
									id: `com.tldraw/1`,
									scope: 'store',
									up,
								},
							],
						}),
					],
				}
			),
		})

		expect(() => {
			store2.loadStoreSnapshot(snapshot1)
		}).not.toThrow()

		expect(up).toHaveBeenCalledTimes(1)
		expect(store2.get(Book.createId('lotr'))!.numPages).toBe(42)
	})
})

describe('diffs', () => {
	let store: Store<LibraryType>
	const authorId = Author.createId('tolkein')
	const bookId = Book.createId('hobbit')

	beforeEach(() => {
		store = new Store({
			props: {},
			schema: StoreSchema.create<LibraryType>({
				book: Book,
				author: Author,
				visit: Visit,
			}),
		})
	})

	it('produces diffs from `extractingChanges`', () => {
		expect(
			store.extractingChanges(() => {
				store.put([Author.create({ name: 'J.R.R Tolkein', id: authorId })])
				store.put([
					Book.create({ title: 'The Hobbit', id: bookId, author: authorId, numPages: 300 }),
				])
			})
		).toMatchInlineSnapshot(`
		{
		  "added": {
		    "author:tolkein": {
		      "id": "author:tolkein",
		      "isPseudonym": false,
		      "name": "J.R.R Tolkein",
		      "typeName": "author",
		    },
		    "book:hobbit": {
		      "author": "author:tolkein",
		      "id": "book:hobbit",
		      "numPages": 300,
		      "title": "The Hobbit",
		      "typeName": "book",
		    },
		  },
		  "removed": {},
		  "updated": {},
		}
	`)

		expect(
			store.extractingChanges(() => {
				store.remove([authorId])
				store.update(bookId, (book) => ({ ...book, title: 'The Hobbit: There and Back Again' }))
			})
		).toMatchInlineSnapshot(`
		{
		  "added": {},
		  "removed": {
		    "author:tolkein": {
		      "id": "author:tolkein",
		      "isPseudonym": false,
		      "name": "J.R.R Tolkein",
		      "typeName": "author",
		    },
		  },
		  "updated": {
		    "book:hobbit": [
		      {
		        "author": "author:tolkein",
		        "id": "book:hobbit",
		        "numPages": 300,
		        "title": "The Hobbit",
		        "typeName": "book",
		      },
		      {
		        "author": "author:tolkein",
		        "id": "book:hobbit",
		        "numPages": 300,
		        "title": "The Hobbit: There and Back Again",
		        "typeName": "book",
		      },
		    ],
		  },
		}
	`)
	})
	it('produces diffs from `addHistoryInterceptor`', () => {
		const diffs: any[] = []
		const interceptor = vi.fn((diff) => diffs.push(diff))
		store.addHistoryInterceptor(interceptor)

		store.put([
			Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') }),
			Book.create({ title: 'The Hobbit', id: bookId, author: authorId, numPages: 300 }),
		])
		expect(interceptor).toHaveBeenCalledTimes(1)

		store.extractingChanges(() => {
			store.remove([authorId])

			store.update(bookId, (book) => ({ ...book, title: 'The Hobbit: There and Back Again' }))
		})
		expect(interceptor).toHaveBeenCalledTimes(3)

		expect(diffs).toMatchInlineSnapshot(`
		[
		  {
		    "changes": {
		      "added": {
		        "author:tolkein": {
		          "id": "author:tolkein",
		          "isPseudonym": false,
		          "name": "J.R.R Tolkein",
		          "typeName": "author",
		        },
		        "book:hobbit": {
		          "author": "author:tolkein",
		          "id": "book:hobbit",
		          "numPages": 300,
		          "title": "The Hobbit",
		          "typeName": "book",
		        },
		      },
		      "removed": {},
		      "updated": {},
		    },
		    "source": "user",
		  },
		  {
		    "changes": {
		      "added": {},
		      "removed": {
		        "author:tolkein": {
		          "id": "author:tolkein",
		          "isPseudonym": false,
		          "name": "J.R.R Tolkein",
		          "typeName": "author",
		        },
		      },
		      "updated": {},
		    },
		    "source": "user",
		  },
		  {
		    "changes": {
		      "added": {},
		      "removed": {},
		      "updated": {
		        "book:hobbit": [
		          {
		            "author": "author:tolkein",
		            "id": "book:hobbit",
		            "numPages": 300,
		            "title": "The Hobbit",
		            "typeName": "book",
		          },
		          {
		            "author": "author:tolkein",
		            "id": "book:hobbit",
		            "numPages": 300,
		            "title": "The Hobbit: There and Back Again",
		            "typeName": "book",
		          },
		        ],
		      },
		    },
		    "source": "user",
		  },
		]
	`)
	})

	it('can apply and invert diffs', () => {
		store.put([
			Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') }),
			Book.create({ title: 'The Hobbit', id: bookId, author: authorId, numPages: 300 }),
		])

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
})

describe('callbacks', () => {
	let store: Store<Book>
	let callbacks: any[] = []

	const book1Id = Book.createId('darkness')
	const book1 = Book.create({
		title: 'the left hand of darkness',
		id: book1Id,
		author: Author.createId('ursula'),
		numPages: 1,
	})
	const book2Id = Book.createId('dispossessed')
	const book2 = Book.create({
		title: 'the dispossessed',
		id: book2Id,
		author: Author.createId('ursula'),
		numPages: 1,
	})

	let onAfterCreate: ReturnType<typeof vi.fn>
	let onAfterChange: ReturnType<typeof vi.fn>
	let onAfterDelete: ReturnType<typeof vi.fn>

	let onBeforeCreate: ReturnType<typeof vi.fn>
	let onBeforeChange: ReturnType<typeof vi.fn>
	let onBeforeDelete: ReturnType<typeof vi.fn>

	let onOperationComplete: ReturnType<typeof vi.fn>

	beforeEach(() => {
		store = new Store({
			props: {},
			schema: StoreSchema.create<Book>({
				book: Book,
			}),
		})

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

	it('fires callbacks at the end of an `atomic` op', () => {
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

	it('doesnt fire callback for a record created then deleted', () => {
		store.atomic(() => {
			store.put([book1])
			store.remove([book1Id])
		})
		expect(callbacks).toMatchObject([{ type: 'complete' }])
	})

	it('bails out if too many callbacks are fired', () => {
		let limit = 10
		onAfterCreate.mockImplementation((record: any) => {
			if (record.numPages < limit) {
				store.put([{ ...record, numPages: record.numPages + 1 }])
			}
		})
		onAfterChange.mockImplementation((from: any, to: any) => {
			if (to.numPages < limit) {
				store.put([{ ...to, numPages: to.numPages + 1 }])
			}
		})

		// this should be fine:
		store.put([book1])
		expect(store.get(book1Id)!.numPages).toBe(limit)

		// if we increase the limit thought, it should crash:
		limit = 10000
		store.clear()
		expect(() => {
			store.put([book2])
		}).toThrowErrorMatchingInlineSnapshot(
			`[Error: Maximum store update depth exceeded, bailing out]`
		)
	})

	it('keeps firing operation complete callbacks until all are cleared', () => {
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

		onAfterChange.mockImplementation((prev: any, next: any) => {
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

	test('fired during mergeRemoteChanges are flushed at the end so that they end up receiving remote source but outputting user source changes', () => {
		const diffs: HistoryEntry<Book>[] = []
		store.listen((entry) => {
			diffs.push(entry)
		})

		const firstOrderEffectSources: string[] = []
		store.sideEffects.registerAfterCreateHandler('book', (record, source) => {
			firstOrderEffectSources.push(source)
			if (record.title.startsWith('Harry Potter')) {
				store.put([
					{
						...record,
						title: record.title + ' is a really great book fr fr',
					},
				])
			}
		})

		const secondOrderEffectSources: string[] = []
		store.sideEffects.registerAfterChangeHandler('book', (from, to, source) => {
			secondOrderEffectSources.push(source)
		})

		store.mergeRemoteChanges(() => {
			store.put([
				{
					...book1,
					title: "Harry Potter and the Philosopher's Stone",
				},
			])
		})

		expect(firstOrderEffectSources).toMatchInlineSnapshot(`
		[
		  "remote",
		]
	`)

		// recursive changes are always user
		expect(secondOrderEffectSources).toMatchInlineSnapshot(`
		[
		  "user",
		]
	`)

		expect(diffs).toMatchInlineSnapshot(`
		[
		  {
		    "changes": {
		      "added": {
		        "book:darkness": {
		          "author": "author:ursula",
		          "id": "book:darkness",
		          "numPages": 1,
		          "title": "Harry Potter and the Philosopher's Stone",
		          "typeName": "book",
		        },
		      },
		      "removed": {},
		      "updated": {},
		    },
		    "source": "remote",
		  },
		  {
		    "changes": {
		      "added": {},
		      "removed": {},
		      "updated": {
		        "book:darkness": [
		          {
		            "author": "author:ursula",
		            "id": "book:darkness",
		            "numPages": 1,
		            "title": "Harry Potter and the Philosopher's Stone",
		            "typeName": "book",
		          },
		          {
		            "author": "author:ursula",
		            "id": "book:darkness",
		            "numPages": 1,
		            "title": "Harry Potter and the Philosopher's Stone is a really great book fr fr",
		            "typeName": "book",
		          },
		        ],
		      },
		    },
		    "source": "user",
		  },
		]
	`)
	})

	test('noop changes do not fire with store.atomic', () => {
		const book1A = book1
		const book1B = {
			...book1,
			title: book1.title + ' is a really great book fr fr',
		}
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

	test('an atomic block with callbacks enabled can be overridden with an atomic block with callbacks disabled which causes the beforeCallbacks only to not run', () => {
		store.atomic(() => {
			store.put([book1])
			store.atomic(() => {
				store.put([book2])
			}, false)
		})

		expect(onBeforeCreate).toHaveBeenCalledTimes(1)
		expect(onAfterCreate).toHaveBeenCalledTimes(2)

		store.atomic(() => {
			store.update(book1Id, (book) => ({
				...book,
				numPages: book.numPages + 1,
			}))
			store.atomic(() => {
				store.update(book2Id, (book) => ({
					...book,
					numPages: book.numPages + 1,
				}))
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
	})
})
