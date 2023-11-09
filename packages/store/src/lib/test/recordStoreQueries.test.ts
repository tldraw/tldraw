import { atom, RESET_VALUE } from '@tldraw/state'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { Store } from '../Store'
import { StoreSchema } from '../StoreSchema'

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
		schema: StoreSchema.create<Author | Book>(
			{
				author: Author,
				book: Book,
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

describe('indexes', () => {
	it('are cached', () => {
		const authorNameIndex1 = store.query.index('author', 'name')
		const authorNameIndex2 = store.query.index('author', 'name')
		expect(authorNameIndex1).toBe(authorNameIndex2)
	})
	it('can be made on any property', () => {
		const authorNameIndex = store.query.index('author', 'name')

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))
		expect(authorNameIndex.get().get('David Mitchell')).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id])
		)

		const bookTitleIndex = store.query.index('book', 'title')
		expect(bookTitleIndex.get().get('Cloud Atlas')).toEqual(new Set([books.cloudAtlas.id]))
		expect(bookTitleIndex.get().get('Lord of the Rings')).toEqual(new Set([books.lotr.id]))
	})

	it('can have things added when records are added', () => {
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

	it('can have things added when records are updated', () => {
		const authorNameIndex = store.query.index('author', 'name')

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))

		let lastChangedEpoch = authorNameIndex.lastChangedEpoch

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

		lastChangedEpoch = authorNameIndex.lastChangedEpoch
		store.put([
			{ ...authors.davidMitchellFunny, name: 'J.R.R. Tolkein' },
			{ ...authors.davidMitchellSerious, name: 'J.R.R. Tolkein' },
		])

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(
			new Set([
				authors.tolkein.id,
				authors.bradbury.id,
				authors.davidMitchellFunny.id,
				authors.davidMitchellSerious.id,
			])
		)

		const diff2 = authorNameIndex.getDiffSince(lastChangedEpoch)

		if (diff2 === RESET_VALUE) throw new Error('should not be reset')

		expect(diff2).toHaveLength(1)
		expect(diff2[0].size).toBe(2)

		expect(diff2[0].get('J.R.R. Tolkein')).toEqual({
			added: new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id]),
		})

		expect(diff2[0].get('David Mitchell')).toEqual({
			removed: new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id]),
		})
	})

	it('can have things removed when records are removed', () => {
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

	it('can have things removed when records are updated', () => {
		const authorNameIndex = store.query.index('author', 'name')
		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))

		let lastChangedEpoch = authorNameIndex.lastChangedEpoch

		store.put([{ ...authors.tolkein, name: 'Ray Bradbury' }])

		expect(authorNameIndex.get().get('Ray Bradbury')).toEqual(
			new Set([authors.tolkein.id, authors.bradbury.id])
		)
		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(undefined)

		const diff = authorNameIndex.getDiffSince(lastChangedEpoch)
		if (diff === RESET_VALUE) throw new Error('should not be reset')
		expect(diff).toHaveLength(1)
		expect(diff[0].size).toBe(2)
		expect(diff[0].get('J.R.R. Tolkein')).toEqual({
			removed: new Set([authors.tolkein.id]),
		})

		expect(diff[0].get('Ray Bradbury')).toEqual({
			added: new Set([authors.tolkein.id]),
		})

		lastChangedEpoch = authorNameIndex.lastChangedEpoch
		store.put([
			{ ...authors.davidMitchellFunny, name: 'Ray Bradbury' },
			{ ...authors.davidMitchellSerious, name: 'Ray Bradbury' },
		])

		expect(authorNameIndex.get().get('Ray Bradbury')).toEqual(
			new Set([
				authors.tolkein.id,
				authors.bradbury.id,
				authors.davidMitchellFunny.id,
				authors.davidMitchellSerious.id,
			])
		)
		expect(authorNameIndex.get().get('David Mitchell')).toEqual(undefined)

		const diff2 = authorNameIndex.getDiffSince(lastChangedEpoch)

		if (diff2 === RESET_VALUE) throw new Error('should not be reset')

		expect(diff2).toHaveLength(1)
		expect(diff2[0].size).toBe(2)

		expect(diff2[0].get('David Mitchell')).toEqual({
			removed: new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id]),
		})

		expect(diff2[0].get('Ray Bradbury')).toEqual({
			added: new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id]),
		})
	})

	it('handles things being removed and added for the same value at the same time', () => {
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

	it('has the same value if nothing changed', () => {
		const authorNameIndex = store.query.index('author', 'name')

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))

		const lastChangedEpoch = authorNameIndex.lastChangedEpoch

		store.put([{ ...authors.tolkein, age: 23 }])

		expect(authorNameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))

		expect(lastChangedEpoch).toBe(authorNameIndex.lastChangedEpoch)
	})
})

describe('queries for ids', () => {
	it('can query for all values of a given type', () => {
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

		expect(bookQuery.get()).toEqual(
			new Set([
				books.cloudAtlas.id,
				books.farenheit.id,
				books.lotr.id,
				books.myLifeInComedy.id,
				newBook.id,
			])
		)

		expect(authorQuery.get()).toEqual(
			new Set([
				authors.bradbury.id,
				authors.davidMitchellFunny.id,
				authors.davidMitchellSerious.id,
				authors.tolkein.id,
				newAuthor.id,
			])
		)
	})

	it('can query for a single value', () => {
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
	})

	it('can query for multiple values', () => {
		store.put([{ ...authors.davidMitchellFunny, age: 30 }])

		const mitchell30 = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
			age: { eq: 30 },
		}))

		expect(mitchell30.get()).toEqual(new Set([authors.davidMitchellFunny.id]))
	})

	it('can use a reactive query', () => {
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

	it('supports not-equals matches', () => {
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

	it('supports records being added', () => {
		const mitchell = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
		}))

		expect(mitchell.get()).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id])
		)

		const newAuthor = Author.create({ name: 'David Mitchell' })
		store.put([newAuthor])

		expect(mitchell.get()).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id, newAuthor.id])
		)
	})

	it('supports records being removed', () => {
		const mitchell = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
		}))

		expect(mitchell.get()).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id])
		)

		store.remove([authors.davidMitchellFunny.id])

		expect(mitchell.get()).toEqual(new Set([authors.davidMitchellSerious.id]))
	})

	it('supports records being updated', () => {
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
	})

	it('does not update if unrelated records are added, upated, or removed', () => {
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

	it('doesnt change if related records are updated', () => {
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

		// make a change that does affect the query just to check
		store.put([{ ...authors.davidMitchellFunny, name: 'steve' }])

		mitchell.get()
		expect(mitchell.lastChangedEpoch).toBeGreaterThan(lastChangedEpoch)
	})

	it('supports items being removed and then added back', () => {
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
	})

	it('supports items being added and then removed', () => {
		const mitchell = store.query.ids('author', () => ({
			name: { eq: 'David Mitchell' },
		}))

		expect(mitchell.get()).toEqual(
			new Set([authors.davidMitchellFunny.id, authors.davidMitchellSerious.id])
		)

		const lastChangedEpoch = mitchell.lastChangedEpoch

		const newMitchell = Author.create({ name: 'David Mitchell' })

		store.put([newMitchell])
		store.remove([newMitchell.id])

		mitchell.get()

		expect(mitchell.lastChangedEpoch).toEqual(lastChangedEpoch)
	})
})

const bookComparator = (a: Book, b: Book) => a.title.localeCompare(b.title)

describe('queries for records', () => {
	it('can query for all values of a given type', () => {
		const allBooks = store.query.records('book')

		expect(allBooks.get().sort(bookComparator)).toEqual(
			[books.cloudAtlas, books.farenheit, books.lotr, books.myLifeInComedy].sort(bookComparator)
		)

		const newBook = Book.create({ title: 'The Hobbit', authorId: authors.tolkein.id })

		store.put([newBook])

		expect(allBooks.get().sort(bookComparator)).toEqual(
			[books.cloudAtlas, books.farenheit, books.lotr, books.myLifeInComedy, newBook].sort(
				bookComparator
			)
		)
	})

	it('can query for a single value', () => {
		const farenheit = store.query.records('book', () => ({
			title: { eq: 'Farenheit 451' },
		}))

		expect(farenheit.get()).toEqual([books.farenheit])
	})

	it('can query for multiple values', () => {
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

	it('supports reactive queries', () => {
		const currentAuthor = atom('currentAuthor', authors.davidMitchellFunny.id)
		const booksQuery = store.query.records('book', () => ({
			authorId: { eq: currentAuthor.get() },
		}))

		expect(booksQuery.get()).toEqual([books.myLifeInComedy])

		currentAuthor.set(authors.tolkein.id)

		expect(booksQuery.get()).toEqual([books.lotr])
	})
})

describe('filtering history', () => {
	it('caches filters', () => {
		const filter = store.query.filterHistory('author')
		const filter2 = store.query.filterHistory('author')

		expect(filter).toBe(filter2)
	})
	it('allows filtering history', () => {
		const authorHistory = store.query.filterHistory('author')

		authorHistory.get()

		let lastChangedEpoch = authorHistory.lastChangedEpoch

		expect(authorHistory.getDiffSince(lastChangedEpoch - 1)).toBe(RESET_VALUE)

		// updating an author should change the history
		store.put([{ ...authors.davidMitchellFunny, age: 30 }])

		authorHistory.get()

		expect(lastChangedEpoch).toBeLessThan(authorHistory.lastChangedEpoch)

		expect(authorHistory.getDiffSince(lastChangedEpoch)).toMatchObject([
			{ updated: { [authors.davidMitchellFunny.id]: [{ age: 23 }, { age: 30 }] } },
		])

		lastChangedEpoch = authorHistory.lastChangedEpoch

		// updating a book should not change the history

		store.put([
			{ ...books.lotr, title: 'The Lord of the Rings Part I: The Fellowship of the Ring' },
		])

		authorHistory.get()

		expect(authorHistory.lastChangedEpoch).toEqual(lastChangedEpoch)
		expect(authorHistory.getDiffSince(lastChangedEpoch)).toMatchObject([])
	})

	it('should not update if changes in a window of time cancel each other out', () => {
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

	it('removes update entries if a thing was deleted', () => {
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

	it('collapses multiple updated entries into one', () => {
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

	it('collapeses an add + update entry into just an add entry', () => {
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
