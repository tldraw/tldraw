import { Computed, react, RESET_VALUE, transact } from 'signia'
import { BaseRecord, ID } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { CollectionDiff, RecordsDiff, Store } from '../Store'
import { StoreSchema } from '../StoreSchema'

interface Book extends BaseRecord<'book'> {
	title: string
	author: ID<Author>
	numPages: number
}

const Book = createRecordType<Book>('book', {
	validator: { validate: (book) => book as Book },
	scope: 'document',
})

interface Author extends BaseRecord<'author'> {
	name: string
	isPseudonym: boolean
}

const Author = createRecordType<Author>('author', {
	validator: { validate: (author) => author as Author },
	scope: 'document',
}).withDefaultProperties(() => ({
	isPseudonym: false,
}))

describe('Store', () => {
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
	})

	it('allows records to be added', () => {
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') })])
		expect(store.query.records('author').value).toEqual([
			{ id: 'author:tolkein', typeName: 'author', name: 'J.R.R Tolkein', isPseudonym: false },
		])

		store.put([
			{
				id: Book.createCustomId('the-hobbit'),
				typeName: 'book',
				title: 'The Hobbit',
				numPages: 423,
				author: Author.createCustomId('tolkein'),
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
			store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') })])

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

			store.update(Author.createCustomId('tolkein'), (r) => ({ ...r, name: 'Jimmy Tolks' }))

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

			store.remove([Author.createCustomId('tolkein')])

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
					Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') }),
					Author.create({ name: 'David Foster Wallace', id: Author.createCustomId('dfw') }),
					Author.create({ name: 'Cynan Jones', id: Author.createCustomId('cj') }),
				])

				store.update(Author.createCustomId('tolkein'), (r) => ({ ...r, name: 'Jimmy Tolks' }))
				store.update(Author.createCustomId('cj'), (r) => ({ ...r, name: 'Carter, Jimmy' }))
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
				Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') })
			)
			expect([...store.query.ids('author').value]).toEqual([Author.createCustomId('tolkein')])
		})
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') })])

		expect(store.onAfterCreate).toHaveBeenCalledTimes(1)

		/* UPDATING */
		store.onAfterChange = jest.fn((prev, current) => {
			if (prev.typeName === 'author' && current.typeName === 'author') {
				expect(prev.name).toBe('J.R.R Tolkein')
				expect(current.name).toBe('Butch Cassidy')

				expect(store.get(Author.createCustomId('tolkein'))!.name).toBe('Butch Cassidy')
			}
		})

		store.update(Author.createCustomId('tolkein'), (r) => ({ ...r, name: 'Butch Cassidy' }))

		expect(store.onAfterChange).toHaveBeenCalledTimes(1)

		/* REMOVING */
		store.onAfterDelete = jest.fn((prev) => {
			if (prev.typeName === 'author') {
				expect(prev.name).toBe('Butch Cassidy')
			}
		})

		store.remove([Author.createCustomId('tolkein')])

		expect(store.onAfterDelete).toHaveBeenCalledTimes(1)
	})

	it('allows finding and filtering records with a predicate', () => {
		store.put([
			Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') }),
			Author.create({ name: 'James McAvoy', id: Author.createCustomId('mcavoy') }),
			Author.create({ name: 'Butch Cassidy', id: Author.createCustomId('cassidy') }),
			Author.create({ name: 'Cynan Jones', id: Author.createCustomId('cj') }),
			Author.create({ name: 'David Foster Wallace', id: Author.createCustomId('dfw') }),
		])
		const Js = store.query.records('author').value.filter((r) => r.name.startsWith('J'))
		expect(Js.map((j) => j.name).sort()).toEqual(['J.R.R Tolkein', 'James McAvoy'])

		const david = store.query.records('author').value.find((r) => r.name.startsWith('David'))
		expect(david?.name).toBe('David Foster Wallace')
	})

	it('allows keeping track of the ids of a particular type', () => {
		let lastIdDiff: CollectionDiff<ID<Author>>[] | RESET_VALUE = []

		const authorIds = store.query.ids('author')

		react('', (lastReactedEpoch) => {
			lastIdDiff = authorIds.getDiffSince(lastReactedEpoch)
		})

		expect(lastIdDiff).toBe(RESET_VALUE)

		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') })])

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
			store.put([Author.create({ name: 'James McAvoy', id: Author.createCustomId('mcavoy') })])
			store.put([Author.create({ name: 'Butch Cassidy', id: Author.createCustomId('cassidy') })])
			store.remove([Author.createCustomId('tolkein')])
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
				Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') }),
				Author.create({ name: 'James McAvoy', id: Author.createCustomId('mcavoy') }),
				Author.create({ name: 'Butch Cassidy', id: Author.createCustomId('cassidy') }),
				Book.create({
					title: 'The Hobbit',
					id: Book.createCustomId('hobbit'),
					author: Author.createCustomId('tolkein'),
					numPages: 300,
				}),
			])
			store.put([
				Book.create({
					title: 'The Lord of the Rings',
					id: Book.createCustomId('lotr'),
					author: Author.createCustomId('tolkein'),
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
			store.update(Author.createCustomId('tolkein'), (author) => ({
				...author,
				name: 'Jimmy Tolks',
			}))
			store.update(Book.createCustomId('lotr'), (book) => ({ ...book, numPages: 42 }))
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
			store.update(Author.createCustomId('mcavoy'), (author) => ({
				...author,
				name: 'Sookie Houseboat',
			}))
			store.remove([Book.createCustomId('lotr')])
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

	it('does not keep global history if no listeners are attached', () => {
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') })])
		expect((store as any).historyAccumulator._history).toHaveLength(0)
	})

	it('flushes history before attaching listeners', async () => {
		try {
			// @ts-expect-error
			globalThis.__FORCE_RAF_IN_TESTS__ = true
			store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') })])
			const firstListener = jest.fn()
			store.listen(firstListener)
			expect(firstListener).toHaveBeenCalledTimes(0)

			store.put([Author.create({ name: 'Chips McCoy', id: Author.createCustomId('chips') })])

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
		const tolkein = Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') })
		expect(tolkein.isPseudonym).toBe(false)

		const harkaway = Author.create({
			name: 'Nick Harkaway',
			id: Author.createCustomId('harkaway'),
			isPseudonym: true,
		})
		expect(harkaway.isPseudonym).toBe(true)

		const burns = Author.create({
			name: 'Anna Burns',
			id: Author.createCustomId('burns'),
			isPseudonym: undefined,
		})

		expect(burns.isPseudonym).toBe(false)
	})

	it('allows changed to be merged without triggering listeners', () => {
		const id = Author.createCustomId('tolkein')
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

		store.put([Author.create({ name: 'Jimmy Beans', id: Author.createCustomId('jimmy') })])

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(listener).toHaveBeenCalledTimes(1)
		expect(listener.mock.calls[0][0].source).toBe('user')

		store.mergeRemoteChanges(() => {
			store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createCustomId('tolkein') })])
			store.put([
				Book.create({
					title: 'The Hobbit',
					id: Book.createCustomId('hobbit'),
					author: Author.createCustomId('tolkein'),
					numPages: 300,
				}),
			])
		})

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(listener).toHaveBeenCalledTimes(2)
		expect(listener.mock.calls[1][0].source).toBe('remote')

		store.put([Author.create({ name: 'Steve Ok', id: Author.createCustomId('stever') })])

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(listener).toHaveBeenCalledTimes(3)
		expect(listener.mock.calls[2][0].source).toBe('user')
	})
})
