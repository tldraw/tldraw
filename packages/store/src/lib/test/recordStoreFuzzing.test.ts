import { atom, EffectScheduler, RESET_VALUE } from '@tldraw/state'
import { BaseRecord, IdOf, RecordId, UnknownRecord } from '../BaseRecord'
import { executeQuery } from '../executeQuery'
import { createRecordType } from '../RecordType'
import { CollectionDiff, Store } from '../Store'
import { RSIndexDiff } from '../StoreQueries'
import { StoreSchema } from '../StoreSchema'

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: AuthorName
	age: number
}
const Author = createRecordType<Author>('author', {
	validator: {
		validate(value) {
			const author = value as Author
			if (author.typeName !== 'author') throw Error()
			if (!author.id.startsWith('author:')) throw Error()
			if (!Number.isFinite(author.age)) throw Error()
			if (author.age < 0) throw Error()
			return author
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({ age: 23 }))

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: BookName
	authorId: RecordId<Author>
}
const Book = createRecordType<Book>('book', {
	validator: {
		validate(value) {
			const book = value as Book
			if (!book.id.startsWith('book:')) throw Error()
			if (book.typeName !== 'book') throw Error()
			if (typeof book.title !== 'string') throw Error()
			if (!book.authorId.startsWith('author')) throw Error()
			return book
		},
	},
	scope: 'document',
})

const bookComparator = (a: Book, b: Book) => a.id.localeCompare(b.id)

function rng(seed: number) {
	return () => {
		seed = (seed * 9301 + 49297) % 233280
		return seed / 233280
	}
}

type Record = Author | Book

type Op =
	| { readonly type: 'add'; readonly record: Record }
	| { readonly type: 'delete'; readonly id: IdOf<Record> }
	| { readonly type: 'update'; readonly record: Record }
	| { readonly type: 'set_book_name_query_param'; readonly bookName: BookName }
	| { readonly type: 'set_author_id_query_param'; readonly authorId: IdOf<Author> }

const BOOK_NAMES = [
	'Breakfast of Champions',
	'Slaughterhouse-Five',
	"Cat's Cradle",
	'The Sirens of Titan',
	'Mother Night',
	'Galapagos',
	'God Bless You, Mr. Rosewater',
	'Welcome to the Monkey House',
	'Bluebeard',
	'Hocus Pocus',
	'The Day the Earth Stood Still',
	'The Long Dry',
	'The Crying of Lot 49',
	"Gravity's Rainbow",
	'Player Piano',
	'Infinite Jest',
	'The Caves of Steel',
	'The Naked Sun',
	'The Robots of Dawn',
	'The Stars My Destination',
	'Stoner',
	'The Martian Chronicles',
]

type BookName = (typeof BOOK_NAMES)[number]

const AUTHOR_NAMES = [
	'Kurt Vonnegut',
	'Douglas Adams',
	'Isaac Asimov',
	'Ray Bradbury',
	'Robert A. Heinlein',
	'Arthur C. Clarke',
	'Frank Herbert',
	'J.R.R. Tolkien',
	'Philip K. Dick',
	'Ursula K. Le Guin',
	'William Gibson',
	'Neil Gaiman',
	'Terry Pratchett',
	'George R.R. Martin',
	'Stephen King',
	'Tad Williams',
	'Robert Jordan',
	'Brandon Sanderson',
	'Terry Brooks',
	'Anne McCaffrey',
	'Robert A. Heinlein',
]

type AuthorName = (typeof AUTHOR_NAMES)[number]

function getRandomBookName(getRandomNumber: () => number) {
	return BOOK_NAMES[Math.floor(getRandomNumber() * 11)]
}

function getRandomAuthorName(getRandomNumber: () => number) {
	return AUTHOR_NAMES[Math.floor(getRandomNumber() * 11)]
}

function getRandomBookFromStore(store: Store<Book | Author>, getRandomNumber: () => number): Book {
	const books = store.allRecords().filter((record): record is Book => record.typeName === 'book')
	return books[Math.floor(getRandomNumber() * books.length)]
}

function getRandomAuthorFromStore(
	store: Store<Book | Author>,
	getRandomNumber: () => number
): Author {
	const authors = store
		.allRecords()
		.filter((record): record is Author => record.typeName === 'author')
	return authors[Math.floor(getRandomNumber() * authors.length)]
}

function getRandomBookOp(
	store: Store<Book | Author>,
	getRandomNumber: () => number,
	deletedRecords: Set<Book | Author>
): Op {
	const num = Math.floor(getRandomNumber() * 5)
	switch (num) {
		case 0: {
			if (getRandomNumber() < 0.3) {
				const deleted = [...deletedRecords].find((record) => record.typeName === 'book')
				if (deleted) {
					deletedRecords.delete(deleted)
					return { type: 'add', record: deleted }
				}
			}
			const author = getRandomAuthorFromStore(store, getRandomNumber)
			if (author) {
				return {
					type: 'add',
					record: Book.create({
						id: Book.createId(getRandomNumber().toString()),
						authorId: author.id,
						title: getRandomBookName(getRandomNumber),
					}),
				}
			} else {
				return getRandomAuthorOp(store, getRandomNumber, deletedRecords)
			}
		}
		case 1: {
			const bookToDelete = getRandomBookFromStore(store, getRandomNumber)
			if (bookToDelete) {
				return { type: 'delete', id: bookToDelete.id }
			}
			return getRandomBookOp(store, getRandomNumber, deletedRecords)
		}
		case 2:
		case 3: {
			const bookToUpdate = getRandomBookFromStore(store, getRandomNumber)
			if (!bookToUpdate) return getRandomBookOp(store, getRandomNumber, deletedRecords)
			return {
				type: 'update',
				record: { ...bookToUpdate, title: getRandomBookName(getRandomNumber) },
			}
		}
		case 4: {
			const bookToUpdate = getRandomBookFromStore(store, getRandomNumber)
			if (!bookToUpdate) return getRandomBookOp(store, getRandomNumber, deletedRecords)
			const authorToReassignBookTo = getRandomAuthorFromStore(store, getRandomNumber)
			if (!authorToReassignBookTo) return getRandomBookOp(store, getRandomNumber, deletedRecords)
			return {
				type: 'update',
				record: { ...bookToUpdate, authorId: authorToReassignBookTo.id },
			}
		}
		default:
			throw new Error('unreachable: ' + num)
	}
}

function getRandomAuthorOp(
	store: Store<Book | Author>,
	getRandomNumber: () => number,
	deletedRecords: Set<Book | Author>
): Op {
	const num = Math.floor(getRandomNumber() * 5)
	switch (num) {
		case 0: {
			if (getRandomNumber() < 0.3) {
				const deleted = [...deletedRecords].find((record) => record.typeName === 'author')
				if (deleted) {
					deletedRecords.delete(deleted)
					return { type: 'add', record: deleted }
				}
			}
			return {
				type: 'add',
				record: Author.create({
					id: Author.createId(getRandomNumber().toString()),
					name: getRandomAuthorName(getRandomNumber),
				}),
			}
		}
		case 1: {
			const authorToDelete = getRandomAuthorFromStore(store, getRandomNumber)
			if (authorToDelete) {
				return { type: 'delete', id: authorToDelete.id }
			}
			return getRandomAuthorOp(store, getRandomNumber, deletedRecords)
		}
		case 2:
		case 3: {
			const authorToUpdate = getRandomAuthorFromStore(store, getRandomNumber)
			if (!authorToUpdate) return getRandomAuthorOp(store, getRandomNumber, deletedRecords)
			return {
				type: 'update',
				record: {
					...authorToUpdate,
					name: getRandomAuthorName(getRandomNumber),
				},
			}
		}
		case 4: {
			const authorToUpdate = getRandomAuthorFromStore(store, getRandomNumber)
			if (!authorToUpdate) return getRandomAuthorOp(store, getRandomNumber, deletedRecords)
			return {
				type: 'update',
				record: {
					...authorToUpdate,
					age: Math.floor(getRandomNumber() * 100),
				},
			}
		}
		default:
			throw new Error('unreachable: ' + num)
	}
}

function getRandomOp(
	store: Store<Book | Author>,
	getRandomNumber: () => number,
	deletedRecords: Set<Book | Author>
): Op {
	const num = Math.floor(getRandomNumber() * 3)
	switch (num) {
		case 0:
			return getRandomBookOp(store, getRandomNumber, deletedRecords)
		case 1:
			return getRandomAuthorOp(store, getRandomNumber, deletedRecords)
		case 2: {
			if (getRandomNumber() > 0.5) {
				const authorId = getRandomAuthorFromStore(store, getRandomNumber)?.id
				if (authorId) {
					return { type: 'set_author_id_query_param', authorId: authorId }
				}
				return getRandomOp(store, getRandomNumber, deletedRecords)
			} else {
				return { type: 'set_book_name_query_param', bookName: getRandomBookName(getRandomNumber) }
			}
		}
		default:
			throw new Error('unreachable: ' + num)
	}
}

function recreateIndexFromDiffs(diffs: RSIndexDiff<any>[]) {
	const result = new Map<string, Set<IdOf<UnknownRecord>>>()
	for (const diff of diffs) {
		for (const [key, changes] of diff) {
			const index = result.get(key) || new Set<IdOf<UnknownRecord>>()
			if (changes.added) {
				for (const id of changes.added) {
					index.add(id)
				}
			}
			if (changes.removed) {
				for (const id of changes.removed) {
					index.delete(id)
				}
			}
			if (index.size === 0) {
				result.delete(key)
			} else {
				result.set(key, index)
			}
		}
	}
	return result
}

function reacreateSetFromDiffs<T>(diffs: CollectionDiff<T>[]) {
	const result = new Set<T>()
	for (const diff of diffs) {
		if (diff.added) {
			for (const item of diff.added) {
				result.add(item)
			}
		}
		if (diff.removed) {
			for (const item of diff.removed) {
				result.delete(item)
			}
		}
	}
	return result
}

const NUM_OPS = 200

function runTest(seed: number) {
	const store = new Store({
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
	store.onBeforeDelete = (record) => {
		if (record.typeName === 'author') {
			const books = store.query.index('book', 'authorId').value.get(record.id)
			if (books) store.remove([...books])
		}
	}
	const getRandomNumber = rng(seed)
	const authorNameIndex = store.query.index('author', 'name')
	const authorIdIndex = store.query.index('book', 'authorId')

	const authorNameIndexDiffs: RSIndexDiff<Author>[] = []
	const authorIdIndexDiffs: RSIndexDiff<Book>[] = []

	const authorIdQueryParam = atom('authorId', Author.createId('does-not-exist'))
	const bookTitleQueryParam = atom('bookTitle', getRandomBookName(getRandomNumber))

	const booksByAuthorQuery = store.query.records('book', () => ({
		authorId: { eq: authorIdQueryParam.value },
	}))

	const booksByTitleQuery = store.query.records('book', () => ({
		title: { eq: bookTitleQueryParam.value },
	}))

	const authorNameQueryParam = atom('authorName', getRandomAuthorName(getRandomNumber))
	const authorIdsByNameQuery = store.query.ids('author', () => ({
		name: { neq: authorNameQueryParam.value },
	}))

	const ops = []

	const deletedRecords = new Set<Book | Author>()

	try {
		let latestBooksByAuthorQueryResult: Book[] = []
		let latestBooksByTitleQueryResult: Book[] = []
		let latestAuthorIdsByNameQueryResult: Set<RecordId<Author>> = new Set()
		const authorIdsByNameDiffs: CollectionDiff<RecordId<Author>>[] = []
		const effect = new EffectScheduler('', (lastReactedEpoch: number) => {
			const authorNameIndexDiff = authorNameIndex.getDiffSince(lastReactedEpoch)
			const authorIdIndexDiff = authorIdIndex.getDiffSince(lastReactedEpoch)
			const authorIdsByNameDiff = authorIdsByNameQuery.getDiffSince(lastReactedEpoch)
			latestBooksByAuthorQueryResult = booksByAuthorQuery.value
			latestBooksByTitleQueryResult = booksByTitleQuery.value
			latestAuthorIdsByNameQueryResult = authorIdsByNameQuery.value
			if (
				authorNameIndexDiff === RESET_VALUE ||
				authorIdIndexDiff === RESET_VALUE ||
				authorIdsByNameDiff == RESET_VALUE
			) {
				if (ops.length !== 0) {
					throw new Error('unexpected RESET_VALUE ' + ops.length)
				}
				return
			}
			authorNameIndexDiffs.push(...authorNameIndexDiff)
			authorIdIndexDiffs.push(...authorIdIndexDiff)
			authorIdsByNameDiffs.push(...authorIdsByNameDiff)
		})
		effect.execute()

		for (let i = 0; i < NUM_OPS; i++) {
			const op = getRandomOp(store, getRandomNumber, deletedRecords)
			ops.push(op)
			switch (op.type) {
				case 'add':
				case 'update': {
					store.put([op.record])
					break
				}
				case 'delete': {
					const r = store.get(op.id)
					if (!r) throw new Error('record not found: ' + op.id)
					deletedRecords.add(r)
					store.remove([op.id])

					if (op.id === 'book:0.5525377229080933') {
						store.query.index('book', 'title').value
					}
					break
				}
				case 'set_author_id_query_param': {
					authorIdQueryParam.set(op.authorId)
					break
				}
				case 'set_book_name_query_param': {
					bookTitleQueryParam.set(op.bookName)
					break
				}
				default:
					throw new Error('unreachable runTest')
			}

			// don't check on every op, in case some logic breaks when there are multiple diff entries
			if (getRandomNumber() > 0.5) {
				effect.execute()
				// these tests create a version of the index from scratch and check it against
				// the incrementally-updated version to make sure the logic matches.
				const authorNameIndexFromScratch = store.query.__uncached_createIndex(
					'author',
					'name'
				).value
				const authorIdIndexFromScratch = store.query.__uncached_createIndex(
					'book',
					'authorId'
				).value
				expect(authorNameIndex.value).toEqual(authorNameIndexFromScratch)
				expect(authorIdIndex.value).toEqual(authorIdIndexFromScratch)
				// these tests recreate the index from scratch based on the diffs so far and
				// check it against the gold standard version to make sure the diff logic matches.
				expect(recreateIndexFromDiffs(authorNameIndexDiffs)).toEqual(authorNameIndexFromScratch)
				expect(recreateIndexFromDiffs(authorIdIndexDiffs)).toEqual(authorIdIndexFromScratch)
				// these tests check the query results against filtering the whole record store from scratch
				expect(latestBooksByAuthorQueryResult.sort(bookComparator)).toEqual(
					store
						.allRecords()
						.filter(
							(r): r is Book => r.typeName === 'book' && r.authorId === authorIdQueryParam.value
						)
						.sort(bookComparator)
				)
				expect(new Set(latestBooksByAuthorQueryResult.map((b) => b.id))).toEqual(
					executeQuery(store.query, 'book', { authorId: { eq: authorIdQueryParam.value } })
				)
				expect(latestBooksByTitleQueryResult.sort(bookComparator)).toEqual(
					store
						.allRecords()
						.filter(
							(r): r is Book => r.typeName === 'book' && r.title === bookTitleQueryParam.value
						)
						.sort(bookComparator)
				)
				expect(new Set(latestBooksByTitleQueryResult.map((b) => b.id))).toEqual(
					executeQuery(store.query, 'book', { title: { eq: bookTitleQueryParam.value } })
				)
				expect(latestAuthorIdsByNameQueryResult).toEqual(
					new Set(
						store
							.allRecords()
							.filter(
								(r): r is Author => r.typeName === 'author' && r.name !== authorNameQueryParam.value
							)
							.map((r) => r.id)
					)
				)
				expect(latestAuthorIdsByNameQueryResult).toEqual(
					executeQuery(store.query, 'author', { name: { neq: authorNameQueryParam.value } })
				)
				// this test checks that the authorIdsByName set matches what you get when you reassemble it from the diffs
				expect(reacreateSetFromDiffs(authorIdsByNameDiffs)).toEqual(
					latestAuthorIdsByNameQueryResult
				)
			}
		}
	} catch (e) {
		console.error(ops)
		throw e
	}
}

const NUM_TESTS = 100
for (let i = 0; i < NUM_TESTS; i++) {
	const seed = Math.floor(Math.random() * 1000000)
	test('with seed ' + seed, () => {
		runTest(seed)
	})
}

// regression tests
test('(regression) with seed 128383', () => {
	runTest(128383)
})

test('(regression) with seed 894844', () => {
	runTest(894844)
})

test('(regression) with seed 436077', () => {
	runTest(436077)
})
