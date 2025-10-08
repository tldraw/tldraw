import { atom, computed, RESET_VALUE } from '@tldraw/state'
import { beforeEach, describe, expect, it } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { createRecordType } from './RecordType'
import { Store } from './Store'
import { StoreQueries } from './StoreQueries'
import { StoreSchema } from './StoreSchema'

// Test record types
interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
	age: number
	isActive: boolean
	publishedBooks: number
}

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	authorId: RecordId<Author>
	publishedYear: number
	inStock: boolean
	rating: number
	category: string
}

const Author = createRecordType<Author>('author', {
	validator: {
		validate(value) {
			const author = value as Author
			if (author.typeName !== 'author') throw Error('Invalid typeName')
			if (!author.id.startsWith('author:')) throw Error('Invalid id')
			if (!Number.isFinite(author.age)) throw Error('Invalid age')
			if (author.age < 0) throw Error('Negative age')
			if (typeof author.isActive !== 'boolean') throw Error('Invalid isActive')
			return author
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({ age: 25, isActive: true, publishedBooks: 0 }))

const Book = createRecordType<Book>('book', {
	validator: {
		validate(value) {
			const book = value as Book
			if (!book.id.startsWith('book:')) throw Error('Invalid book id')
			if (book.typeName !== 'book') throw Error('Invalid book typeName')
			if (typeof book.title !== 'string') throw Error('Invalid title')
			if (!book.authorId.startsWith('author')) throw Error('Invalid authorId')
			if (!Number.isFinite(book.publishedYear)) throw Error('Invalid publishedYear')
			if (typeof book.inStock !== 'boolean') throw Error('Invalid inStock')
			return book
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({ rating: 0, category: 'fiction' }))

// Test data
const authors = {
	asimov: Author.create({ name: 'Isaac Asimov', age: 72, publishedBooks: 200 }),
	gibson: Author.create({ name: 'William Gibson', age: 75, publishedBooks: 15 }),
	herbert: Author.create({ name: 'Frank Herbert', age: 65, publishedBooks: 30 }),
	bradbury: Author.create({ name: 'Ray Bradbury', age: 91, publishedBooks: 100, isActive: false }),
	clarke: Author.create({ name: 'Arthur C. Clarke', age: 90, publishedBooks: 80 }),
}

const books = {
	foundation: Book.create({
		title: 'Foundation',
		authorId: authors.asimov.id,
		publishedYear: 1951,
		inStock: true,
		rating: 5,
		category: 'sci-fi',
	}),
	neuromancer: Book.create({
		title: 'Neuromancer',
		authorId: authors.gibson.id,
		publishedYear: 1984,
		inStock: true,
		rating: 5,
		category: 'cyberpunk',
	}),
	dune: Book.create({
		title: 'Dune',
		authorId: authors.herbert.id,
		publishedYear: 1965,
		inStock: false,
		rating: 5,
		category: 'sci-fi',
	}),
	fahrenheit451: Book.create({
		title: 'Fahrenheit 451',
		authorId: authors.bradbury.id,
		publishedYear: 1953,
		inStock: true,
		rating: 4,
		category: 'dystopian',
	}),
	childhood: Book.create({
		title: "Childhood's End",
		authorId: authors.clarke.id,
		publishedYear: 1953,
		inStock: true,
		rating: 4,
		category: 'sci-fi',
	}),
	robotSeries: Book.create({
		title: 'I, Robot',
		authorId: authors.asimov.id,
		publishedYear: 1950,
		inStock: false,
		rating: 4,
		category: 'sci-fi',
	}),
}

let store: Store<Author | Book>
let queries: StoreQueries<Author | Book>

beforeEach(() => {
	store = new Store({
		props: {},
		schema: StoreSchema.create<Author | Book>({
			author: Author,
			book: Book,
		}),
	})
	queries = store.query

	// Populate store with test data
	store.put([...Object.values(authors), ...Object.values(books)])
})

describe('filterHistory method', () => {
	it('should filter changes by type correctly', () => {
		const authorHistory = queries.filterHistory('author')
		const initialEpoch = authorHistory.get()

		// Add a new author
		const newAuthor = Author.create({ name: 'New Author', age: 40 })
		store.put([newAuthor])

		const afterAddEpoch = authorHistory.get()
		expect(afterAddEpoch).toBeGreaterThan(initialEpoch)

		// Add a book (should not affect author history)
		const newBook = Book.create({
			title: 'New Book',
			authorId: newAuthor.id,
			publishedYear: 2023,
			inStock: true,
			rating: 3,
		})
		const beforeBookAdd = authorHistory.lastChangedEpoch
		store.put([newBook])

		// Author history should not change when book is added
		expect(authorHistory.lastChangedEpoch).toBe(beforeBookAdd)
	})

	it('should handle record updates in filtered history', () => {
		const authorHistory = queries.filterHistory('author')
		authorHistory.get()

		const lastChangedEpoch = authorHistory.lastChangedEpoch

		// Update an author
		store.put([{ ...authors.asimov, age: 73 }])

		// Access the computed to trigger update
		authorHistory.get()

		expect(lastChangedEpoch).toBeLessThan(authorHistory.lastChangedEpoch)

		const diff = authorHistory.getDiffSince(lastChangedEpoch)
		expect(diff).not.toBe(RESET_VALUE)
		if (diff !== RESET_VALUE) {
			expect(diff).toHaveLength(1)
			expect(diff[0].updated).toHaveProperty(authors.asimov.id)
		}
	})

	it('should handle record removals in filtered history', () => {
		const authorHistory = queries.filterHistory('author')
		authorHistory.get()

		const lastChangedEpoch = authorHistory.lastChangedEpoch

		// Remove an author
		store.remove([authors.bradbury.id])

		// Access the computed to trigger update
		authorHistory.get()

		expect(lastChangedEpoch).toBeLessThan(authorHistory.lastChangedEpoch)

		const diff = authorHistory.getDiffSince(lastChangedEpoch)
		expect(diff).not.toBe(RESET_VALUE)
		if (diff !== RESET_VALUE) {
			expect(diff).toHaveLength(1)
			expect(diff[0].removed).toHaveProperty(authors.bradbury.id)
		}
	})

	it('should collapse add and remove operations in same batch', () => {
		const authorHistory = queries.filterHistory('author')
		authorHistory.get()

		const lastEpoch = authorHistory.lastChangedEpoch
		const tempAuthor = Author.create({ name: 'Temp Author' })

		// Add and then remove in same batch
		store.put([tempAuthor])
		store.remove([tempAuthor.id])

		// Should not change history if add and remove cancel out
		const diff = authorHistory.getDiffSince(lastEpoch)
		expect(diff).toEqual([])
	})

	it('should handle complex diff sequences', () => {
		const authorHistory = queries.filterHistory('author')
		authorHistory.get()

		const lastEpoch = authorHistory.lastChangedEpoch

		// Multiple operations
		const tempAuthor1 = Author.create({ name: 'Temp 1' })
		const tempAuthor2 = Author.create({ name: 'Temp 2' })

		store.put([tempAuthor1])
		store.put([tempAuthor2])
		store.put([{ ...tempAuthor1, age: 50 }]) // Update
		store.remove([tempAuthor2.id]) // Remove

		const diff = authorHistory.getDiffSince(lastEpoch)
		expect(diff).not.toBe(RESET_VALUE)
		if (diff !== RESET_VALUE) {
			expect(diff).toHaveLength(1)
			// Should have tempAuthor1 as added (with updated age)
			expect(diff[0].added).toHaveProperty(tempAuthor1.id)
			// Should not have tempAuthor2 since it was added then removed
			expect(diff[0].added).not.toHaveProperty(tempAuthor2.id)
			expect(diff[0].removed).not.toHaveProperty(tempAuthor2.id)
		}
	})
})

describe('index method', () => {
	it('should create correct index mappings', () => {
		const nameIndex = queries.index('author', 'name')
		const index = nameIndex.get()

		expect(index.get('Isaac Asimov')).toEqual(new Set([authors.asimov.id]))
		expect(index.get('William Gibson')).toEqual(new Set([authors.gibson.id]))
		expect(index.get('Nonexistent')).toBeUndefined()
	})

	it('should update indexes when records are added', () => {
		const nameIndex = queries.index('author', 'name')
		const _initialIndex = nameIndex.get()

		const newAuthor = Author.create({ name: 'New Author' })
		const lastEpoch = nameIndex.lastChangedEpoch

		store.put([newAuthor])

		// Access the index to trigger the update
		const updatedIndex = nameIndex.get()
		expect(nameIndex.lastChangedEpoch).toBeGreaterThan(lastEpoch)
		expect(updatedIndex.get('New Author')).toEqual(new Set([newAuthor.id]))

		const diff = nameIndex.getDiffSince(lastEpoch)
		expect(diff).not.toBe(RESET_VALUE)
		if (diff !== RESET_VALUE) {
			expect(diff).toHaveLength(1)
			expect(diff[0].get('New Author')).toEqual({ added: new Set([newAuthor.id]) })
		}
	})

	it('should update indexes when records are updated', () => {
		const nameIndex = queries.index('author', 'name')
		nameIndex.get() // Initialize

		const lastEpoch = nameIndex.lastChangedEpoch

		// Update author name
		store.put([{ ...authors.asimov, name: 'Dr. Isaac Asimov' }])

		// Access the index to trigger the update
		const updatedIndex = nameIndex.get()
		expect(nameIndex.lastChangedEpoch).toBeGreaterThan(lastEpoch)
		expect(updatedIndex.get('Isaac Asimov')).toBeUndefined()
		expect(updatedIndex.get('Dr. Isaac Asimov')).toEqual(new Set([authors.asimov.id]))

		const diff = nameIndex.getDiffSince(lastEpoch)
		expect(diff).not.toBe(RESET_VALUE)
		if (diff !== RESET_VALUE) {
			expect(diff).toHaveLength(1)
			expect(diff[0].get('Isaac Asimov')).toEqual({ removed: new Set([authors.asimov.id]) })
			expect(diff[0].get('Dr. Isaac Asimov')).toEqual({ added: new Set([authors.asimov.id]) })
		}
	})
})

describe('record method', () => {
	it('should return single matching record', () => {
		const asimovQuery = queries.record('author', () => ({
			name: { eq: 'Isaac Asimov' },
		}))

		expect(asimovQuery.get()).toEqual(authors.asimov)
	})

	it('should return undefined when no match found', () => {
		const nonexistentQuery = queries.record('author', () => ({
			name: { eq: 'Nonexistent Author' },
		}))

		expect(nonexistentQuery.get()).toBeUndefined()
	})

	it('should update reactively when matching record changes', () => {
		const query = queries.record('author', () => ({
			name: { eq: 'Isaac Asimov' },
		}))

		expect(query.get()?.age).toBe(72)

		// Update the matching record
		store.put([{ ...authors.asimov, age: 73 }])

		expect(query.get()?.age).toBe(73)
	})

	it('should handle reactive query parameters', () => {
		const targetName = atom('targetName', 'Isaac Asimov')

		const query = queries.record('author', () => ({
			name: { eq: targetName.get() },
		}))

		expect(query.get()).toEqual(authors.asimov)

		targetName.set('William Gibson')
		expect(query.get()).toEqual(authors.gibson)
	})

	it('should handle complex query conditions', () => {
		const query = queries.record('author', () => ({
			age: { gt: 70 },
			isActive: { eq: true },
		}))

		const result = query.get()
		expect(result).toBeDefined()
		expect(result!.age).toBeGreaterThan(70)
		expect(result!.isActive).toBe(true)
	})
})

describe('records method', () => {
	it('should return all records of type when no query provided', () => {
		const allBooks = queries.records('book')
		const books = allBooks.get()

		expect(books).toHaveLength(6)
		expect(books.every((book) => book.typeName === 'book')).toBe(true)
	})

	it('should filter records by query conditions', () => {
		const inStockBooks = queries.records('book', () => ({
			inStock: { eq: true },
		}))

		const books = inStockBooks.get()
		expect(books.every((book) => book.inStock === true)).toBe(true)
		expect(books.length).toBeGreaterThan(0)
	})

	it('should handle multiple query conditions', () => {
		const query = queries.records('book', () => ({
			category: { eq: 'sci-fi' },
			rating: { eq: 5 },
		}))

		const books = query.get()
		expect(books.every((book) => book.category === 'sci-fi' && book.rating === 5)).toBe(true)
	})

	it('should update reactively when records are added', () => {
		const allBooks = queries.records('book')
		const initialCount = allBooks.get().length

		const newBook = Book.create({
			title: 'New Book',
			authorId: authors.asimov.id,
			publishedYear: 2023,
			inStock: true,
			rating: 3,
		})

		store.put([newBook])

		expect(allBooks.get()).toHaveLength(initialCount + 1)
		expect(allBooks.get().some((book) => book.id === newBook.id)).toBe(true)
	})

	it('should update reactively when records are removed', () => {
		const allBooks = queries.records('book')
		const initialCount = allBooks.get().length

		store.remove([books.dune.id])

		expect(allBooks.get()).toHaveLength(initialCount - 1)
		expect(allBooks.get().some((book) => book.id === books.dune.id)).toBe(false)
	})

	it('should update reactively when records are updated', () => {
		const inStockBooks = queries.records('book', () => ({
			inStock: { eq: true },
		}))

		const initialBooks = inStockBooks.get()
		const initialCount = initialBooks.length

		// Update a book to be out of stock
		store.put([{ ...books.foundation, inStock: false }])

		const updatedBooks = inStockBooks.get()
		expect(updatedBooks).toHaveLength(initialCount - 1)
		expect(updatedBooks.some((book) => book.id === books.foundation.id)).toBe(false)
	})

	it('should handle reactive query parameters', () => {
		const targetCategory = atom('targetCategory', 'sci-fi')

		const query = queries.records('book', () => ({
			category: { eq: targetCategory.get() },
		}))

		const sciFiBooks = query.get()
		expect(sciFiBooks.every((book) => book.category === 'sci-fi')).toBe(true)

		targetCategory.set('cyberpunk')
		const cyberpunkBooks = query.get()
		expect(cyberpunkBooks.every((book) => book.category === 'cyberpunk')).toBe(true)
		expect(cyberpunkBooks).toHaveLength(1)
		expect(cyberpunkBooks[0]).toEqual(books.neuromancer)
	})
})

describe('ids method', () => {
	it('should return set of all record IDs when no query provided', () => {
		const allBookIds = queries.ids('book')
		const ids = allBookIds.get()

		expect(ids).toBeInstanceOf(Set)
		expect(ids.size).toBe(6)
		Object.values(books).forEach((book) => {
			expect(ids.has(book.id)).toBe(true)
		})
	})

	it('should filter IDs by query conditions', () => {
		const highRatedIds = queries.ids('book', () => ({
			rating: { eq: 5 },
		}))

		const ids = highRatedIds.get()
		expect(ids).toBeInstanceOf(Set)

		// Verify all returned IDs match the criteria
		ids.forEach((id) => {
			const book = store.get(id)!
			expect(book.rating).toBe(5)
		})
	})

	it('should update with collection diffs when records change', () => {
		const inStockIds = queries.ids('book', () => ({
			inStock: { eq: true },
		}))

		const _initialIds = inStockIds.get()
		const lastEpoch = inStockIds.lastChangedEpoch

		// Add a new book
		const newBook = Book.create({
			title: 'New In-Stock Book',
			authorId: authors.asimov.id,
			publishedYear: 2023,
			inStock: true,
			rating: 4,
		})
		store.put([newBook])

		const updatedIds = inStockIds.get()
		expect(updatedIds.has(newBook.id)).toBe(true)

		const diff = inStockIds.getDiffSince(lastEpoch)
		expect(diff).not.toBe(RESET_VALUE)
		if (diff !== RESET_VALUE) {
			expect(diff).toHaveLength(1)
			expect(diff[0].added?.has(newBook.id)).toBe(true)
		}
	})

	it('should handle reactive query parameters with from-scratch rebuild', () => {
		const targetYear = atom('targetYear', 1950)

		const query = queries.ids('book', () => ({
			publishedYear: { gt: targetYear.get() },
		}))

		const initialIds = query.get()
		const initialSize = initialIds.size

		// Change query parameter should trigger from-scratch rebuild
		const lastEpoch = query.lastChangedEpoch
		targetYear.set(1970)

		const updatedIds = query.get()
		expect(query.lastChangedEpoch).toBeGreaterThan(lastEpoch)

		// Should have fewer results with higher year threshold
		expect(updatedIds.size).toBeLessThan(initialSize)

		updatedIds.forEach((id) => {
			const book = store.get(id)!
			expect(book.publishedYear).toBeGreaterThan(1970)
		})
	})

	it('should efficiently handle incremental updates', () => {
		const query = queries.ids('book', () => ({
			inStock: { eq: true },
		}))

		query.get() // Initialize
		const lastEpoch = query.lastChangedEpoch

		// Update a book's stock status
		store.put([{ ...books.dune, inStock: true }])

		const diff = query.getDiffSince(lastEpoch)
		expect(diff).not.toBe(RESET_VALUE)
		if (diff !== RESET_VALUE) {
			expect(diff).toHaveLength(1)
			expect(diff[0].added?.has(books.dune.id)).toBe(true)
		}
	})
})

describe('exec method', () => {
	it('should execute non-reactive queries', () => {
		const result = queries.exec('author', {
			isActive: { eq: true },
		})

		expect(Array.isArray(result)).toBe(true)
		expect(result.every((author) => author.isActive === true)).toBe(true)
	})

	it('should handle complex query conditions', () => {
		const result = queries.exec('book', {
			rating: { eq: 5 },
			category: { eq: 'sci-fi' },
		})

		expect(result.every((book) => book.rating === 5 && book.category === 'sci-fi')).toBe(true)
		expect(result.length).toBeGreaterThan(0)
	})
})

describe('integration with reactive state', () => {
	it('should work with computed values', () => {
		const booksByCategory = computed('books-by-category', () => {
			const categoryIndex = queries.index('book', 'category')
			const sciFiBooks = categoryIndex.get().get('sci-fi') || new Set()
			return sciFiBooks.size
		})

		const initialCount = booksByCategory.get()
		expect(initialCount).toBeGreaterThan(0)

		// Add a sci-fi book
		const newSciFiBook = Book.create({
			title: 'New Sci-Fi',
			authorId: authors.asimov.id,
			publishedYear: 2023,
			inStock: true,
			rating: 4,
			category: 'sci-fi',
		})
		store.put([newSciFiBook])

		expect(booksByCategory.get()).toBe(initialCount + 1)
	})

	it('should propagate changes through multiple reactive layers', () => {
		const authorBookCounts = computed('author-book-counts', () => {
			const authorIndex = queries.index('book', 'authorId')
			const counts = new Map()

			for (const [authorId, bookIds] of authorIndex.get()) {
				counts.set(authorId, bookIds.size)
			}

			return counts
		})

		const asimovInitialCount = authorBookCounts.get().get(authors.asimov.id) || 0

		// Add book by Asimov
		const newAsimovBook = Book.create({
			title: 'New Asimov Book',
			authorId: authors.asimov.id,
			publishedYear: 2023,
			inStock: true,
			rating: 4,
		})
		store.put([newAsimovBook])

		expect(authorBookCounts.get().get(authors.asimov.id)).toBe(asimovInitialCount + 1)
	})
})
