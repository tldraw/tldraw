import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { Store } from '../Store'
import { StoreSchema } from '../StoreSchema'

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
	age: number
}

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	authorId: RecordId<Author>
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
	mitchell: Author.create({ name: 'David Mitchell' }),
}

const books = {
	cloudAtlas: Book.create({ title: 'Cloud Atlas', authorId: authors.mitchell.id }),
	lotr: Book.create({ title: 'Lord of the Rings', authorId: authors.tolkein.id }),
	fahrenheit: Book.create({ title: 'Fahrenheit 451', authorId: authors.bradbury.id }),
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
	store.put([...Object.values(authors), ...Object.values(books)])
})

describe('store query functionality', () => {
	it('should create and cache indexes', () => {
		const index1 = store.query.index('author', 'name')
		const index2 = store.query.index('author', 'name')
		expect(index1).toBe(index2)
	})

	it('should create indexes that map property values to record IDs', () => {
		const nameIndex = store.query.index('author', 'name')
		expect(nameIndex.get().get('J.R.R. Tolkein')).toEqual(new Set([authors.tolkein.id]))
		expect(nameIndex.get().get('David Mitchell')).toEqual(new Set([authors.mitchell.id]))
	})

	it('should query for all records of a type', () => {
		const allBooks = store.query.records('book')
		expect(allBooks.get()).toHaveLength(3)
		expect(allBooks.get().every((book) => book.typeName === 'book')).toBe(true)
	})

	it('should query for record IDs with filters', () => {
		const tolkeinBooks = store.query.ids('book', () => ({
			authorId: { eq: authors.tolkein.id },
		}))
		expect(tolkeinBooks.get()).toEqual(new Set([books.lotr.id]))
	})

	it('should filter history by record type', () => {
		const authorHistory = store.query.filterHistory('author')
		const initialEpoch = authorHistory.get()

		// Add a new author - should affect author history
		const newAuthor = Author.create({ name: 'New Author' })
		store.put([newAuthor])

		expect(authorHistory.get()).toBeGreaterThan(initialEpoch)

		// Add a book - should not affect author history
		const authorEpochAfterAuthorAdd = authorHistory.lastChangedEpoch
		const newBook = Book.create({ title: 'New Book', authorId: newAuthor.id })
		store.put([newBook])
		authorHistory.get() // Trigger computation

		expect(authorHistory.lastChangedEpoch).toBe(authorEpochAfterAuthorAdd)
	})
})
