import { atom, computed, RESET_VALUE } from '@tldraw/state'
import { beforeEach, describe, expect, it, test } from 'vitest'
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

describe('StoreQueries constructor and initialization', () => {
	it('should be created with recordMap and history', () => {
		expect(queries).toBeInstanceOf(StoreQueries)
		expect(queries).toBeDefined()
	})

	it('should have empty caches initially', () => {
		// Access private properties for testing
		const indexCache = (queries as any).indexCache
		const historyCache = (queries as any).historyCache

		expect(indexCache.size).toBe(0)
		expect(historyCache.size).toBe(0)
	})
})

describe('filterHistory method', () => {
	it('should cache filtered history computations', () => {
		const authorHistory1 = queries.filterHistory('author')
		const authorHistory2 = queries.filterHistory('author')
		const bookHistory = queries.filterHistory('book')

		expect(authorHistory1).toBe(authorHistory2)
		expect(authorHistory1).not.toBe(bookHistory)
	})

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

		let lastChangedEpoch = authorHistory.lastChangedEpoch

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

		let lastChangedEpoch = authorHistory.lastChangedEpoch

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
	it('should cache index computations', () => {
		const nameIndex1 = queries.index('author', 'name')
		const nameIndex2 = queries.index('author', 'name')
		const ageIndex = queries.index('author', 'age')

		expect(nameIndex1).toBe(nameIndex2)
		expect(nameIndex1).not.toBe(ageIndex)
	})

	it('should create correct index mappings', () => {
		const nameIndex = queries.index('author', 'name')
		const index = nameIndex.get()

		expect(index.get('Isaac Asimov')).toEqual(new Set([authors.asimov.id]))
		expect(index.get('William Gibson')).toEqual(new Set([authors.gibson.id]))
		expect(index.get('Nonexistent')).toBeUndefined()
	})

	it('should update indexes when records are added', () => {
		const nameIndex = queries.index('author', 'name')
		const initialIndex = nameIndex.get()

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

	it('should handle property updates that dont change index key', () => {
		const nameIndex = queries.index('author', 'name')
		nameIndex.get() // Initialize

		const lastEpoch = nameIndex.lastChangedEpoch

		// Update author age (not indexed property)
		store.put([{ ...authors.asimov, age: 73 }])

		// Index should not change
		expect(nameIndex.lastChangedEpoch).toBe(lastEpoch)
	})

	it('should handle multiple authors with same name', () => {
		const author1 = Author.create({ name: 'John Smith' })
		const author2 = Author.create({ name: 'John Smith' })

		store.put([author1, author2])

		const nameIndex = queries.index('author', 'name')
		expect(nameIndex.get().get('John Smith')).toEqual(new Set([author1.id, author2.id]))
	})

	it('should handle index updates with empty value cleanup', () => {
		const author = Author.create({ name: 'Temp Author' })
		store.put([author])

		const nameIndex = queries.index('author', 'name')
		expect(nameIndex.get().get('Temp Author')).toEqual(new Set([author.id]))

		const lastEpoch = nameIndex.lastChangedEpoch

		// Remove the author
		store.remove([author.id])

		// Access the index to trigger the update
		const updatedIndex = nameIndex.get()
		expect(nameIndex.lastChangedEpoch).toBeGreaterThan(lastEpoch)
		// Empty sets should be removed from index
		expect(updatedIndex.get('Temp Author')).toBeUndefined()
	})
})

describe('__uncached_createIndex method', () => {
	it('should create index without caching', () => {
		// Access private method for testing
		const index1 = (queries as any).__uncached_createIndex('author', 'name')
		const index2 = (queries as any).__uncached_createIndex('author', 'name')

		// Should be different instances
		expect(index1).not.toBe(index2)

		// But should have same data
		expect(index1.get()).toEqual(index2.get())
	})

	it('should handle from-scratch index building', () => {
		const index = (queries as any).__uncached_createIndex('author', 'isActive')
		const indexMap = index.get()

		// Count active authors
		const activeIds = new Set()
		const inactiveIds = new Set()

		Object.values(authors).forEach((author) => {
			if (author.isActive) {
				activeIds.add(author.id)
			} else {
				inactiveIds.add(author.id)
			}
		})

		expect(indexMap.get(true)).toEqual(activeIds)
		expect(indexMap.get(false)).toEqual(inactiveIds)
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

	it('should return first match when multiple records match', () => {
		// Create multiple authors with same age
		const author1 = Author.create({ name: 'Author 1', age: 99 })
		const author2 = Author.create({ name: 'Author 2', age: 99 })
		store.put([author1, author2])

		const query = queries.record('author', () => ({
			age: { eq: 99 },
		}))

		const result = query.get()
		expect(result).toBeDefined()
		expect(result!.age).toBe(99)
		// Should be one of the two authors
		expect([author1.id, author2.id]).toContain(result!.id)
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

	it('should handle empty query (match any)', () => {
		const query = queries.record('author')
		const result = query.get()

		expect(result).toBeDefined()
		expect(result!.typeName).toBe('author')
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

	it('should use shallow array equality for performance', () => {
		const query = queries.records('book')
		const result1 = query.get()

		// No changes, should return same array reference
		const result2 = query.get()
		expect(result1).toBe(result2)

		// Add a record, should return new array
		const newBook = Book.create({
			title: 'New Book',
			authorId: authors.asimov.id,
			publishedYear: 2023,
			inStock: true,
			rating: 3,
		})
		store.put([newBook])

		const result3 = query.get()
		expect(result3).not.toBe(result1)
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

	it('should handle neq (not equal) queries', () => {
		const notSciFiIds = queries.ids('book', () => ({
			category: { neq: 'sci-fi' },
		}))

		const ids = notSciFiIds.get()
		ids.forEach((id) => {
			const book = store.get(id)!
			expect(book.category).not.toBe('sci-fi')
		})
	})

	it('should handle gt (greater than) queries', () => {
		const modernBooksIds = queries.ids('book', () => ({
			publishedYear: { gt: 1960 },
		}))

		const ids = modernBooksIds.get()
		ids.forEach((id) => {
			const book = store.get(id)!
			expect(book.publishedYear).toBeGreaterThan(1960)
		})
	})

	it('should handle complex query combinations', () => {
		const complexQuery = queries.ids('book', () => ({
			rating: { gt: 3 },
			inStock: { eq: true },
			category: { neq: 'romance' },
		}))

		const ids = complexQuery.get()
		ids.forEach((id) => {
			const book = store.get(id)!
			expect(book.rating).toBeGreaterThan(3)
			expect(book.inStock).toBe(true)
			expect(book.category).not.toBe('romance')
		})
	})

	it('should update with collection diffs when records change', () => {
		const inStockIds = queries.ids('book', () => ({
			inStock: { eq: true },
		}))

		const initialIds = inStockIds.get()
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

	it('should handle empty query result', () => {
		const impossibleQuery = queries.ids('book', () => ({
			publishedYear: { gt: 3000 },
		}))

		const ids = impossibleQuery.get()
		expect(ids).toBeInstanceOf(Set)
		expect(ids.size).toBe(0)
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

	it('should handle add then remove operations efficiently', () => {
		const query = queries.ids('book', () => ({
			category: { eq: 'mystery' },
		}))

		query.get() // Initialize
		const lastEpoch = query.lastChangedEpoch

		// Add a mystery book then remove it
		const mysteryBook = Book.create({
			title: 'Mystery Book',
			authorId: authors.asimov.id,
			publishedYear: 2023,
			inStock: true,
			rating: 3,
			category: 'mystery',
		})

		store.put([mysteryBook])
		store.remove([mysteryBook.id])

		// Should not change the query result since add/remove canceled out
		const diff = query.getDiffSince(lastEpoch)
		expect(diff).toEqual([])
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

	it('should return empty array for no matches', () => {
		const result = queries.exec('book', {
			publishedYear: { gt: 3000 },
		})

		expect(result).toEqual([])
	})

	it('should handle complex query conditions', () => {
		const result = queries.exec('book', {
			rating: { eq: 5 },
			category: { eq: 'sci-fi' },
		})

		expect(result.every((book) => book.rating === 5 && book.category === 'sci-fi')).toBe(true)
		expect(result.length).toBeGreaterThan(0)
	})

	it('should return current state without reactivity', () => {
		// Execute query
		const initialResult = queries.exec('book', {
			inStock: { eq: true },
		})
		const initialCount = initialResult.length

		// Add a new book
		const newBook = Book.create({
			title: 'New Book',
			authorId: authors.asimov.id,
			publishedYear: 2023,
			inStock: true,
			rating: 3,
		})
		store.put([newBook])

		// Execute same query again - should get updated results
		const secondResult = queries.exec('book', {
			inStock: { eq: true },
		})

		expect(secondResult.length).toBe(initialCount + 1)
		expect(secondResult.some((book) => book.id === newBook.id)).toBe(true)
	})

	it('should handle all query matcher types', () => {
		// Test eq matcher
		const eqResult = queries.exec('book', {
			category: { eq: 'sci-fi' },
		})
		expect(eqResult.every((book) => book.category === 'sci-fi')).toBe(true)

		// Test neq matcher
		const neqResult = queries.exec('book', {
			category: { neq: 'sci-fi' },
		})
		expect(neqResult.every((book) => book.category !== 'sci-fi')).toBe(true)

		// Test gt matcher
		const gtResult = queries.exec('book', {
			publishedYear: { gt: 1960 },
		})
		expect(gtResult.every((book) => book.publishedYear > 1960)).toBe(true)
	})

	it('should handle empty query object', () => {
		const result = queries.exec('author', {})

		// exec with empty query returns empty array (different from ids/records methods)
		expect(result).toHaveLength(0)
		expect(Array.isArray(result)).toBe(true)
	})
})

describe('performance and edge cases', () => {
	it('should handle large datasets efficiently', () => {
		// Create many authors
		const manyAuthors = Array.from({ length: 1000 }, (_, i) =>
			Author.create({
				name: `Author ${i}`,
				age: 20 + (i % 80),
				isActive: i % 3 === 0,
			})
		)

		store.put(manyAuthors)

		// Create index and query
		const ageIndex = queries.index('author', 'age')
		const youngAuthors = queries.ids('author', () => ({
			age: { gt: 25 },
		}))

		// These operations should complete quickly
		const indexResult = ageIndex.get()
		const queryResult = youngAuthors.get()

		expect(indexResult).toBeInstanceOf(Map)
		expect(queryResult).toBeInstanceOf(Set)
	})

	it('should handle concurrent index access', () => {
		const nameIndex = queries.index('author', 'name')
		const ageIndex = queries.index('author', 'age')
		const activeIndex = queries.index('author', 'isActive')

		// Access all indexes
		const names = nameIndex.get()
		const ages = ageIndex.get()
		const actives = activeIndex.get()

		expect(names).toBeInstanceOf(Map)
		expect(ages).toBeInstanceOf(Map)
		expect(actives).toBeInstanceOf(Map)

		// Verify they track the same records
		const allIds = new Set(
			[...names.values(), ...ages.values(), ...actives.values()]
				.flat()
				.map((set) => [...set])
				.flat()
		)
		expect(allIds.size).toBeGreaterThan(0)
	})

	it('should handle invalid query parameters gracefully', () => {
		// This should not throw but return empty results
		const invalidQuery = queries.ids(
			'book',
			() =>
				({
					nonexistentProperty: { eq: 'value' },
				}) as any
		)

		const result = invalidQuery.get()
		expect(result).toBeInstanceOf(Set)
	})

	it('should maintain cache consistency across operations', () => {
		// Create a fresh store to test cache behavior in isolation
		const freshStore = new Store({
			props: {},
			schema: StoreSchema.create<Author | Book>({
				author: Author,
				book: Book,
			}),
		})
		const freshQueries = freshStore.query

		const indexCache = (freshQueries as any).indexCache
		const historyCache = (freshQueries as any).historyCache

		// Initially empty
		expect(indexCache.size).toBe(0)
		expect(historyCache.size).toBe(0)

		// Create some cached items
		freshQueries.index('author', 'name')
		freshQueries.index('book', 'title')
		freshQueries.filterHistory('author')

		expect(indexCache.size).toBe(2)
		// Note: creating indexes also creates filtered history entries internally
		expect(historyCache.size).toBeGreaterThanOrEqual(1)

		const initialHistoryCacheSize = historyCache.size

		// Operations should not clear caches
		freshStore.put([Author.create({ name: 'Cache Test' })])

		expect(indexCache.size).toBe(2)
		expect(historyCache.size).toBe(initialHistoryCacheSize)
	})

	it('should handle store with no records of queried type', () => {
		// Remove all books
		Object.values(books).forEach((book) => store.remove([book.id]))

		const bookQuery = queries.ids('book')
		const result = bookQuery.get()

		expect(result).toBeInstanceOf(Set)
		expect(result.size).toBe(0)
	})

	it('should handle reset values in history gracefully', () => {
		const authorHistory = queries.filterHistory('author')
		authorHistory.get()

		// Force a reset by accessing diff from very old epoch
		const veryOldEpoch = 0
		const diff = authorHistory.getDiffSince(veryOldEpoch)

		expect(diff).toBe(RESET_VALUE)
	})

	test('should handle property values of different types in indexes', () => {
		// Create index on boolean property
		const activeIndex = queries.index('author', 'isActive')
		const activeMap = activeIndex.get()

		expect(activeMap.has(true)).toBe(true)
		expect(activeMap.has(false)).toBe(true)

		// Create index on number property
		const ageIndex = queries.index('author', 'age')
		const ageMap = ageIndex.get()

		expect(ageMap.size).toBeGreaterThan(0)
		for (const [age, ids] of ageMap) {
			expect(typeof age).toBe('number')
			expect(ids).toBeInstanceOf(Set)
		}
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
