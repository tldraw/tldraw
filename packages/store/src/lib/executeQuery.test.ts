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
	metadata: {
		sessionId: string
		status?: 'published' | 'draft' | 'archived'
		copies?: number
		extras: {
			region: string
		}
	}
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
			if (typeof book.metadata !== 'object' || book.metadata === null)
				throw Error('Invalid metadata')
			if (typeof book.metadata.sessionId !== 'string') throw Error('Invalid sessionId')
			if (
				typeof book.metadata.extras !== 'object' ||
				book.metadata.extras === null ||
				typeof book.metadata.extras.region !== 'string'
			)
				throw Error('Invalid extras')
			return book
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({
	rating: 0,
	category: 'fiction',
	price: 10.99,
	metadata: {
		sessionId: 'session:default',
		extras: {
			region: 'global',
		},
	},
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
		metadata: {
			sessionId: 'session:alpha',
			extras: { region: 'us' },
		},
	}),
	neuromancer: Book.create({
		title: 'Neuromancer',
		authorId: authors.gibson.id,
		publishedYear: 1984,
		inStock: true,
		rating: 5,
		category: 'cyberpunk',
		price: 14.99,
		metadata: {
			sessionId: 'session:beta',
			extras: { region: 'us' },
		},
	}),
	dune: Book.create({
		title: 'Dune',
		authorId: authors.herbert.id,
		publishedYear: 1965,
		inStock: false,
		rating: 5,
		category: 'sci-fi',
		price: 13.99,
		metadata: {
			sessionId: 'session:beta',
			extras: { region: 'eu' },
		},
	}),
	fahrenheit451: Book.create({
		title: 'Fahrenheit 451',
		authorId: authors.bradbury.id,
		publishedYear: 1953,
		inStock: true,
		rating: 4,
		category: 'dystopian',
		price: 11.99,
		metadata: {
			sessionId: 'session:beta',
			extras: { region: 'us' },
		},
	}),
	childhood: Book.create({
		title: "Childhood's End",
		authorId: authors.clarke.id,
		publishedYear: 1953,
		inStock: true,
		rating: 4,
		category: 'sci-fi',
		price: 10.99,
		metadata: {
			sessionId: 'session:gamma',
			extras: { region: 'global' },
		},
	}),
	hitchhiker: Book.create({
		title: "The Hitchhiker's Guide to the Galaxy",
		authorId: authors.adams.id,
		publishedYear: 1979,
		inStock: false,
		rating: 5,
		category: 'comedy-sci-fi',
		price: 9.99,
		metadata: {
			sessionId: 'session:alpha',
			extras: { region: 'uk' },
		},
	}),
	robots: Book.create({
		title: 'I, Robot',
		authorId: authors.asimov.id,
		publishedYear: 1950,
		inStock: true,
		rating: 4,
		category: 'sci-fi',
		price: 12.99,
		metadata: {
			sessionId: 'session:alpha',
			extras: { region: 'us' },
		},
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
			const book = { title: '1984', publishedYear: '1984' }
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

	describe('nested object matching', () => {
		it('should match when nested property satisfies criteria', () => {
			const query = { metadata: { sessionId: { eq: 'session:alpha' } } }

			expect(objectMatchesQuery(query, books.foundation)).toBe(true)
		})

		it('should not match when nested property fails criteria', () => {
			const query = { metadata: { sessionId: { eq: 'session:alpha' } } }

			expect(objectMatchesQuery(query, books.neuromancer)).toBe(false)
		})

		it('should match deeply nested properties', () => {
			const query = { metadata: { extras: { region: { eq: 'eu' } } } }

			expect(objectMatchesQuery(query, books.dune)).toBe(true)
		})

		it('should return false when nested object is missing', () => {
			const book = {
				typeName: 'book',
				id: 'book:custom',
				metadata: {},
			} as Book
			const query = { metadata: { sessionId: { eq: 'session:alpha' } } }

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
			const book = { title: 'Test' }
			const query = { nonexistentProperty: { eq: 'value' } }

			expect(
				objectMatchesQuery(
					// @ts-expect-error - query is not a valid query expression for books
					query,
					book
				)
			).toBe(false)
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

	describe('nested object queries', () => {
		it('should filter records using nested properties', () => {
			const query = { metadata: { sessionId: { eq: 'session:alpha' } } }
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.foundation.id, books.hitchhiker.id, books.robots.id])

			expect(result).toEqual(expectedIds)
		})

		it('should combine nested and top-level criteria', () => {
			const query = {
				authorId: { eq: authors.asimov.id },
				metadata: { sessionId: { eq: 'session:alpha' } },
			}
			const result = executeQuery(store.query, 'book', query)

			const expectedIds = new Set([books.foundation.id, books.robots.id])

			expect(result).toEqual(expectedIds)
		})

		it('should support deeper nested criteria', () => {
			const query = { metadata: { extras: { region: { eq: 'eu' } } } }
			const result = executeQuery(store.query, 'book', query)

			expect(result).toEqual(new Set([books.dune.id]))
		})

		it('should work with reactive ids queries', () => {
			const query = { metadata: { sessionId: { eq: 'session:beta' } } }
			const idsQuery = store.query.ids('book', () => query)

			expect(idsQuery.get()).toEqual(
				new Set([books.neuromancer.id, books.dune.id, books.fahrenheit451.id])
			)
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
			const bookResult = executeQuery(
				store.query,
				'book',
				// @ts-expect-error - query is not a valid query expression for books
				query
			)
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

describe('reactive nested queries', () => {
	describe('adding records', () => {
		it('should include newly added record that matches nested query', () => {
			const query = { metadata: { sessionId: { eq: 'session:delta' } } }
			const idsQuery = store.query.ids('book', () => query)

			// Initially empty
			expect(idsQuery.get()).toEqual(new Set())

			// Add a book with matching nested property
			const newBook = Book.create({
				title: 'New Book',
				authorId: authors.asimov.id,
				publishedYear: 2023,
				inStock: true,
				metadata: {
					sessionId: 'session:delta',
					extras: { region: 'us' },
				},
			})

			store.put([newBook])

			// Should now include the new book
			expect(idsQuery.get()).toEqual(new Set([newBook.id]))
		})

		it('should not include newly added record that does not match nested query', () => {
			const query = { metadata: { sessionId: { eq: 'session:delta' } } }
			const idsQuery = store.query.ids('book', () => query)

			expect(idsQuery.get()).toEqual(new Set())

			// Add a book with non-matching nested property
			const newBook = Book.create({
				title: 'Another Book',
				authorId: authors.asimov.id,
				publishedYear: 2023,
				inStock: true,
				metadata: {
					sessionId: 'session:epsilon',
					extras: { region: 'us' },
				},
			})

			store.put([newBook])

			// Should still be empty
			expect(idsQuery.get()).toEqual(new Set())
		})

		it('should handle adding multiple records with mixed nested matches', () => {
			const query = { metadata: { extras: { region: { eq: 'asia' } } } }
			const idsQuery = store.query.ids('book', () => query)

			expect(idsQuery.get()).toEqual(new Set())

			const book1 = Book.create({
				title: 'Book 1',
				authorId: authors.asimov.id,
				publishedYear: 2023,
				inStock: true,
				metadata: {
					sessionId: 'session:alpha',
					extras: { region: 'asia' },
				},
			})

			const book2 = Book.create({
				title: 'Book 2',
				authorId: authors.gibson.id,
				publishedYear: 2023,
				inStock: true,
				metadata: {
					sessionId: 'session:beta',
					extras: { region: 'us' },
				},
			})

			const book3 = Book.create({
				title: 'Book 3',
				authorId: authors.herbert.id,
				publishedYear: 2023,
				inStock: true,
				metadata: {
					sessionId: 'session:gamma',
					extras: { region: 'asia' },
				},
			})

			store.put([book1, book2, book3])

			// Only books 1 and 3 should match
			expect(idsQuery.get()).toEqual(new Set([book1.id, book3.id]))
		})
	})

	describe('removing records', () => {
		it('should remove record from results when it is deleted', () => {
			const query = { metadata: { sessionId: { eq: 'session:alpha' } } }
			const idsQuery = store.query.ids('book', () => query)

			// Initially should have foundation, hitchhiker, and robots
			const initialIds = new Set([books.foundation.id, books.hitchhiker.id, books.robots.id])
			expect(idsQuery.get()).toEqual(initialIds)

			// Remove one of the matching books
			store.remove([books.foundation.id])

			// Should no longer include foundation
			expect(idsQuery.get()).toEqual(new Set([books.hitchhiker.id, books.robots.id]))
		})

		it('should not affect results when removing non-matching record', () => {
			const query = { metadata: { sessionId: { eq: 'session:alpha' } } }
			const idsQuery = store.query.ids('book', () => query)

			const initialIds = new Set([books.foundation.id, books.hitchhiker.id, books.robots.id])
			expect(idsQuery.get()).toEqual(initialIds)

			// Remove a non-matching book
			store.remove([books.neuromancer.id])

			// Results should be unchanged
			expect(idsQuery.get()).toEqual(initialIds)
		})

		it('should handle removing all matching records', () => {
			const query = { metadata: { sessionId: { eq: 'session:alpha' } } }
			const idsQuery = store.query.ids('book', () => query)

			expect(idsQuery.get()).toEqual(
				new Set([books.foundation.id, books.hitchhiker.id, books.robots.id])
			)

			// Remove all matching books
			store.remove([books.foundation.id, books.hitchhiker.id, books.robots.id])

			// Should now be empty
			expect(idsQuery.get()).toEqual(new Set())
		})
	})

	describe('updating records', () => {
		it('should add record to results when nested property is updated to match', () => {
			const query = { metadata: { sessionId: { eq: 'session:omega' } } }
			const idsQuery = store.query.ids('book', () => query)

			// Initially empty (no books with session:omega)
			expect(idsQuery.get()).toEqual(new Set())

			// Update neuromancer to have session:omega
			store.put([
				{
					...books.neuromancer,
					metadata: {
						sessionId: 'session:omega',
						extras: { region: 'us' },
					},
				},
			])

			// Should now include neuromancer
			expect(idsQuery.get()).toEqual(new Set([books.neuromancer.id]))
		})

		it('should remove record from results when nested property is updated to not match', () => {
			const query = { metadata: { sessionId: { eq: 'session:alpha' } } }
			const idsQuery = store.query.ids('book', () => query)

			// Initially should have foundation, hitchhiker, and robots
			expect(idsQuery.get()).toEqual(
				new Set([books.foundation.id, books.hitchhiker.id, books.robots.id])
			)

			// Update foundation to have a different session
			store.put([
				{
					...books.foundation,
					metadata: {
						sessionId: 'session:changed',
						extras: { region: 'us' },
					},
				},
			])

			// Should no longer include foundation
			expect(idsQuery.get()).toEqual(new Set([books.hitchhiker.id, books.robots.id]))
		})

		it('should handle deeply nested property updates', () => {
			const query = { metadata: { extras: { region: { eq: 'antarctica' } } } }
			const idsQuery = store.query.ids('book', () => query)

			// Initially empty
			expect(idsQuery.get()).toEqual(new Set())

			// Update dune to have antarctica region
			store.put([
				{
					...books.dune,
					metadata: {
						sessionId: 'session:beta',
						extras: { region: 'antarctica' },
					},
				},
			])

			// Should now include dune
			expect(idsQuery.get()).toEqual(new Set([books.dune.id]))

			// Update dune back to eu
			store.put([
				{
					...books.dune,
					metadata: {
						sessionId: 'session:beta',
						extras: { region: 'eu' },
					},
				},
			])

			// Should no longer include dune
			expect(idsQuery.get()).toEqual(new Set())
		})

		it('should maintain correct results when updating non-nested properties', () => {
			const query = { metadata: { sessionId: { eq: 'session:alpha' } } }
			const idsQuery = store.query.ids('book', () => query)

			const initialIds = new Set([books.foundation.id, books.hitchhiker.id, books.robots.id])
			expect(idsQuery.get()).toEqual(initialIds)

			// Update a non-nested property (title) but keep nested property the same
			store.put([
				{
					...books.foundation,
					title: 'Foundation - Updated Edition',
				},
			])

			// Results should be unchanged
			expect(idsQuery.get()).toEqual(initialIds)
		})
	})

	describe('combined nested and top-level queries', () => {
		it('should correctly update when top-level property changes', () => {
			const query = {
				inStock: { eq: true },
				metadata: { sessionId: { eq: 'session:alpha' } },
			}
			const idsQuery = store.query.ids('book', () => query)

			// Initially foundation and robots are in stock with session:alpha
			// hitchhiker is NOT in stock
			expect(idsQuery.get()).toEqual(new Set([books.foundation.id, books.robots.id]))

			// Update hitchhiker to be in stock
			store.put([
				{
					...books.hitchhiker,
					inStock: true,
				},
			])

			// Should now include hitchhiker
			expect(idsQuery.get()).toEqual(
				new Set([books.foundation.id, books.hitchhiker.id, books.robots.id])
			)
		})

		it('should correctly update when nested property changes in combined query', () => {
			const query = {
				inStock: { eq: true },
				metadata: { sessionId: { eq: 'session:zeta' } },
			}
			const idsQuery = store.query.ids('book', () => query)

			// Initially empty (no books with session:zeta)
			expect(idsQuery.get()).toEqual(new Set())

			// Update foundation to have session:zeta (it's already in stock)
			store.put([
				{
					...books.foundation,
					metadata: {
						sessionId: 'session:zeta',
						extras: { region: 'us' },
					},
				},
			])

			// Should now include foundation
			expect(idsQuery.get()).toEqual(new Set([books.foundation.id]))

			// Update foundation to be out of stock (but keep session:zeta)
			store.put([
				{
					...books.foundation,
					inStock: false,
					metadata: {
						sessionId: 'session:zeta',
						extras: { region: 'us' },
					},
				},
			])

			// Should no longer include foundation
			expect(idsQuery.get()).toEqual(new Set())
		})

		it('should handle complex updates with multiple nested levels', () => {
			const query = {
				category: { eq: 'sci-fi' },
				metadata: { extras: { region: { eq: 'us' } } },
			}
			const idsQuery = store.query.ids('book', () => query)

			// Initially foundation and robots are sci-fi with us region
			expect(idsQuery.get()).toEqual(new Set([books.foundation.id, books.robots.id]))

			// Add a new sci-fi book with us region
			const newBook = Book.create({
				title: 'New Sci-Fi',
				authorId: authors.asimov.id,
				publishedYear: 2023,
				inStock: true,
				category: 'sci-fi',
				metadata: {
					sessionId: 'session:new',
					extras: { region: 'us' },
				},
			})

			store.put([newBook])

			expect(idsQuery.get()).toEqual(new Set([books.foundation.id, books.robots.id, newBook.id]))

			// Change newBook's region
			store.put([
				{
					...newBook,
					metadata: {
						sessionId: 'session:new',
						extras: { region: 'eu' },
					},
				},
			])

			// Should no longer include newBook
			expect(idsQuery.get()).toEqual(new Set([books.foundation.id, books.robots.id]))

			// Change newBook's category but keep region as eu
			store.put([
				{
					...newBook,
					category: 'fantasy',
					metadata: {
						sessionId: 'session:new',
						extras: { region: 'us' },
					},
				},
			])

			// Should still not include newBook (category doesn't match)
			expect(idsQuery.get()).toEqual(new Set([books.foundation.id, books.robots.id]))
		})
	})

	describe('query operators with nested properties', () => {
		it('should handle gt operator on nested properties', () => {
			// Add some books with different copy counts
			const bookLowCopies = Book.create({
				title: 'Low Copies Book',
				authorId: authors.asimov.id,
				publishedYear: 2020,
				inStock: true,
				metadata: {
					sessionId: 'session:test',
					copies: 5,
					extras: { region: 'us' },
				},
			})

			const bookHighCopies = Book.create({
				title: 'High Copies Book',
				authorId: authors.gibson.id,
				publishedYear: 2021,
				inStock: true,
				metadata: {
					sessionId: 'session:test',
					copies: 100,
					extras: { region: 'us' },
				},
			})

			const bookMidCopies = Book.create({
				title: 'Mid Copies Book',
				authorId: authors.herbert.id,
				publishedYear: 2022,
				inStock: true,
				metadata: {
					sessionId: 'session:test',
					copies: 50,
					extras: { region: 'us' },
				},
			})

			store.put([bookLowCopies, bookHighCopies, bookMidCopies])

			// Query for books with more than 25 copies
			const query = { metadata: { copies: { gt: 25 } } }
			const idsQuery = store.query.ids('book', () => query)

			// Should include only books with > 25 copies
			const expectedIds = new Set([bookHighCopies.id, bookMidCopies.id])
			expect(idsQuery.get()).toEqual(expectedIds)

			// Update one book to have fewer copies
			store.put([
				{
					...bookMidCopies,
					metadata: {
						...bookMidCopies.metadata,
						copies: 10,
					},
				},
			])

			// Should no longer include bookMidCopies
			expect(idsQuery.get()).toEqual(new Set([bookHighCopies.id]))
		})

		it('should handle neq operator on nested properties with updates', () => {
			const query = { metadata: { sessionId: { neq: 'session:alpha' } } }
			const idsQuery = store.query.ids('book', () => query)

			// Should include all books except those with session:alpha
			const expectedIds = new Set([
				books.neuromancer.id,
				books.dune.id,
				books.fahrenheit451.id,
				books.childhood.id,
			])
			expect(idsQuery.get()).toEqual(expectedIds)

			// Update one of the matching books to have session:alpha
			store.put([
				{
					...books.neuromancer,
					metadata: {
						sessionId: 'session:alpha',
						extras: { region: 'us' },
					},
				},
			])

			// Should no longer include neuromancer
			expect(idsQuery.get()).toEqual(
				new Set([books.dune.id, books.fahrenheit451.id, books.childhood.id])
			)
		})

		it('should handle neq with undefined nested values', () => {
			// Create books where some have a nested optional property and others don't
			const bookWithStatus = Book.create({
				title: 'Book With Status',
				authorId: authors.asimov.id,
				publishedYear: 2020,
				inStock: true,
				metadata: {
					sessionId: 'session:test',
					status: 'published',
					extras: { region: 'us' },
				},
			})

			const bookWithDifferentStatus = Book.create({
				title: 'Book With Different Status',
				authorId: authors.gibson.id,
				publishedYear: 2021,
				inStock: true,
				metadata: {
					sessionId: 'session:test',
					status: 'draft',
					extras: { region: 'us' },
				},
			})

			const bookWithoutStatus = Book.create({
				title: 'Book Without Status',
				authorId: authors.herbert.id,
				publishedYear: 2022,
				inStock: true,
				metadata: {
					sessionId: 'session:test',
					extras: { region: 'us' },
				},
			})

			store.put([bookWithStatus, bookWithDifferentStatus, bookWithoutStatus])

			// Query for books where status is not 'published'
			// Note: Records with undefined nested values are not indexed, so they won't appear in neq results
			// This is because the index only tracks records with defined values
			const query = { metadata: { status: { neq: 'published' } } }
			const idsQuery = store.query.ids(
				'book',
				// @ts-expect-error - query is not a valid query expression for books
				() => query
			)

			// Should include only books with a defined status that is not 'published'
			// bookWithoutStatus is not in the index since its status is undefined
			expect(idsQuery.get()).toEqual(new Set([bookWithDifferentStatus.id]))

			// Update bookWithDifferentStatus to be 'published'
			store.put([
				{
					...bookWithDifferentStatus,
					metadata: {
						...bookWithDifferentStatus.metadata,
						status: 'published',
					},
				} as any,
			])

			// Should now be empty (bookWithoutStatus still not in index)
			expect(idsQuery.get()).toEqual(new Set())

			// Add a third status to verify the index still works
			const bookWithArchivedStatus = Book.create({
				title: 'Book With Archived Status',
				authorId: authors.bradbury.id,
				publishedYear: 2023,
				inStock: true,
				metadata: {
					sessionId: 'session:test',
					status: 'archived',
					extras: { region: 'us' },
				},
			} as any)

			store.put([bookWithArchivedStatus])

			// Should now include only the archived book
			expect(idsQuery.get()).toEqual(new Set([bookWithArchivedStatus.id]))
		})

		it('should handle multiple nested criteria with updates', () => {
			const query = {
				metadata: {
					sessionId: { neq: 'session:gamma' },
					extras: { region: { eq: 'us' } },
				},
			}
			const idsQuery = store.query.ids('book', () => query)

			// Should include books with us region but not session:gamma
			expect(idsQuery.get()).toEqual(
				new Set([
					books.foundation.id,
					books.neuromancer.id,
					books.fahrenheit451.id,
					books.robots.id,
				])
			)

			// Change foundation's region to uk
			store.put([
				{
					...books.foundation,
					metadata: {
						...books.foundation.metadata,
						extras: { region: 'uk' },
					},
				},
			])

			// Should no longer include foundation
			expect(idsQuery.get()).toEqual(
				new Set([books.neuromancer.id, books.fahrenheit451.id, books.robots.id])
			)
		})
	})

	describe('multiple subscribers', () => {
		it('should update all subscribers when records change', () => {
			const query = { metadata: { sessionId: { eq: 'session:theta' } } }
			const idsQuery1 = store.query.ids('book', () => query)
			const idsQuery2 = store.query.ids('book', () => query)

			// Both should be empty initially
			expect(idsQuery1.get()).toEqual(new Set())
			expect(idsQuery2.get()).toEqual(new Set())

			// Add a matching book
			const newBook = Book.create({
				title: 'Test Book',
				authorId: authors.asimov.id,
				publishedYear: 2023,
				inStock: true,
				metadata: {
					sessionId: 'session:theta',
					extras: { region: 'us' },
				},
			})

			store.put([newBook])

			// Both should now include the new book
			expect(idsQuery1.get()).toEqual(new Set([newBook.id]))
			expect(idsQuery2.get()).toEqual(new Set([newBook.id]))

			// Remove the book
			store.remove([newBook.id])

			// Both should be empty again
			expect(idsQuery1.get()).toEqual(new Set())
			expect(idsQuery2.get()).toEqual(new Set())
		})

		it('should handle different queries on same nested properties', () => {
			const queryAlpha = { metadata: { sessionId: { eq: 'session:alpha' } } }
			const queryBeta = { metadata: { sessionId: { eq: 'session:beta' } } }

			const idsQueryAlpha = store.query.ids('book', () => queryAlpha)
			const idsQueryBeta = store.query.ids('book', () => queryBeta)

			expect(idsQueryAlpha.get()).toEqual(
				new Set([books.foundation.id, books.hitchhiker.id, books.robots.id])
			)
			expect(idsQueryBeta.get()).toEqual(
				new Set([books.neuromancer.id, books.dune.id, books.fahrenheit451.id])
			)

			// Update foundation from alpha to beta
			store.put([
				{
					...books.foundation,
					metadata: {
						sessionId: 'session:beta',
						extras: { region: 'us' },
					},
				},
			])

			// Alpha query should no longer include foundation
			expect(idsQueryAlpha.get()).toEqual(new Set([books.hitchhiker.id, books.robots.id]))

			// Beta query should now include foundation
			expect(idsQueryBeta.get()).toEqual(
				new Set([books.foundation.id, books.neuromancer.id, books.dune.id, books.fahrenheit451.id])
			)
		})
	})

	describe('batch operations', () => {
		it('should handle batch updates affecting nested queries', () => {
			const query = { metadata: { extras: { region: { eq: 'canada' } } } }
			const idsQuery = store.query.ids('book', () => query)

			expect(idsQuery.get()).toEqual(new Set())

			// Batch update multiple books to have canada region
			store.put([
				{
					...books.foundation,
					metadata: {
						sessionId: 'session:alpha',
						extras: { region: 'canada' },
					},
				},
				{
					...books.neuromancer,
					metadata: {
						sessionId: 'session:beta',
						extras: { region: 'canada' },
					},
				},
				{
					...books.dune,
					metadata: {
						sessionId: 'session:beta',
						extras: { region: 'canada' },
					},
				},
			])

			// Should include all three books
			expect(idsQuery.get()).toEqual(
				new Set([books.foundation.id, books.neuromancer.id, books.dune.id])
			)

			// Batch update to remove them all
			store.put([
				{
					...books.foundation,
					metadata: {
						sessionId: 'session:alpha',
						extras: { region: 'us' },
					},
				},
				{
					...books.neuromancer,
					metadata: {
						sessionId: 'session:beta',
						extras: { region: 'us' },
					},
				},
				{
					...books.dune,
					metadata: {
						sessionId: 'session:beta',
						extras: { region: 'eu' },
					},
				},
			])

			// Should be empty again
			expect(idsQuery.get()).toEqual(new Set())
		})

		it('should handle mixed batch operations (add, update, remove)', () => {
			const query = { metadata: { sessionId: { eq: 'session:mixed' } } }
			const idsQuery = store.query.ids('book', () => query)

			expect(idsQuery.get()).toEqual(new Set())

			const newBook1 = Book.create({
				title: 'New Book 1',
				authorId: authors.asimov.id,
				publishedYear: 2023,
				inStock: true,
				metadata: {
					sessionId: 'session:mixed',
					extras: { region: 'us' },
				},
			})

			const newBook2 = Book.create({
				title: 'New Book 2',
				authorId: authors.gibson.id,
				publishedYear: 2023,
				inStock: true,
				metadata: {
					sessionId: 'session:mixed',
					extras: { region: 'us' },
				},
			})

			// Add new books and update existing one in a single batch
			store.put([
				newBook1,
				newBook2,
				{
					...books.foundation,
					metadata: {
						sessionId: 'session:mixed',
						extras: { region: 'us' },
					},
				},
			])

			expect(idsQuery.get()).toEqual(new Set([newBook1.id, newBook2.id, books.foundation.id]))

			// Remove one new book, update another, and revert foundation
			store.remove([newBook1.id])
			store.put([
				{
					...newBook2,
					metadata: {
						sessionId: 'session:different',
						extras: { region: 'us' },
					},
				},
				{
					...books.foundation,
					metadata: {
						sessionId: 'session:alpha',
						extras: { region: 'us' },
					},
				},
			])

			// Should now be empty
			expect(idsQuery.get()).toEqual(new Set())
		})
	})
})
