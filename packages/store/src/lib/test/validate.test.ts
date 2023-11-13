import { BaseRecord, IdOf, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { SerializedStore, Store } from '../Store'
import { StoreSchema } from '../StoreSchema'

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	author: IdOf<Author>
	numPages: number
}

const Book = createRecordType<Book>('book', {
	validator: {
		validate(value) {
			const book = value as Book
			if (!book.id.startsWith('book:')) throw Error()
			if (book.typeName !== 'book') throw Error()
			if (typeof book.title !== 'string') throw Error()
			if (!Number.isFinite(book.numPages)) throw Error()
			if (book.numPages < 0) throw Error()
			return book
		},
	},
	scope: 'document',
})

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
	isPseudonym: boolean
}

const Author = createRecordType<Author>('author', {
	validator: {
		validate(value) {
			const author = value as Author
			if (author.typeName !== 'author') throw Error()
			if (!author.id.startsWith('author:')) throw Error()
			if (typeof author.name !== 'string') throw Error()
			if (typeof author.isPseudonym !== 'boolean') throw Error()
			return author
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({
	isPseudonym: false,
}))

const schema = StoreSchema.create<Book | Author>(
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
)

describe('Store with validation', () => {
	let store: Store<Book | Author>

	beforeEach(() => {
		store = new Store({ schema, props: {} })
	})

	it('Accepts valid records and rejects invalid records', () => {
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])

		expect(store.query.records('author').get()).toEqual([
			{ id: 'author:tolkein', typeName: 'author', name: 'J.R.R Tolkein', isPseudonym: false },
		])

		expect(() => {
			store.put([
				{
					id: Book.createId('the-hobbit'),
					typeName: 'book',
					title: 'The Hobbit',
					numPages: -1, // <---- Invalid!
					author: Author.createId('tolkein'),
				},
			])
		}).toThrow()

		expect(store.query.records('book').get()).toEqual([])
	})
})

describe('Validating initial data', () => {
	let snapshot: SerializedStore<Book | Author>

	beforeEach(() => {
		const authorId = Author.createId('tolkein')
		const authorRecord = Author.create({ name: 'J.R.R Tolkein', id: authorId })
		const bookId = Book.createId('the-hobbit')
		const bookRecord = Book.create({
			title: 'The Hobbit',
			numPages: 300,
			author: authorId,
			id: bookId,
		})

		snapshot = {
			[authorId]: authorRecord,
			[bookId]: bookRecord,
		}
	})

	it('Validates initial data', () => {
		expect(() => {
			new Store<Book | Author>({ schema, initialData: snapshot, props: {} })
		}).not.toThrowError()

		expect(() => {
			// @ts-expect-error
			snapshot[0].name = 4

			new Store<Book | Author>({ schema, initialData: snapshot, props: {} })
		}).toThrowError()
	})
})

describe('Create & update validations', () => {
	const authorId = Author.createId('tolkein')
	const bookId = Book.createId('the-hobbit')
	const initialAuthor = Author.create({ name: 'J.R.R Tolkein', id: authorId })
	const invalidBook = Book.create({
		// @ts-expect-error - deliberately invalid data
		title: 4,
		numPages: 300,
		author: authorId,
		id: bookId,
	})
	const validBook = Book.create({
		title: 'The Hobbit',
		numPages: 300,
		author: authorId,
		id: bookId,
	})

	it('Prevents creating a store with invalid records', () => {
		expect(
			() =>
				new Store<Book | Author>({
					schema,
					initialData: { [bookId]: invalidBook, [authorId]: initialAuthor },
					props: {},
				})
		).toThrow()
	})

	it('Prevents updating invalid records to a store', () => {
		const store = new Store<Book | Author>({
			schema,
			initialData: { [bookId]: validBook, [authorId]: initialAuthor },
			props: {},
		})

		expect(() => {
			store.put([invalidBook])
		}).toThrow()
	})

	it('Prevents adding invalid records to a store', () => {
		const newAuthorId = Author.createId('shearing')
		const store = new Store<Book | Author>({
			schema,
			initialData: { [bookId]: validBook, [authorId]: initialAuthor },
			props: {},
		})

		expect(() => {
			store.put([
				Author.create({
					// @ts-expect-error - deliberately invalid data
					name: 5,
					id: newAuthorId,
				}),
			])
		}).toThrow()

		expect(store.get(newAuthorId)).toBeUndefined()
	})
})
