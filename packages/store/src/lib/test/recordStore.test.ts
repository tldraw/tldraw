import { Computed, react, RESET_VALUE, transact } from '@tldraw/state'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { CollectionDiff, RecordsDiff, Store } from '../Store'
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
			schema: StoreSchema.create<LibraryType>(
				{
					book: Book,
					author: Author,
					visit: Visit,
				},
				{
					snapshotMigrations: {
						currentVersion: 0,
						firstVersion: 0,
						migrators: {},
					},
				}
			),
		})
	})

	it('allows records to be added', () => {
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])
		expect(store.query.records('author').value).toEqual([
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

		expect(store.query.records('book').value).toEqual([
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
			        Array [
			          Object {
			            "added": Object {
			              "author:tolkein": Object {
			                "id": "author:tolkein",
			                "isPseudonym": false,
			                "name": "J.R.R Tolkein",
			                "typeName": "author",
			              },
			            },
			            "removed": Object {},
			            "updated": Object {},
			          },
			        ]
		      `)

			store.update(Author.createId('tolkein'), (r) => ({ ...r, name: 'Jimmy Tolks' }))

			expect(lastDiff!).toMatchInlineSnapshot(`
			        Array [
			          Object {
			            "added": Object {},
			            "removed": Object {},
			            "updated": Object {
			              "author:tolkein": Array [
			                Object {
			                  "id": "author:tolkein",
			                  "isPseudonym": false,
			                  "name": "J.R.R Tolkein",
			                  "typeName": "author",
			                },
			                Object {
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
			        Array [
			          Object {
			            "added": Object {},
			            "removed": Object {
			              "author:tolkein": Object {
			                "id": "author:tolkein",
			                "isPseudonym": false,
			                "name": "Jimmy Tolks",
			                "typeName": "author",
			              },
			            },
			            "updated": Object {},
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
			Array [
			  Object {
			    "added": Object {
			      "author:cj": Object {
			        "id": "author:cj",
			        "isPseudonym": false,
			        "name": "Carter, Jimmy",
			        "typeName": "author",
			      },
			      "author:dfw": Object {
			        "id": "author:dfw",
			        "isPseudonym": false,
			        "name": "David Foster Wallace",
			        "typeName": "author",
			      },
			      "author:tolkein": Object {
			        "id": "author:tolkein",
			        "isPseudonym": false,
			        "name": "Jimmy Tolks",
			        "typeName": "author",
			      },
			    },
			    "removed": Object {},
			    "updated": Object {},
			  },
			]
		`)
		})
	})

	it('allows adding onAfterChange callbacks that see the final state of the world', () => {
		/* ADDING */
		store.onAfterCreate = jest.fn((current) => {
			expect(current).toEqual(
				Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })
			)
			expect([...store.query.ids('author').value]).toEqual([Author.createId('tolkein')])
		})
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])

		expect(store.onAfterCreate).toHaveBeenCalledTimes(1)

		/* UPDATING */
		store.onAfterChange = jest.fn((prev, current) => {
			if (prev.typeName === 'author' && current.typeName === 'author') {
				expect(prev.name).toBe('J.R.R Tolkein')
				expect(current.name).toBe('Butch Cassidy')

				expect(store.get(Author.createId('tolkein'))!.name).toBe('Butch Cassidy')
			}
		})

		store.update(Author.createId('tolkein'), (r) => ({ ...r, name: 'Butch Cassidy' }))

		expect(store.onAfterChange).toHaveBeenCalledTimes(1)

		/* REMOVING */
		store.onAfterDelete = jest.fn((prev) => {
			if (prev.typeName === 'author') {
				expect(prev.name).toBe('Butch Cassidy')
			}
		})

		store.remove([Author.createId('tolkein')])

		expect(store.onAfterDelete).toHaveBeenCalledTimes(1)
	})

	it('allows finding and filtering records with a predicate', () => {
		store.put([
			Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') }),
			Author.create({ name: 'James McAvoy', id: Author.createId('mcavoy') }),
			Author.create({ name: 'Butch Cassidy', id: Author.createId('cassidy') }),
			Author.create({ name: 'Cynan Jones', id: Author.createId('cj') }),
			Author.create({ name: 'David Foster Wallace', id: Author.createId('dfw') }),
		])
		const Js = store.query.records('author').value.filter((r) => r.name.startsWith('J'))
		expect(Js.map((j) => j.name).sort()).toEqual(['J.R.R Tolkein', 'James McAvoy'])

		const david = store.query.records('author').value.find((r) => r.name.startsWith('David'))
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
		      Array [
		        Object {
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
		      Array [
		        Object {
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
		const listener = jest.fn()
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
		expect(listener.mock.lastCall[0]).toMatchInlineSnapshot(`
		Object {
		  "changes": Object {
		    "added": Object {
		      "author:cassidy": Object {
		        "id": "author:cassidy",
		        "isPseudonym": false,
		        "name": "Butch Cassidy",
		        "typeName": "author",
		      },
		      "author:mcavoy": Object {
		        "id": "author:mcavoy",
		        "isPseudonym": false,
		        "name": "James McAvoy",
		        "typeName": "author",
		      },
		      "author:tolkein": Object {
		        "id": "author:tolkein",
		        "isPseudonym": false,
		        "name": "J.R.R Tolkein",
		        "typeName": "author",
		      },
		      "book:hobbit": Object {
		        "author": "author:tolkein",
		        "id": "book:hobbit",
		        "numPages": 300,
		        "title": "The Hobbit",
		        "typeName": "book",
		      },
		      "book:lotr": Object {
		        "author": "author:tolkein",
		        "id": "book:lotr",
		        "numPages": 1000,
		        "title": "The Lord of the Rings",
		        "typeName": "book",
		      },
		    },
		    "removed": Object {},
		    "updated": Object {},
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

		expect(listener.mock.lastCall[0]).toMatchInlineSnapshot(`
		Object {
		  "changes": Object {
		    "added": Object {},
		    "removed": Object {},
		    "updated": Object {
		      "author:tolkein": Array [
		        Object {
		          "id": "author:tolkein",
		          "isPseudonym": false,
		          "name": "J.R.R Tolkein",
		          "typeName": "author",
		        },
		        Object {
		          "id": "author:tolkein",
		          "isPseudonym": false,
		          "name": "Jimmy Tolks",
		          "typeName": "author",
		        },
		      ],
		      "book:lotr": Array [
		        Object {
		          "author": "author:tolkein",
		          "id": "book:lotr",
		          "numPages": 1000,
		          "title": "The Lord of the Rings",
		          "typeName": "book",
		        },
		        Object {
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

		expect(listener.mock.lastCall[0]).toMatchInlineSnapshot(`
		Object {
		  "changes": Object {
		    "added": Object {},
		    "removed": Object {
		      "book:lotr": Object {
		        "author": "author:tolkein",
		        "id": "book:lotr",
		        "numPages": 42,
		        "title": "The Lord of the Rings",
		        "typeName": "book",
		      },
		    },
		    "updated": Object {
		      "author:mcavoy": Array [
		        Object {
		          "id": "author:mcavoy",
		          "isPseudonym": false,
		          "name": "James McAvoy",
		          "typeName": "author",
		        },
		        Object {
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
		const listener = jest.fn()
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
		Object {
		  "added": Object {
		    "visit:jimmy": Object {
		      "booksInBasket": Array [],
		      "id": "visit:jimmy",
		      "typeName": "visit",
		      "visitorName": "Jimmy Beans",
		    },
		  },
		  "removed": Object {},
		  "updated": Object {},
		}
	`)
	})

	it('supports filtering history by scope (2)', () => {
		const listener = jest.fn()
		store.listen(listener, {
			scope: 'document',
		})

		store.put([
			Author.create({ name: 'J.D. Salinger', id: Author.createId('salinger') }),
			Visit.create({ id: Visit.createId('jimmy'), visitorName: 'Jimmy Beans' }),
		])

		expect(listener).toHaveBeenCalledTimes(1)

		expect(listener.mock.calls[0][0].changes).toMatchInlineSnapshot(`
		Object {
		  "added": Object {
		    "author:salinger": Object {
		      "id": "author:salinger",
		      "isPseudonym": false,
		      "name": "J.D. Salinger",
		      "typeName": "author",
		    },
		  },
		  "removed": Object {},
		  "updated": Object {},
		}
	`)
	})

	it('supports filtering history by source', () => {
		const listener = jest.fn()
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
		Object {
		  "added": Object {
		    "author:tolkien": Object {
		      "id": "author:tolkien",
		      "isPseudonym": false,
		      "name": "J.R.R Tolkien",
		      "typeName": "author",
		    },
		    "book:hobbit": Object {
		      "author": "author:tolkien",
		      "id": "book:hobbit",
		      "numPages": 300,
		      "title": "The Hobbit",
		      "typeName": "book",
		    },
		  },
		  "removed": Object {},
		  "updated": Object {},
		}
	`)
	})

	it('supports filtering history by source (user)', () => {
		const listener = jest.fn()
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
		Object {
		  "added": Object {
		    "author:salinger": Object {
		      "id": "author:salinger",
		      "isPseudonym": false,
		      "name": "J.D. Salinger",
		      "typeName": "author",
		    },
		    "visit:jimmy": Object {
		      "booksInBasket": Array [],
		      "id": "visit:jimmy",
		      "typeName": "visit",
		      "visitorName": "Jimmy Beans",
		    },
		  },
		  "removed": Object {},
		  "updated": Object {},
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
			const firstListener = jest.fn()
			store.listen(firstListener)
			expect(firstListener).toHaveBeenCalledTimes(0)

			store.put([Author.create({ name: 'Chips McCoy', id: Author.createId('chips') })])

			expect(firstListener).toHaveBeenCalledTimes(0)

			const secondListener = jest.fn()

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

		const listener = jest.fn()
		store.listen(listener)

		// Return the exact same value that came in
		store.update(id, (author) => author)

		expect(listener).not.toHaveBeenCalled()
	})

	it('tells listeners the source of the changes so they can decide if they want to run or not', async () => {
		const listener = jest.fn()
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
			schema: StoreSchema.create<Book | Author>(
				{
					book: Book,
					author: Author,
				},
				{
					snapshotMigrations: {
						currentVersion: 0,
						firstVersion: 0,
						migrators: {},
					},
				}
			),
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

		const snapshot1 = store.getSnapshot()

		const store2 = new Store({
			props: {},
			schema: StoreSchema.create<Book | Author>(
				{
					book: Book,
					author: Author,
				},
				{
					snapshotMigrations: {
						currentVersion: 0,
						firstVersion: 0,
						migrators: {},
					},
				}
			),
		})

		store2.loadSnapshot(snapshot1)

		const serializedStore2 = store2.serialize('all')
		const serializedSchema2 = store2.schema.serialize()
		const snapshot2 = store2.getSnapshot()

		expect(serializedStore1).toEqual(serializedStore2)
		expect(serializedSchema1).toEqual(serializedSchema2)
		expect(snapshot1).toEqual(snapshot2)
	})

	it('throws errors when loading a snapshot with a different schema', () => {
		const snapshot1 = store.getSnapshot()

		const store2 = new Store({
			props: {},
			schema: StoreSchema.create<Book>(
				{
					book: Book,
					// no author
				},
				{
					snapshotMigrations: {
						currentVersion: 0,
						firstVersion: 0,
						migrators: {},
					},
				}
			),
		})

		expect(() => {
			// @ts-expect-error
			store2.loadSnapshot(snapshot1)
		}).toThrowErrorMatchingInlineSnapshot(`"Failed to migrate snapshot: unknown-type"`)
	})

	it('throws errors when loading a snapshot with a different schema', () => {
		const snapshot1 = store.getSnapshot()

		const store2 = new Store({
			props: {},
			schema: StoreSchema.create<Book | Author>(
				{
					book: Book,
					author: Author,
				},
				{
					snapshotMigrations: {
						currentVersion: -1,
						firstVersion: 0,
						migrators: {},
					},
				}
			),
		})

		expect(() => {
			store2.loadSnapshot(snapshot1)
		}).toThrowErrorMatchingInlineSnapshot(`"Failed to migrate snapshot: target-version-too-old"`)
	})

	it('migrates the snapshot', () => {
		const snapshot1 = store.getSnapshot()

		const store2 = new Store({
			props: {},
			schema: StoreSchema.create<Book | Author>(
				{
					book: Book,
					author: Author,
				},
				{
					snapshotMigrations: {
						currentVersion: 1,
						firstVersion: 0,
						migrators: {
							1: {
								up: (r) => r,
								down: (r) => r,
							},
						},
					},
				}
			),
		})

		expect(() => {
			store2.loadSnapshot(snapshot1)
		}).not.toThrowError()
	})
})
