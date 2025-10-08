import { beforeEach, describe, expect, it } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { executeQuery, objectMatchesQuery } from './executeQuery'
import { createRecordType } from './RecordType'
import { Store } from './Store'
import { StoreSchema } from './StoreSchema'

// Test record types
interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
	age: number
	isActive: boolean
	publishedBooks: number
	country: string
}

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	authorId: RecordId<Author>
	publishedYear: number
	inStock: boolean
	rating: number
	category: string
	price: number
}

interface Review extends BaseRecord<'review', RecordId<Review>> {
	bookId: RecordId<Book>
	rating: number
	reviewerName: string
	content: string
	isVerified: boolean
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
}).withDefaultProperties(() => ({
	age: 25,
	isActive: true,
	publishedBooks: 0,
	country: 'USA',
}))

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
}).withDefaultProperties(() => ({
	rating: 0,
	category: 'fiction',
	price: 10.99,
}))

const Review = createRecordType<Review>('review', {
	validator: {
		validate(value) {
			const review = value as Review
			if (!review.id.startsWith('review:')) throw Error('Invalid review id')
			if (review.typeName !== 'review') throw Error('Invalid review typeName')
			if (!review.bookId.startsWith('book:')) throw Error('Invalid bookId')
			if (!Number.isFinite(review.rating)) throw Error('Invalid rating')
			if (typeof review.isVerified !== 'boolean') throw Error('Invalid isVerified')
			return review
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({
	isVerified: false,
	content: '',
	reviewerName: 'Anonymous',
}))

// Test data
const authors = {
	asimov: Author.create({
		name: 'Isaac Asimov',
		age: 72,
		publishedBooks: 200,
		country: 'USA',
	}),
	gibson: Author.create({
		name: 'William Gibson',
		age: 75,
		publishedBooks: 15,
		country: 'USA',
	}),
	herbert: Author.create({
		name: 'Frank Herbert',
		age: 65,
		publishedBooks: 30,
		country: 'USA',
	}),
	bradbury: Author.create({
		name: 'Ray Bradbury',
		age: 91,
		publishedBooks: 100,
		isActive: false,
		country: 'USA',
	}),
	clarke: Author.create({
		name: 'Arthur C. Clarke',
		age: 90,
		publishedBooks: 80,
		country: 'UK',
	}),
	adams: Author.create({
		name: 'Douglas Adams',
		age: 49,
		publishedBooks: 12,
		isActive: false,
		country: 'UK',
	}),
}

const books = {
	foundation: Book.create({
		title: 'Foundation',
		authorId: authors.asimov.id,
		publishedYear: 1951,
		inStock: true,
		rating: 5,
		category: 'sci-fi',
		price: 12.99,
	}),
	neuromancer: Book.create({
		title: 'Neuromancer',
		authorId: authors.gibson.id,
		publishedYear: 1984,
		inStock: true,
		rating: 5,
		category: 'cyberpunk',
		price: 14.99,
	}),
	dune: Book.create({
		title: 'Dune',
		authorId: authors.herbert.id,
		publishedYear: 1965,
		inStock: false,
		rating: 5,
		category: 'sci-fi',
		price: 13.99,
	}),
	fahrenheit451: Book.create({
		title: 'Fahrenheit 451',
		authorId: authors.bradbury.id,
		publishedYear: 1953,
		inStock: true,
		rating: 4,
		category: 'dystopian',
		price: 11.99,
	}),
	childhood: Book.create({
		title: "Childhood's End",
		authorId: authors.clarke.id,
		publishedYear: 1953,
		inStock: true,
		rating: 4,
		category: 'sci-fi',
		price: 10.99,
	}),
	hitchhiker: Book.create({
		title: "The Hitchhiker's Guide to the Galaxy",
		authorId: authors.adams.id,
		publishedYear: 1979,
		inStock: false,
		rating: 5,
		category: 'comedy-sci-fi',
		price: 9.99,
	}),
	robots: Book.create({
		title: 'I, Robot',
		authorId: authors.asimov.id,
		publishedYear: 1950,
		inStock: true,
		rating: 4,
		category: 'sci-fi',
		price: 12.99,
	}),
}

const reviews = {
	foundationReview1: Review.create({
		bookId: books.foundation.id,
		rating: 5,
		reviewerName: 'Sci-Fi Fan',
		content: 'Amazing epic saga!',
		isVerified: true,
	}),
	foundationReview2: Review.create({
		bookId: books.foundation.id,
		rating: 4,
		reviewerName: 'Book Lover',
		content: 'Great world building',
		isVerified: false,
	}),
	duneReview: Review.create({
		bookId: books.dune.id,
		rating: 5,
		reviewerName: 'Epic Reader',
		content: 'A masterpiece of science fiction',
		isVerified: true,
	}),
	neuromancerReview: Review.create({
		bookId: books.neuromancer.id,
		rating: 3,
		reviewerName: 'Casual Reader',
		content: 'Hard to follow at times',
		isVerified: false,
	}),
}

let store: Store<Author | Book | Review, unknown>

beforeEach(() => {
	const schema = StoreSchema.create({
		author: Author,
		book: Book,
		review: Review,
	})

	store = new Store({
		schema,
		props: {},
	}) as unknown as Store<Author | Book | Review, unknown>

	// Add all test data to store
	store.put([...Object.values(authors), ...Object.values(books), ...Object.values(reviews)])
})

describe('objectMatchesQuery', () => {
	describe('equality matching (eq)', () => {
		it('should match when property equals the target value', () => {
			const book = books.foundation
			const query = { inStock: { eq: true } }

			expect(objectMatchesQuery(query, book)).toBe(true)
		})

		it('should not match when property does not equal the target value', () => {
			const book = books.dune // inStock: false
			const query = { inStock: { eq: true } }

			expect(objectMatchesQuery(query, book)).toBe(false)
		})
	})

	describe('inequality matching (neq)', () => {
		it('should match when property does not equal the target value', () => {
			const book = books.foundation // category: 'sci-fi'
			const query = { category: { neq: 'romance' } }

			expect(objectMatchesQuery(query, book)).toBe(true)
		})

		it('should not match when property equals the target value', () => {
			const book = books.foundation // category: 'sci-fi'
			const query = { category: { neq: 'sci-fi' } }

			expect(objectMatchesQuery(query, book)).toBe(false)
		})
	})

	describe('greater than matching (gt)', () => {
		it('should match when numeric property is greater than target', () => {
			const book = books.neuromancer // publishedYear: 1984
			const query = { publishedYear: { gt: 1980 } }

			expect(objectMatchesQuery(query, book)).toBe(true)
		})

		it('should not match when numeric property equals target', () => {
			const book = books.neuromancer // publishedYear: 1984
			const query = { publishedYear: { gt: 1984 } }

			expect(objectMatchesQuery(query, book)).toBe(false)
		})

		it('should not match when property is not a number', () => {
			const book = { title: '1984', publishedYear: '1984' as any }
			const query = { publishedYear: { gt: 1980 } }

			expect(objectMatchesQuery(query, book)).toBe(false)
		})
	})

	describe('multiple criteria matching', () => {
		it('should match when all criteria are satisfied', () => {
			const book = books.foundation // inStock: true, publishedYear: 1951, category: 'sci-fi'
			const query = {
				inStock: { eq: true },
				publishedYear: { gt: 1950 },
				category: { neq: 'romance' },
			}

			expect(objectMatchesQuery(query, book)).toBe(true)
		})

		it('should not match when any criteria is not satisfied', () => {
			const book = books.dune // inStock: false, publishedYear: 1965, category: 'sci-fi'
			const query = {
				inStock: { eq: true }, // This will fail
				publishedYear: { gt: 1950 },
				category: { neq: 'romance' },
			}

			expect(objectMatchesQuery(query, book)).toBe(false)
		})
	})

	describe('edge cases', () => {
		it('should return true for empty query', () => {
			const book = books.foundation
			const query = {}

			expect(objectMatchesQuery(query, book)).toBe(true)
		})

		it('should handle missing properties gracefully', () => {
			const book = { title: 'Test' } as any
			const query = { nonexistentProperty: { eq: 'value' } }

			expect(objectMatchesQuery(query, book)).toBe(false)
		})
	})
})

describe('executeQuery', () => {
	describe('equality queries (eq)', () => {
		it('should find records with matching string values', () => {
			const query = { category: { eq: 'sci-fi' } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([
				books.foundation.id,
				books.dune.id,
				books.childhood.id,
				books.robots.id,
			])

			expect(result).toEqual(expectedIds)
		})

		it('should find records with matching RecordId values', () => {
			const query = { authorId: { eq: authors.asimov.id } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.foundation.id, books.robots.id])

			expect(result).toEqual(expectedIds)
		})

		it('should return empty set when no records match', () => {
			const query = { category: { eq: 'nonexistent-category' } }
			const result = executeQuery(store.query, 'book', query)

			expect(result).toEqual(new Set())
		})
	})

	describe('inequality queries (neq)', () => {
		it('should find records that do not match string values', () => {
			const query = { category: { neq: 'sci-fi' } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([
				books.neuromancer.id,
				books.fahrenheit451.id,
				books.hitchhiker.id,
			])

			expect(result).toEqual(expectedIds)
		})
	})

	describe('greater than queries (gt)', () => {
		it('should find records with values greater than threshold', () => {
			const query = { publishedYear: { gt: 1970 } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.neuromancer.id, books.hitchhiker.id])

			expect(result).toEqual(expectedIds)
		})

		it('should return empty set when no values are greater', () => {
			const query = { publishedYear: { gt: 2000 } }
			const result = executeQuery(store.query, 'book', query)

			expect(result).toEqual(new Set())
		})
	})

	describe('combined queries', () => {
		it('should handle mixed query types', () => {
			const query = {
				inStock: { eq: true },
				publishedYear: { gt: 1950 },
				category: { neq: 'romance' },
			}
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([
				books.foundation.id,
				books.neuromancer.id,
				books.fahrenheit451.id,
				books.childhood.id,
			])

			expect(result).toEqual(expectedIds)
		})
	})

	describe('edge cases', () => {
		it('should handle empty query', () => {
			const query = {}
			const result = executeQuery(store.query, 'book', query)

			// Empty query in executeQuery returns empty set (special handling is done in StoreQueries)
			expect(result).toEqual(new Set())
		})

		it('should handle different record types separately', () => {
			// Query for authors, should not return books
			const query = { name: { eq: 'Isaac Asimov' } }
			const result = executeQuery(store.query, 'author', query)

			const expectedIds = new Set([authors.asimov.id])
			expect(result).toEqual(expectedIds)

			// Same query on books should return empty
			const bookResult = executeQuery(store.query, 'book', query as any)
			expect(bookResult).toEqual(new Set())
		})
	})

	describe('store integration', () => {
		it('should update results when store changes', () => {
			const query = { category: { eq: 'mystery' } }

			// Initially no mystery books
			let result = executeQuery(store.query, 'book', query)
			expect(result).toEqual(new Set())

			// Add a mystery book
			const mysteryBook = Book.create({
				title: 'Murder Mystery',
				authorId: authors.asimov.id,
				publishedYear: 2000,
				inStock: true,
				category: 'mystery',
			})

			store.put([mysteryBook])

			// Should now find the mystery book
			result = executeQuery(store.query, 'book', query)
			expect(result).toEqual(new Set([mysteryBook.id]))
		})
	})
})
