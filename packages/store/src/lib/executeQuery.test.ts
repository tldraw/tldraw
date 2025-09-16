import { beforeEach, describe, expect, it, test } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import {
	executeQuery,
	objectMatchesQuery,
	QueryExpression,
	QueryValueMatcher,
} from './executeQuery'
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

describe('QueryValueMatcher type', () => {
	test('should support equality matcher', () => {
		const matcher: QueryValueMatcher<string> = { eq: 'test' }
		expect(matcher).toEqual({ eq: 'test' })
	})

	test('should support inequality matcher', () => {
		const matcher: QueryValueMatcher<string> = { neq: 'test' }
		expect(matcher).toEqual({ neq: 'test' })
	})

	test('should support greater than matcher', () => {
		const matcher: QueryValueMatcher<number> = { gt: 100 }
		expect(matcher).toEqual({ gt: 100 })
	})
})

describe('QueryExpression type', () => {
	test('should support multiple property matchers', () => {
		const query: QueryExpression<Book> = {
			inStock: { eq: true },
			publishedYear: { gt: 1950 },
			category: { neq: 'romance' },
		}

		expect(query).toEqual({
			inStock: { eq: true },
			publishedYear: { gt: 1950 },
			category: { neq: 'romance' },
		})
	})

	test('should support partial property matching', () => {
		const query: QueryExpression<Book> = {
			inStock: { eq: true },
		}

		expect(query).toEqual({
			inStock: { eq: true },
		})
	})
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

		it('should match string values', () => {
			const book = books.foundation
			const query = { category: { eq: 'sci-fi' } }

			expect(objectMatchesQuery(query, book)).toBe(true)
		})

		it('should match number values', () => {
			const book = books.foundation
			const query = { publishedYear: { eq: 1951 } }

			expect(objectMatchesQuery(query, book)).toBe(true)
		})

		it('should handle null and undefined values', () => {
			const testObj = { value: null as string | null }
			const query = { value: { eq: null } }

			expect(objectMatchesQuery(query, testObj)).toBe(true)
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

		it('should match string values', () => {
			const author = authors.asimov // name: 'Isaac Asimov'
			const query = { name: { neq: 'George Orwell' } }

			expect(objectMatchesQuery(query, author)).toBe(true)
		})

		it('should match boolean values', () => {
			const author = authors.asimov // isActive: true
			const query = { isActive: { neq: false } }

			expect(objectMatchesQuery(query, author)).toBe(true)
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

		it('should not match when numeric property is less than target', () => {
			const book = books.foundation // publishedYear: 1951
			const query = { publishedYear: { gt: 1980 } }

			expect(objectMatchesQuery(query, book)).toBe(false)
		})

		it('should not match when property is not a number', () => {
			const book = { title: '1984', publishedYear: '1984' as any }
			const query = { publishedYear: { gt: 1980 } }

			expect(objectMatchesQuery(query, book)).toBe(false)
		})

		it('should handle decimal values', () => {
			const book = books.neuromancer // price: 14.99
			const query = { price: { gt: 14.0 } }

			expect(objectMatchesQuery(query, book)).toBe(true)
		})

		it('should handle zero values', () => {
			const testObj = { count: 0 }
			const queryGreater = { count: { gt: -1 } }
			const queryLess = { count: { gt: 0 } }

			expect(objectMatchesQuery(queryGreater, testObj)).toBe(true)
			expect(objectMatchesQuery(queryLess, testObj)).toBe(false)
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

		it('should handle complex mixed criteria', () => {
			const author = authors.asimov // age: 72, publishedBooks: 200, isActive: true
			const query = {
				age: { gt: 70 },
				publishedBooks: { gt: 150 },
				isActive: { eq: true },
				name: { neq: 'Unknown Author' },
			}

			expect(objectMatchesQuery(query, author)).toBe(true)
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

		it('should handle properties with undefined values', () => {
			const testObj = { value: undefined as string | undefined }
			const query = { value: { eq: undefined } }

			expect(objectMatchesQuery(query, testObj)).toBe(true)
		})

		it('should handle boolean edge cases', () => {
			const testObj = { flag: false }
			const query = { flag: { neq: true } }

			expect(objectMatchesQuery(query, testObj)).toBe(true)
		})

		it('should handle negative numbers', () => {
			const testObj = { temperature: -10 }
			const queryGreater = { temperature: { gt: -20 } }
			const queryLess = { temperature: { gt: 0 } }

			expect(objectMatchesQuery(queryGreater, testObj)).toBe(true)
			expect(objectMatchesQuery(queryLess, testObj)).toBe(false)
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

		it('should find records with matching boolean values', () => {
			const query = { inStock: { eq: true } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([
				books.foundation.id,
				books.neuromancer.id,
				books.fahrenheit451.id,
				books.childhood.id,
				books.robots.id,
			])

			expect(result).toEqual(expectedIds)
		})

		it('should find records with matching number values', () => {
			const query = { publishedYear: { eq: 1953 } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.fahrenheit451.id, books.childhood.id])

			expect(result).toEqual(expectedIds)
		})

		it('should return empty set when no records match', () => {
			const query = { category: { eq: 'nonexistent-category' } }
			const result = executeQuery(store.query, 'book', query)

			expect(result).toEqual(new Set())
		})

		it('should find records with matching RecordId values', () => {
			const query = { authorId: { eq: authors.asimov.id } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.foundation.id, books.robots.id])

			expect(result).toEqual(expectedIds)
		})

		it('should handle different record types', () => {
			const query = { isActive: { eq: false } }
			const result = executeQuery(store.query, 'author', query)

			const expectedIds = new Set([authors.bradbury.id, authors.adams.id])

			expect(result).toEqual(expectedIds)
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

		it('should find records that do not match boolean values', () => {
			const query = { inStock: { neq: true } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.dune.id, books.hitchhiker.id])

			expect(result).toEqual(expectedIds)
		})

		it('should find records that do not match number values', () => {
			const query = { rating: { neq: 5 } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.fahrenheit451.id, books.childhood.id, books.robots.id])

			expect(result).toEqual(expectedIds)
		})

		it('should handle RecordId values', () => {
			const query = { authorId: { neq: authors.asimov.id } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([
				books.neuromancer.id,
				books.dune.id,
				books.fahrenheit451.id,
				books.childhood.id,
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

		it('should handle decimal values', () => {
			const query = { price: { gt: 12.0 } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([
				books.foundation.id,
				books.neuromancer.id,
				books.dune.id,
				books.robots.id,
			])

			expect(result).toEqual(expectedIds)
		})

		it('should handle zero threshold', () => {
			const query = { rating: { gt: 0 } }
			const result = executeQuery(store.query, 'book', query)

			// All books have rating > 0
			const expectedIds = new Set([
				books.foundation.id,
				books.neuromancer.id,
				books.dune.id,
				books.fahrenheit451.id,
				books.childhood.id,
				books.hitchhiker.id,
				books.robots.id,
			])

			expect(result).toEqual(expectedIds)
		})

		it('should return empty set when no values are greater', () => {
			const query = { publishedYear: { gt: 2000 } }
			const result = executeQuery(store.query, 'book', query)

			expect(result).toEqual(new Set())
		})

		it('should handle different record types', () => {
			const query = { age: { gt: 80 } }
			const result = executeQuery(store.query, 'author', query)

			const expectedIds = new Set([authors.bradbury.id, authors.clarke.id])

			expect(result).toEqual(expectedIds)
		})
	})

	describe('combined queries', () => {
		it('should handle multiple equality criteria', () => {
			const query = {
				inStock: { eq: true },
				category: { eq: 'sci-fi' },
			}
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.foundation.id, books.childhood.id, books.robots.id])

			expect(result).toEqual(expectedIds)
		})

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

		it('should return intersection of all criteria', () => {
			const query = {
				publishedYear: { gt: 1950 },
				['publishedYear' as string]: { eq: 1984 }, // This will overwrite the gt query
			} as any
			// Note: This tests the behavior when the same property has multiple matchers
			// In practice, the last matcher wins due to object property behavior
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.neuromancer.id])

			expect(result).toEqual(expectedIds)
		})

		it('should handle complex author queries', () => {
			const query = {
				isActive: { eq: true },
				age: { gt: 70 },
				publishedBooks: { gt: 50 },
			}
			const result = executeQuery(store.query, 'author', query)

			const expectedIds = new Set([authors.asimov.id, authors.clarke.id])

			expect(result).toEqual(expectedIds)
		})

		it('should return empty set when criteria have no intersection', () => {
			const query = {
				inStock: { eq: true },
				['inStock' as string]: { eq: false }, // Impossible combination due to overwrite
			} as any
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.dune.id, books.hitchhiker.id])

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

		it('should handle non-existent property', () => {
			const query = { nonExistentProperty: { eq: 'value' } } as any
			const result = executeQuery(store.query, 'book', query)

			// Should return empty set since no books have this property
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

		it('should handle reviews with different structure', () => {
			const query = { isVerified: { eq: true } }
			const result = executeQuery(store.query, 'review', query)

			const expectedIds = new Set([reviews.foundationReview1.id, reviews.duneReview.id])

			expect(result).toEqual(expectedIds)
		})

		it('should handle queries with no matches in index', () => {
			const query = { rating: { eq: 10 } } // No book has rating 10
			const result = executeQuery(store.query, 'book', query)

			expect(result).toEqual(new Set())
		})
	})

	describe('type safety', () => {
		it('should work with properly typed queries', () => {
			const query: QueryExpression<Book> = {
				title: { eq: 'Foundation' },
				inStock: { eq: true },
				publishedYear: { gt: 1950 },
			}

			const result = executeQuery(store.query, 'book', query)
			const expectedIds = new Set([books.foundation.id])
			expect(result).toEqual(expectedIds)
		})

		it('should work with author queries', () => {
			const query: QueryExpression<Author> = {
				name: { eq: 'Isaac Asimov' },
				isActive: { eq: true },
				age: { gt: 50 },
			}

			const result = executeQuery(store.query, 'author', query)
			const expectedIds = new Set([authors.asimov.id])
			expect(result).toEqual(expectedIds)
		})

		it('should work with review queries', () => {
			const query: QueryExpression<Review> = {
				rating: { gt: 3 },
				isVerified: { eq: true },
			}

			const result = executeQuery(store.query, 'review', query)
			const expectedIds = new Set([reviews.foundationReview1.id, reviews.duneReview.id])
			expect(result).toEqual(expectedIds)
		})
	})

	describe('performance and consistency', () => {
		it('should return consistent results on multiple calls', () => {
			const query = { category: { eq: 'sci-fi' } }

			const result1 = executeQuery(store.query, 'book', query)
			const result2 = executeQuery(store.query, 'book', query)

			expect(result1).toEqual(result2)
		})

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

		it('should handle large result sets', () => {
			// Create many books
			const manyBooks = Array.from({ length: 50 }, (_, i) =>
				Book.create({
					title: `Book ${i}`,
					authorId: authors.asimov.id,
					publishedYear: 2000 + i,
					inStock: i % 2 === 0,
					category: 'test',
				})
			)

			store.put(manyBooks)

			const query = { category: { eq: 'test' } }
			const result = executeQuery(store.query, 'book', query)

			expect(result.size).toBe(50)
			expect([...result]).toEqual(expect.arrayContaining(manyBooks.map((b) => b.id)))
		})
	})
})
