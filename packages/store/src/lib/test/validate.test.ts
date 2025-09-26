import { BaseRecord, IdOf, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { Store } from '../Store'
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
			if (!book.id.startsWith('book:')) throw Error('Invalid book ID')
			if (book.typeName !== 'book') throw Error('Invalid book typeName')
			if (typeof book.title !== 'string') throw Error('Invalid book title')
			if (!Number.isFinite(book.numPages)) throw Error('Invalid book numPages')
			if (book.numPages < 0) throw Error('Book numPages cannot be negative')
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
			if (author.typeName !== 'author') throw Error('Invalid author typeName')
			if (!author.id.startsWith('author:')) throw Error('Invalid author ID')
			if (typeof author.name !== 'string') throw Error('Invalid author name')
			if (typeof author.isPseudonym !== 'boolean') throw Error('Invalid author isPseudonym')
			return author
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({
	isPseudonym: false,
}))

const schema = StoreSchema.create<Book | Author>({
	book: Book,
	author: Author,
})

describe('Store validation integration', () => {
	it('validates business logic constraints during record operations', () => {
		const store = new Store({ schema, props: {} })

		// Valid record should be accepted
		store.put([Author.create({ name: 'J.R.R Tolkein', id: Author.createId('tolkein') })])
		expect(store.query.records('author').get()).toHaveLength(1)

		// Invalid record should be rejected due to business logic constraint
		expect(() => {
			store.put([
				{
					id: Book.createId('the-hobbit'),
					typeName: 'book',
					title: 'The Hobbit',
					numPages: -1, // Business logic: pages cannot be negative
					author: Author.createId('tolkein'),
				},
			])
		}).toThrow('Book numPages cannot be negative')

		expect(store.query.records('book').get()).toEqual([])
	})
})
