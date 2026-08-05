import { atom, computed, EMPTY_ARRAY, RESET_VALUE } from '@tldraw/state'
import { beforeEach, describe, expect, it } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { createRecordType } from './RecordType'
import { Store } from './Store'
import { StoreSchema } from './StoreSchema'

// Tests for SPEC.md §11 (filtered history), §12 (indexes), and §13 (id, record, and exec
// queries). Rule IDs like [QI3] in test names refer to that document.

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
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
	title: string
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

const authors = {
	tolkein: Author.create({ name: 'J.R.R. Tolkein' }),
	bradbury: Author.create({ name: 'Ray Bradbury' }),
	davidMitchellSerious: Author.create({ name: 'David Mitchell' }),
	davidMitchellFunny: Author.create({ name: 'David Mitchell' }),
}

const books = {
	cloudAtlas: Book.create({ title: 'Cloud Atlas', authorId: authors.davidMitchellSerious.id }),
	myLifeInComedy: Book.create({
		title: 'My Life in Comedy',
		authorId: authors.davidMitchellFunny.id,
	}),
	lotr: Book.create({ title: 'Lord of the Rings', authorId: authors.tolkein.id }),
	farenheit: Book.create({ title: 'Farenheit 451', authorId: authors.bradbury.id }),
}

let store: Store<Author | Book>

beforeEach(() => {
	store = new Store({
		props: {},
		schema: StoreSchema.create<Author | Book>({
			author: Author,
			book: Book,
		}),
	})
	store.put([
		authors.tolkein,
		authors.bradbury,
		books.lotr,
		books.farenheit,
		authors.davidMitchellFunny,
		authors.davidMitchellSerious,
		books.cloudAtlas,
		books.myLifeInComedy,
	])
})

describe('filtered history (QH)', () => {
	it('[QH1] is cached per type name', () => {
		expect(store.query.filterHistory('author')).toBe(store.query.filterHistory('author'))
	})

	it('[QH1] contains only changes to records of the given type', () => {
		const authorHistory = store.query.filterHistory('author')

		authorHistory.get()

		let lastChangedEpoch = authorHistory.lastChangedEpoch

		expect(authorHistory.getDiffSince(lastChangedEpoch - 1)).toBe(RESET_VALUE)

		// updating an author changes the history
		store.put([{ ...authors.davidMitchellFunny, age: 30 }])

		authorHistory.get()

		expect(lastChangedEpoch).toBeLessThan(authorHistory.lastChangedEpoch)

		expect(authorHistory.getDiffSince(lastChangedEpoch)).toMatchObject([
			{ updated: { [authors.davidMitchellFunny.id]: [{ age: 23 }, { age: 30 }] } },
		])

		lastChangedEpoch = authorHistory.lastChangedEpoch

		// adding and removing authors shows up too
		const newAuthor = Author.create({ name: 'Stanley Briggs' })
		store.put([newAuthor])
		store.remove([authors.bradbury.id])

		expect(authorHistory.getDiffSince(lastChangedEpoch)).toMatchObject([
			{
				added: { [newAuthor.id]: { name: 'Stanley Briggs' } },
				removed: { [authors.bradbury.id]: { name: 'Ray Bradbury' } },
			},
		])
	})

	it('[QH3] changes to other types produce no observable change', () => {
		const authorHistory = store.query.filterHistory('author')
		authorHistory.get()

		const lastChangedEpoch = authorHistory.lastChangedEpoch

		store.put([
			{ ...books.lotr, title: 'The Lord of the Rings Part I: The Fellowship of the Ring' },
		])

		authorHistory.get()

		expect(authorHistory.lastChangedEpoch).toEqual(lastChangedEpoch)
		expect(authorHistory.getDiffSince(lastChangedEpoch)).toEqual([])
	})

	it('[QH2] changes that cancel out in a window produce no change', () => {
		const authorHistory = store.query.filterHistory('author')

		const epoch = authorHistory.get()
		const newAuthor = Author.create({ name: 'Stanley Briggs' })

		store.put([newAuthor])
		store.put([{ ...newAuthor, age: 38 }])
		store.remove([newAuthor.id])

		expect(authorHistory.get()).toEqual(epoch)

		store.remove([authors.tolkein.id])
		store.put([authors.tolkein])

		expect(authorHistory.get()).toEqual(epoch)
	})

	it('[QH2] update entries are removed when the record is deleted', () => {
		const authorHistory = store.query.filterHistory('author')

		authorHistory.get()

		const lastChangedEpoch = authorHistory.lastChangedEpoch

		store.put([{ ...authors.davidMitchellFunny, age: 38 }])
		store.put([{ ...authors.davidMitchellFunny, age: 343 }])
		store.remove([authors.davidMitchellFunny.id])

		expect(authorHistory.getDiffSince(lastChangedEpoch)).toMatchObject([
			{
				// shows the original, not the updated version
				removed: { [authors.davidMitchellFunny.id]: { age: 23 } },
			},
		])
	})

	it('[QH2] multiple update entries collapse into one', () => {
		const authorHistory = store.query.filterHistory('author')

		authorHistory.get()

		const lastChangedEpoch = authorHistory.lastChangedEpoch

		store.put([{ ...authors.davidMitchellFunny, age: 38 }])
		store.put([{ ...authors.davidMitchellFunny, age: 343 }])

		expect(authorHistory.getDiffSince(lastChangedEpoch)).toMatchObject([
			{
				updated: { [authors.davidMitchellFunny.id]: [{ age: 23 }, { age: 343 }] },
			},
		])
	})

	it('[QH2] an add followed by an update folds into the add', () => {
		const authorHistory = store.query.filterHistory('author')

		authorHistory.get()

		const lastChangedEpoch = authorHistory.lastChangedEpoch

		const newAuthor = Author.create({ name: 'Stanley Briggs' })

		store.put([newAuthor])
		store.put([{ ...newAuthor, age: 38 }])

		expect(authorHistory.getDiffSince(lastChangedEpoch)).toMatchObject([
			{
				added: { [newAuthor.id]: { age: 38 } },
			},
		])
	})
})

describe('indexes (QI)', () => {
	it('[QI2] are cached per type and property', () => {
		expect(store.query.index('author', 'name')).toBe(store.query.index('author', 'name'))
		expect(store.query.index('author', 'name')).not.toBe(store.query.index('author', 'age'))
	})

	it('[QI1] map each property value to the ids of records with that value', () => {
		const authorNameIndex = store.query.index('author', 'name')

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))
		expect(authorNameIndex.get().get('David Mitchell')).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id])
		)
		expect(authorNameIndex.get().get('Nonexistent')).toBeUndefined()

		const bookTitleIndex = store.query.index('book', 'title')
		expect(bookTitleIndex.get().get('Cloud Atlas')).toEqual(new Set([books.cloudAtlas.id]))
		expect(bookTitleIndex.get().get('Lord of the Rings')).toEqual(new Set([books.lotr.id]))
	})

	it('[QI1] records whose value is undefined are not indexed', () => {
		const newAuthor = { ...Author.create({ name: 'No Name' }), name: undefined } as any
		const index = store.query.index('author', 'name')
		store.put([newAuthor])
		expect(index.get().get(undefined)).toBeUndefined()
	})

	it('[QI3] adding records updates the index, with diffs', () => {
		const authorNameIndex = store.query.index('author', 'name')
		// deref to make it compute once
		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))

		let lastChangedEpoch = authorNameIndex.lastChangedEpoch
		const newAuthor = Author.create({ name: 'New Author' })

		store.put([newAuthor])

		expect(authorNameIndex.get().get('New Author')).toEqual(new Set([newAuthor.id]))

		const diff = authorNameIndex.getDiffSince(lastChangedEpoch)
		if (diff === RESET_VALUE) throw new Error('should not be reset')
		expect(diff).toHaveLength(1)
		expect(diff[0].get('New Author')).toEqual({
			added: new Set([newAuthor.id]),
		})
		expect(diff[0].size).toBe(1)

		const moreNewAuthors = [
			Author.create({ name: 'New Author' }),
			Author.create({ name: 'New Author' }),
			Author.create({ name: 'New Author' }),
		]

		lastChangedEpoch = authorNameIndex.lastChangedEpoch
		store.put(moreNewAuthors)

		expect(authorNameIndex.get().get('New Author')).toEqual(
			new Set([newAuthor.id, ...moreNewAuthors.map((a) => a.id)])
		)

		const diff2 = authorNameIndex.getDiffSince(lastChangedEpoch)

		if (diff2 === RESET_VALUE) throw new Error('should not be reset')

		expect(diff2).toHaveLength(1)
		expect(diff2[0].get('New Author')).toEqual({ added: new Set(moreNewAuthors.map((a) => a.id)) })
	})

	it('[QI3] updating a record moves its id between value sets', () => {
		const authorNameIndex = store.query.index('author', 'name')

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))

		const lastChangedEpoch = authorNameIndex.lastChangedEpoch

		store.put([{ ...authors.bradbury, name: 'J.R.R. Tolkein' }])

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(
			new Set([authors.tolkein.id, authors.bradbury.id])
		)

		const diff = authorNameIndex.getDiffSince(lastChangedEpoch)
		if (diff === RESET_VALUE) throw new Error('should not be reset')
		expect(diff).toHaveLength(1)
		expect(diff[0].size).toBe(2)
		expect(diff[0].get('J.R.R. Tolkein')).toEqual({
			added: new Set([authors.bradbury.id]),
		})
		expect(diff[0].get('Ray Bradbury')).toEqual({
			removed: new Set([authors.bradbury.id]),
		})
	})

	it('[QI3] removing records updates the index; empty value sets are dropped', () => {
		const authorNameIndex = store.query.index('author', 'name')

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))

		let lastChangedEpoch = authorNameIndex.lastChangedEpoch

		store.remove([authors.tolkein.id])

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(undefined)

		const diff = authorNameIndex.getDiffSince(lastChangedEpoch)
		if (diff === RESET_VALUE) throw new Error('should not be reset')
		expect(diff).toHaveLength(1)
		expect(diff[0].size).toBe(1)
		expect(diff[0].get('J.R.R. Tolkein')).toEqual({
			removed: new Set([authors.tolkein.id]),
		})

		lastChangedEpoch = authorNameIndex.lastChangedEpoch
		store.remove([
			authors.bradbury.id,
			authors.davidMitchellFunny.id,
			authors.davidMitchellSerious.id,
		])

		expect(authorNameIndex.get().get('Ray Bradbury')).toEqual(undefined)
		expect(authorNameIndex.get().get('David Mitchell')).toEqual(undefined)

		const diff2 = authorNameIndex.getDiffSince(lastChangedEpoch)

		if (diff2 === RESET_VALUE) throw new Error('should not be reset')

		expect(diff2).toHaveLength(1)
		expect(diff2[0].size).toBe(2)

		expect(diff2[0].get('Ray Bradbury')).toEqual({
			removed: new Set([authors.bradbury.id]),
		})
		expect(diff2[0].get('David Mitchell')).toEqual({
			removed: new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id]),
		})
	})

	it('[QI3] removals and additions for the same value combine in one diff', () => {
		const authorNameIndex = store.query.index('author', 'name')
		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))

		let lastChangedEpoch = authorNameIndex.lastChangedEpoch

		// do remove first
		store.remove([authors.tolkein.id])
		const newAuthor = Author.create({ name: 'J.R.R. Tolkein' })
		store.put([newAuthor])

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([newAuthor.id]))

		const diff = authorNameIndex.getDiffSince(lastChangedEpoch)

		if (diff === RESET_VALUE) throw new Error('should not be reset')

		expect(diff).toHaveLength(1)
		expect(diff[0].size).toBe(1)

		expect(diff[0].get('J.R.R. Tolkein')).toEqual({
			removed: new Set([authors.tolkein.id]),
			added: new Set([newAuthor.id]),
		})

		lastChangedEpoch = authorNameIndex.lastChangedEpoch
		// do updates
		store.put([{ ...authors.davidMitchellFunny, name: 'Ray Bradbury' }])
		store.put([{ ...authors.bradbury, name: 'David Mitchell' }])

		expect(authorNameIndex.get().get('Ray Bradbury')).toEqual(
			new Set([authors.davidMitchellFunny.id])
		)
		expect(authorNameIndex.get().get('David Mitchell')).toEqual(
			new Set([authors.bradbury.id, authors.davidMitchellSerious.id])
		)

		const diff2 = authorNameIndex.getDiffSince(lastChangedEpoch)

		if (diff2 === RESET_VALUE) throw new Error('should not be reset')

		expect(diff2).toHaveLength(1)
		expect(diff2[0].size).toBe(2)

		expect(diff2[0].get('Ray Bradbury')).toEqual({
			added: new Set([authors.davidMitchellFunny.id]),
			removed: new Set([authors.bradbury.id]),
		})
		expect(diff2[0].get('David Mitchell')).toEqual({
			added: new Set([authors.bradbury.id]),
			removed: new Set([authors.davidMitchellFunny.id]),
		})
	})

	it('[QI4] keeps the same map object if the indexed values did not change', () => {
		const authorNameIndex = store.query.index('author', 'name')

		const value = authorNameIndex.get()
		const lastChangedEpoch = authorNameIndex.lastChangedEpoch

		// change a property the index does not cover
		store.put([{ ...authors.tolkein, age: 23 }])
		store.put([{ ...authors.tolkein, age: 99 }])

		expect(authorNameIndex.get()).toBe(value)
		expect(authorNameIndex.lastChangedEpoch).toBe(lastChangedEpoch)
	})

	it('[QI5] a backslash-delimited property indexes a nested path', () => {
		interface Doc extends BaseRecord<'doc', RecordId<Doc>> {
			metadata: { sessionId?: string }
		}
		const Doc = createRecordType<Doc>('doc', { scope: 'document' })
		const docStore = new Store({
			props: {},
			schema: StoreSchema.create<Doc>({ doc: Doc }),
		})

		const docA = Doc.create({ metadata: { sessionId: 'alpha' } })
		const docB = Doc.create({ metadata: { sessionId: 'beta' } })
		const docNone = Doc.create({ metadata: {} })
		docStore.put([docA, docB, docNone])

		const index = docStore.query.index('doc', 'metadata\\sessionId')
		expect(index.get().get('alpha')).toEqual(new Set([docA.id]))
		expect(index.get().get('beta')).toEqual(new Set([docB.id]))
		// missing nested values are not indexed
		expect(index.get().get(undefined)).toBeUndefined()

		// incremental updates work through the nested path
		docStore.update(docA.id, (d) => ({ ...d, metadata: { sessionId: 'beta' } }))
		expect(index.get().get('alpha')).toBeUndefined()
		expect(index.get().get('beta')).toEqual(new Set([docB.id, docA.id]))
	})
})

describe('id queries (QQ)', () => {
	it('[QQ1] with no query, contains all ids of the type', () => {
		const bookQuery = store.query.ids('book')

		expect(bookQuery.get()).toEqual(
			new Set([books.cloudAtlas.id, books.farenheit.id, books.lotr.id, books.myLifeInComedy.id])
		)

		const authorQuery = store.query.ids('author')

		expect(authorQuery.get()).toEqual(
			new Set([
				authors.bradbury.id,
				authors.davidMitchellFunny.id,
				authors.davidMitchellSerious.id,
				authors.tolkein.id,
			])
		)

		const newAuthor = Author.create({ name: 'J.R.R. Tolkein' })
		const newBook = Book.create({ title: 'The Hobbit', authorId: newAuthor.id })
		store.put([newAuthor, newBook])

		expect(bookQuery.get()).toContain(newBook.id)
		expect(authorQuery.get()).toContain(newAuthor.id)
	})

	it('[QQ1] filters ids by the query expression', () => {
		const jrr = store.query.ids('author', () => ({
			name: { eq: 'J.R.R. Tolkein' },
		}))
		expect(jrr.get()).toEqual(new Set([authors.tolkein.id]))

		const mitchell = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
		}))
		expect(mitchell.get()).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id])
		)

		store.put([{ ...authors.davidMitchellFunny, age: 30 }])
		const mitchell30 = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
			age: { eq: 30 },
		}))
		expect(mitchell30.get()).toEqual(new Set([authors.davidMitchellFunny.id]))
	})

	it('[QQ1] emits collection diffs as records change', () => {
		const mitchell = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
		}))

		mitchell.get()
		const lastEpoch = mitchell.lastChangedEpoch

		const newAuthor = Author.create({ name: 'David Mitchell' })
		store.put([newAuthor])
		store.remove([authors.davidMitchellFunny.id])

		const diff = mitchell.getDiffSince(lastEpoch)
		if (diff === RESET_VALUE) throw new Error('should not be reset')
		expect(diff).toHaveLength(1)
		expect(diff[0]).toEqual({
			added: new Set([newAuthor.id]),
			removed: new Set([authors.davidMitchellFunny.id]),
		})
	})

	it('[QQ2] a reactive query expression rebuilds with a correct diff when it changes', () => {
		store.put([{ ...authors.davidMitchellFunny, age: 30 }])

		const currentAuthor = atom('currentAuthor', 'David Mitchell')
		const currentAge = atom('currentAge', 30)

		const mitchell30 = store.query.ids('author', () => ({
			name: { eq: currentAuthor.get() },
			age: { eq: currentAge.get() },
		}))

		expect(mitchell30.get()).toEqual(new Set([authors.davidMitchellFunny.id]))

		let lastChangedEpoch = mitchell30.lastChangedEpoch
		currentAge.set(23)

		expect(mitchell30.get()).toEqual(new Set([authors.davidMitchellSerious.id]))

		const diff = mitchell30.getDiffSince(lastChangedEpoch)

		if (diff === RESET_VALUE) throw new Error('should not be reset')

		expect(diff).toHaveLength(1)
		expect(diff[0]).toEqual({
			added: new Set([authors.davidMitchellSerious.id]),
			removed: new Set([authors.davidMitchellFunny.id]),
		})

		currentAuthor.set('J.R.R. Tolkein')

		lastChangedEpoch = mitchell30.lastChangedEpoch

		expect(mitchell30.get()).toEqual(new Set([authors.tolkein.id]))

		const diff2 = mitchell30.getDiffSince(lastChangedEpoch)

		if (diff2 === RESET_VALUE) throw new Error('should not be reset')

		expect(diff2).toHaveLength(1)
		expect(diff2[0]).toEqual({
			added: new Set([authors.tolkein.id]),
			removed: new Set([authors.davidMitchellSerious.id]),
		})
	})

	it('[QQ1] supports not-equals matches', () => {
		store.put([{ ...authors.davidMitchellFunny, age: 30 }])
		const mitchell = store.query.ids('author', () => ({
			name: { neq: 'David Mitchell' },
		}))

		expect(mitchell.get()).toEqual(new Set([authors.tolkein.id, authors.bradbury.id]))

		const ageNot23 = store.query.ids('author', () => ({
			age: { neq: 23 },
		}))

		expect(ageNot23.get()).toEqual(new Set([authors.davidMitchellFunny.id]))
	})

	it('[QQ1] updates as records are added, removed, and updated', () => {
		const mitchell = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
			age: { neq: 30 },
		}))

		expect(mitchell.get()).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id])
		)

		store.put([{ ...authors.davidMitchellFunny, age: 30 }])
		expect(mitchell.get()).toEqual(new Set([authors.davidMitchellSerious.id]))

		store.put([{ ...authors.davidMitchellFunny, age: 23 }])
		expect(mitchell.get()).toEqual(
			new Set([authors.davidMitchellSerious.id, authors.davidMitchellFunny.id])
		)

		store.remove([authors.davidMitchellFunny.id])
		expect(mitchell.get()).toEqual(new Set([authors.davidMitchellSerious.id]))

		const newAuthor = Author.create({ name: 'David Mitchell' })
		store.put([newAuthor])
		expect(mitchell.get()).toEqual(new Set([authors.davidMitchellSerious.id, newAuthor.id]))
	})

	it('[QQ3] does not change if unrelated records are added, updated, or removed', () => {
		const mitchell = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
		}))

		expect(mitchell.get()).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id])
		)

		const lastChangedEpoch = mitchell.lastChangedEpoch

		const newAuthor = Author.create({ name: 'William Shakespeare' })
		store.put([newAuthor])

		mitchell.get()
		expect(mitchell.lastChangedEpoch).toEqual(lastChangedEpoch)

		store.remove([authors.tolkein.id])

		mitchell.get()
		expect(mitchell.lastChangedEpoch).toEqual(lastChangedEpoch)
	})

	it('[QQ3] does not change if matching records change in irrelevant ways', () => {
		const mitchell = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
		}))

		expect(mitchell.get()).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id])
		)

		const lastChangedEpoch = mitchell.lastChangedEpoch

		store.put([{ ...authors.davidMitchellFunny, age: 30 }])

		mitchell.get()
		expect(mitchell.lastChangedEpoch).toEqual(lastChangedEpoch)

		// a change that does affect the query, just to check
		store.put([{ ...authors.davidMitchellFunny, name: 'steve' }])

		mitchell.get()
		expect(mitchell.lastChangedEpoch).toBeGreaterThan(lastChangedEpoch)
	})

	it('[QQ3] round trips (remove/add-back, add/remove) leave the set unchanged', () => {
		const mitchell = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
		}))

		expect(mitchell.get()).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id])
		)

		const lastChangedEpoch = mitchell.lastChangedEpoch

		store.remove([authors.davidMitchellFunny.id])
		store.put([authors.davidMitchellFunny])

		mitchell.get()
		expect(mitchell.lastChangedEpoch).toEqual(lastChangedEpoch)

		const newMitchell = Author.create({ name: 'David Mitchell' })
		store.put([newMitchell])
		store.remove([newMitchell.id])

		mitchell.get()
		expect(mitchell.lastChangedEpoch).toEqual(lastChangedEpoch)
	})
})

const bookComparator = (a: Book, b: Book) => a.title.localeCompare(b.title)

describe('record queries (QQ)', () => {
	it('[QQ4] records() returns all matching records', () => {
		const allBooks = store.query.records('book')

		expect(allBooks.get().sort(bookComparator)).toEqual(
			[books.cloudAtlas, books.farenheit, books.lotr, books.myLifeInComedy].sort(bookComparator)
		)

		const farenheit = store.query.records('book', () => ({
			title: { eq: 'Farenheit 451' },
		}))
		expect(farenheit.get()).toEqual([books.farenheit])

		const funnyGuide = Book.create({
			title: 'How to be a funny man',
			authorId: authors.davidMitchellFunny.id,
		})
		store.put([funnyGuide])
		const mitchell = store.query.records('book', () => ({
			authorId: { eq: authors.davidMitchellFunny.id },
		}))
		expect(mitchell.get().sort(bookComparator)).toEqual(
			[books.myLifeInComedy, funnyGuide].sort(bookComparator)
		)
	})

	it('[QQ4] records() keeps the same array when the members did not change', () => {
		const allBooks = store.query.records('book')
		const value = allBooks.get()

		// updating an author does not change the book array members
		store.put([{ ...authors.tolkein, age: 50 }])
		expect(allBooks.get()).toBe(value)
	})

	it('[QQ4] records() supports reactive query expressions', () => {
		const currentAuthor = atom('currentAuthor', authors.davidMitchellFunny.id)
		const booksQuery = store.query.records('book', () => ({
			authorId: { eq: currentAuthor.get() },
		}))

		expect(booksQuery.get()).toEqual([books.myLifeInComedy])

		currentAuthor.set(authors.tolkein.id)

		expect(booksQuery.get()).toEqual([books.lotr])
	})

	it('[QQ4] record() returns one matching record or undefined', () => {
		const farenheit = store.query.record('book', () => ({
			title: { eq: 'Farenheit 451' },
		}))
		expect(farenheit.get()).toEqual(books.farenheit)

		const nonexistent = store.query.record('book', () => ({
			title: { eq: 'No Such Book' },
		}))
		expect(nonexistent.get()).toBeUndefined()
	})

	it('[QQ4] record() updates reactively', () => {
		const tolkein = store.query.record('author', () => ({
			name: { eq: 'J.R.R. Tolkein' },
		}))
		expect(tolkein.get()?.age).toBe(23)

		store.put([{ ...authors.tolkein, age: 81 }])
		expect(tolkein.get()?.age).toBe(81)

		store.remove([authors.tolkein.id])
		expect(tolkein.get()).toBeUndefined()
	})

	it('[QQ5] exec runs a one-shot, non-reactive query', () => {
		const mitchells = store.query.exec('author', { name: { eq: 'David Mitchell' } })
		expect(new Set(mitchells)).toEqual(
			new Set([authors.davidMitchellFunny, authors.davidMitchellSerious])
		)

		// not reactive: subsequent store changes don't affect the returned array
		store.put([Author.create({ name: 'David Mitchell' })])
		expect(mitchells).toHaveLength(2)
	})

	it('[QQ5] exec returns the shared empty array when nothing matches', () => {
		expect(store.query.exec('author', { name: { eq: 'No Such Author' } })).toBe(EMPTY_ARRAY)
	})
})

describe('integration with reactive state (QI, QQ)', () => {
	it('[QI3] computed values see index updates', () => {
		const tolkeinBookCount = computed('tolkein-books', () => {
			const byAuthor = store.query.index('book', 'authorId')
			return byAuthor.get().get(authors.tolkein.id)?.size ?? 0
		})

		expect(tolkeinBookCount.get()).toBe(1)

		store.put([Book.create({ title: 'The Hobbit', authorId: authors.tolkein.id })])
		expect(tolkeinBookCount.get()).toBe(2)
	})
})
