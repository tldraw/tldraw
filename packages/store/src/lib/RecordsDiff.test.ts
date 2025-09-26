import { describe, expect, it } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import {
	RecordsDiff,
	createEmptyRecordsDiff,
	isRecordsDiffEmpty,
	reverseRecordsDiff,
	squashRecordDiffs,
	squashRecordDiffsMutable,
} from './RecordsDiff'

// Test interfaces for comprehensive testing
interface TestBook extends BaseRecord<'book', RecordId<TestBook>> {
	title: string
	author: string
	pages: number
	isPublished: boolean
}

interface TestAuthor extends BaseRecord<'author', RecordId<TestAuthor>> {
	name: string
	birthYear: number
}

interface TestUser extends BaseRecord<'user', RecordId<TestUser>> {
	email: string
	preferences: {
		theme: 'light' | 'dark'
		notifications: boolean
	}
}

// Helper functions to create test records
function createBook(
	id: string,
	title: string,
	author: string,
	pages: number = 100,
	isPublished: boolean = true
): TestBook {
	return {
		id: id as RecordId<TestBook>,
		typeName: 'book',
		title,
		author,
		pages,
		isPublished,
	}
}

function createAuthor(id: string, name: string, birthYear: number): TestAuthor {
	return {
		id: id as RecordId<TestAuthor>,
		typeName: 'author',
		name,
		birthYear,
	}
}

function createUser(id: string, email: string, theme: 'light' | 'dark' = 'light'): TestUser {
	return {
		id: id as RecordId<TestUser>,
		typeName: 'user',
		email,
		preferences: {
			theme,
			notifications: true,
		},
	}
}

// Helper to create a diff with proper typing
function createDiff<R extends TestBook | TestAuthor | TestUser>(
	added: Record<string, R> = {},
	updated: Record<string, [R, R]> = {},
	removed: Record<string, R> = {}
): RecordsDiff<R> {
	return {
		added: added as any,
		updated: updated as any,
		removed: removed as any,
	}
}

describe('RecordsDiff interface', () => {
	it('should have correct structure with added, updated, and removed collections', () => {
		const book1 = createBook('book:1', '1984', 'George Orwell')
		const book2Old = createBook('book:2', 'Old Title', 'Author')
		const book2New = createBook('book:2', 'New Title', 'Author')
		const book3 = createBook('book:3', 'Deleted Book', 'Author')

		const diff = createDiff<TestBook>(
			{ 'book:1': book1 },
			{ 'book:2': [book2Old, book2New] },
			{ 'book:3': book3 }
		)

		expect(diff.added['book:1' as RecordId<TestBook>]).toEqual(book1)
		expect(diff.updated['book:2' as RecordId<TestBook>]).toEqual([book2Old, book2New])
		expect(diff.removed['book:3' as RecordId<TestBook>]).toEqual(book3)
	})

	it('should support empty collections', () => {
		const diff = createDiff<TestBook>()

		expect(Object.keys(diff.added)).toHaveLength(0)
		expect(Object.keys(diff.updated)).toHaveLength(0)
		expect(Object.keys(diff.removed)).toHaveLength(0)
	})

	it('should work with different record types', () => {
		const author = createAuthor('author:1', 'Jane Doe', 1980)
		const user = createUser('user:1', 'jane@example.com', 'dark')

		const authorDiff = createDiff<TestAuthor>({ 'author:1': author })
		const userDiff = createDiff<TestUser>({ 'user:1': user })

		expect(authorDiff.added['author:1' as RecordId<TestAuthor>]).toEqual(author)
		expect(userDiff.added['user:1' as RecordId<TestUser>]).toEqual(user)
	})
})

describe('createEmptyRecordsDiff', () => {
	it('should create an empty diff with all collections initialized to empty objects', () => {
		const emptyDiff = createEmptyRecordsDiff<TestBook>()

		expect(emptyDiff).toEqual({
			added: {},
			updated: {},
			removed: {},
		})
	})

	it('should create separate instances for each call', () => {
		const diff1 = createEmptyRecordsDiff<TestBook>()
		const diff2 = createEmptyRecordsDiff<TestBook>()

		expect(diff1).not.toBe(diff2)
		expect(diff1.added).not.toBe(diff2.added)
		expect(diff1.updated).not.toBe(diff2.updated)
		expect(diff1.removed).not.toBe(diff2.removed)
	})

	it('should work with different record types', () => {
		const bookDiff = createEmptyRecordsDiff<TestBook>()
		const authorDiff = createEmptyRecordsDiff<TestAuthor>()

		expect(bookDiff).toEqual({ added: {}, updated: {}, removed: {} })
		expect(authorDiff).toEqual({ added: {}, updated: {}, removed: {} })

		// Type checking - these should compile without issues
		;(bookDiff.added as any)['book:1'] = createBook('book:1', 'Test', 'Author')
		;(authorDiff.added as any)['author:1'] = createAuthor('author:1', 'Test Author', 1980)
	})

	it('should allow modification of the returned diff', () => {
		const diff = createEmptyRecordsDiff<TestBook>()
		const book = createBook('book:1', 'Test Book', 'Test Author')

		;(diff.added as any)['book:1'] = book

		expect((diff.added as any)['book:1']).toEqual(book)
		expect(Object.keys(diff.added)).toHaveLength(1)
	})
})

describe('isRecordsDiffEmpty', () => {
	describe('empty diffs', () => {
		it('should return true for empty diff created with createEmptyRecordsDiff', () => {
			const emptyDiff = createEmptyRecordsDiff<TestBook>()
			expect(isRecordsDiffEmpty(emptyDiff)).toBe(true)
		})

		it('should return true for manually created empty diff', () => {
			const emptyDiff = createDiff<TestBook>()
			expect(isRecordsDiffEmpty(emptyDiff)).toBe(true)
		})

		it('should return true for diff with empty objects regardless of reference equality', () => {
			const diff1 = createDiff<TestBook>()
			const diff2 = createDiff<TestBook>()

			expect(isRecordsDiffEmpty(diff1)).toBe(true)
			expect(isRecordsDiffEmpty(diff2)).toBe(true)
		})
	})

	describe('non-empty diffs', () => {
		it('should return false for diff with added records', () => {
			const diff = createDiff<TestBook>({ 'book:1': createBook('book:1', 'Test', 'Author') })
			expect(isRecordsDiffEmpty(diff)).toBe(false)
		})

		it('should return false for diff with updated records', () => {
			const oldBook = createBook('book:1', 'Old Title', 'Author')
			const newBook = createBook('book:1', 'New Title', 'Author')
			const diff = createDiff<TestBook>({}, { 'book:1': [oldBook, newBook] })
			expect(isRecordsDiffEmpty(diff)).toBe(false)
		})

		it('should return false for diff with removed records', () => {
			const diff = createDiff<TestBook>(
				{},
				{},
				{ 'book:1': createBook('book:1', 'Deleted', 'Author') }
			)
			expect(isRecordsDiffEmpty(diff)).toBe(false)
		})

		it('should return false for diff with multiple types of changes', () => {
			const book1 = createBook('book:1', 'New Book', 'Author')
			const book2Old = createBook('book:2', 'Old Title', 'Author')
			const book2New = createBook('book:2', 'New Title', 'Author')
			const book3 = createBook('book:3', 'Deleted Book', 'Author')

			const diff = createDiff<TestBook>(
				{ 'book:1': book1 },
				{ 'book:2': [book2Old, book2New] },
				{ 'book:3': book3 }
			)
			expect(isRecordsDiffEmpty(diff)).toBe(false)
		})

		it('should return false for diff with multiple records in same category', () => {
			const book1 = createBook('book:1', 'Book 1', 'Author')
			const book2 = createBook('book:2', 'Book 2', 'Author')

			const diff = createDiff<TestBook>({
				'book:1': book1,
				'book:2': book2,
			})
			expect(isRecordsDiffEmpty(diff)).toBe(false)
		})
	})

	describe('edge cases', () => {
		it('should work with different record types', () => {
			const bookDiff = createEmptyRecordsDiff<TestBook>()
			const authorDiff = createEmptyRecordsDiff<TestAuthor>()

			expect(isRecordsDiffEmpty(bookDiff)).toBe(true)
			expect(isRecordsDiffEmpty(authorDiff)).toBe(true)
			;(bookDiff.added as any)['book:1'] = createBook('book:1', 'Test', 'Author')
			expect(isRecordsDiffEmpty(bookDiff)).toBe(false)
			expect(isRecordsDiffEmpty(authorDiff)).toBe(true)
		})
	})
})

describe('reverseRecordsDiff', () => {
	describe('basic operations', () => {
		it('should reverse added records to removed records', () => {
			const book = createBook('book:1', 'New Book', 'Author')
			const originalDiff = createDiff<TestBook>({ 'book:1': book })

			const reversedDiff = reverseRecordsDiff(originalDiff)

			expect(reversedDiff).toEqual(createDiff<TestBook>({}, {}, { 'book:1': book }))
		})

		it('should reverse removed records to added records', () => {
			const book = createBook('book:1', 'Deleted Book', 'Author')
			const originalDiff = createDiff<TestBook>({}, {}, { 'book:1': book })

			const reversedDiff = reverseRecordsDiff(originalDiff)

			expect(reversedDiff).toEqual(createDiff<TestBook>({ 'book:1': book }))
		})

		it('should reverse updated records by swapping from/to', () => {
			const oldBook = createBook('book:1', 'Old Title', 'Author')
			const newBook = createBook('book:1', 'New Title', 'Author')
			const originalDiff = createDiff<TestBook>({}, { 'book:1': [oldBook, newBook] })

			const reversedDiff = reverseRecordsDiff(originalDiff)

			expect(reversedDiff).toEqual(createDiff<TestBook>({}, { 'book:1': [newBook, oldBook] }))
		})
	})

	describe('complex scenarios', () => {
		it('should reverse all types of changes simultaneously', () => {
			const addedBook = createBook('book:1', 'Added Book', 'Author')
			const oldUpdatedBook = createBook('book:2', 'Old Title', 'Author')
			const newUpdatedBook = createBook('book:2', 'New Title', 'Author')
			const removedBook = createBook('book:3', 'Removed Book', 'Author')

			const originalDiff = createDiff<TestBook>(
				{ 'book:1': addedBook },
				{ 'book:2': [oldUpdatedBook, newUpdatedBook] },
				{ 'book:3': removedBook }
			)

			const reversedDiff = reverseRecordsDiff(originalDiff)

			expect(reversedDiff).toEqual(
				createDiff<TestBook>(
					{ 'book:3': removedBook },
					{ 'book:2': [newUpdatedBook, oldUpdatedBook] },
					{ 'book:1': addedBook }
				)
			)
		})

		it('should handle multiple records in each category', () => {
			const addedBook1 = createBook('book:1', 'Added Book 1', 'Author')
			const addedBook2 = createBook('book:2', 'Added Book 2', 'Author')

			const oldBook3 = createBook('book:3', 'Old Title 3', 'Author')
			const newBook3 = createBook('book:3', 'New Title 3', 'Author')
			const oldBook4 = createBook('book:4', 'Old Title 4', 'Author')
			const newBook4 = createBook('book:4', 'New Title 4', 'Author')

			const removedBook5 = createBook('book:5', 'Removed Book 5', 'Author')
			const removedBook6 = createBook('book:6', 'Removed Book 6', 'Author')

			const originalDiff = createDiff<TestBook>(
				{
					'book:1': addedBook1,
					'book:2': addedBook2,
				},
				{
					'book:3': [oldBook3, newBook3],
					'book:4': [oldBook4, newBook4],
				},
				{
					'book:5': removedBook5,
					'book:6': removedBook6,
				}
			)

			const reversedDiff = reverseRecordsDiff(originalDiff)

			expect(reversedDiff).toEqual(
				createDiff<TestBook>(
					{
						'book:5': removedBook5,
						'book:6': removedBook6,
					},
					{
						'book:3': [newBook3, oldBook3],
						'book:4': [newBook4, oldBook4],
					},
					{
						'book:1': addedBook1,
						'book:2': addedBook2,
					}
				)
			)
		})
	})

	describe('edge cases', () => {
		it('should handle empty diff', () => {
			const emptyDiff = createEmptyRecordsDiff<TestBook>()
			const reversedDiff = reverseRecordsDiff(emptyDiff)

			expect(reversedDiff).toEqual(createEmptyRecordsDiff<TestBook>())
		})

		it('should work with different record types', () => {
			const author = createAuthor('author:1', 'Test Author', 1980)
			const originalDiff = createDiff<TestAuthor>({ 'author:1': author })

			const reversedDiff = reverseRecordsDiff(originalDiff)

			expect(reversedDiff).toEqual(createDiff<TestAuthor>({}, {}, { 'author:1': author }))
		})

		it('should not mutate the original diff', () => {
			const book = createBook('book:1', 'Test Book', 'Author')
			const originalDiff = createDiff<TestBook>({ 'book:1': book })

			const originalCopy = JSON.parse(JSON.stringify(originalDiff))
			reverseRecordsDiff(originalDiff)

			expect(originalDiff).toEqual(originalCopy)
		})

		it('should create a new diff object', () => {
			const originalDiff = createEmptyRecordsDiff<TestBook>()
			const reversedDiff = reverseRecordsDiff(originalDiff)

			expect(reversedDiff).not.toBe(originalDiff)
		})
	})

	describe('reversibility', () => {
		it('should be reversible - reverse of reverse should equal original', () => {
			const book1 = createBook('book:1', 'Added Book', 'Author')
			const oldBook2 = createBook('book:2', 'Old Title', 'Author')
			const newBook2 = createBook('book:2', 'New Title', 'Author')
			const book3 = createBook('book:3', 'Removed Book', 'Author')

			const originalDiff = createDiff<TestBook>(
				{ 'book:1': book1 },
				{ 'book:2': [oldBook2, newBook2] },
				{ 'book:3': book3 }
			)

			const doubleReversed = reverseRecordsDiff(reverseRecordsDiff(originalDiff))

			expect(doubleReversed).toEqual(originalDiff)
		})
	})
})

describe('squashRecordDiffs', () => {
	describe('basic functionality', () => {
		it('should combine empty diffs into empty diff', () => {
			const diff1 = createEmptyRecordsDiff<TestBook>()
			const diff2 = createEmptyRecordsDiff<TestBook>()

			const result = squashRecordDiffs([diff1, diff2])

			expect(result).toEqual(createEmptyRecordsDiff<TestBook>())
		})

		it('should handle single diff', () => {
			const book = createBook('book:1', 'Test Book', 'Author')
			const diff = createDiff<TestBook>({ 'book:1': book })

			const result = squashRecordDiffs([diff])

			expect(result).toEqual(diff)
		})

		it('should combine non-overlapping diffs', () => {
			const book1 = createBook('book:1', 'Book 1', 'Author')
			const book2 = createBook('book:2', 'Book 2', 'Author')

			const diff1 = createDiff<TestBook>({ 'book:1': book1 })
			const diff2 = createDiff<TestBook>({ 'book:2': book2 })

			const result = squashRecordDiffs([diff1, diff2])

			expect(result).toEqual(
				createDiff<TestBook>({
					'book:1': book1,
					'book:2': book2,
				})
			)
		})
	})

	describe('add -> update sequences', () => {
		it('should combine add then update into single add with final state', () => {
			const initialBook = createBook('book:1', 'Initial Title', 'Author')
			const updatedBook = createBook('book:1', 'Updated Title', 'Author')

			const diff1 = createDiff<TestBook>({ 'book:1': initialBook })
			const diff2 = createDiff<TestBook>({}, { 'book:1': [initialBook, updatedBook] })

			const result = squashRecordDiffs([diff1, diff2])

			expect(result).toEqual(createDiff<TestBook>({ 'book:1': updatedBook }))
		})

		it('should handle multiple updates after add', () => {
			const v1 = createBook('book:1', 'Version 1', 'Author')
			const v2 = createBook('book:1', 'Version 2', 'Author')
			const v3 = createBook('book:1', 'Version 3', 'Author')

			const diff1 = createDiff<TestBook>({ 'book:1': v1 })
			const diff2 = createDiff<TestBook>({}, { 'book:1': [v1, v2] })
			const diff3 = createDiff<TestBook>({}, { 'book:1': [v2, v3] })

			const result = squashRecordDiffs([diff1, diff2, diff3])

			expect(result).toEqual(createDiff<TestBook>({ 'book:1': v3 }))
		})
	})

	describe('add -> remove sequences', () => {
		it('should cancel out add then remove operations', () => {
			const book = createBook('book:1', 'Test Book', 'Author')

			const diff1 = createDiff<TestBook>({ 'book:1': book })
			const diff2 = createDiff<TestBook>({}, {}, { 'book:1': book })

			const result = squashRecordDiffs([diff1, diff2])

			expect(result).toEqual(createEmptyRecordsDiff<TestBook>())
		})
	})

	describe('remove -> add sequences', () => {
		it('should combine remove then add into update', () => {
			const originalBook = createBook('book:1', 'Original', 'Author')
			const newBook = createBook('book:1', 'New', 'Author')

			const diff1 = createDiff<TestBook>({}, {}, { 'book:1': originalBook })
			const diff2 = createDiff<TestBook>({ 'book:1': newBook })

			const result = squashRecordDiffs([diff1, diff2])

			expect(result).toEqual(createDiff<TestBook>({}, { 'book:1': [originalBook, newBook] }))
		})

		it('should handle remove -> add -> update sequence', () => {
			const original = createBook('book:1', 'Original', 'Author')
			const intermediate = createBook('book:1', 'Intermediate', 'Author')
			const final = createBook('book:1', 'Final', 'Author')

			const diff1 = createDiff<TestBook>({}, {}, { 'book:1': original })
			const diff2 = createDiff<TestBook>({ 'book:1': intermediate })
			const diff3 = createDiff<TestBook>({}, { 'book:1': [intermediate, final] })

			const result = squashRecordDiffs([diff1, diff2, diff3])

			expect(result).toEqual(createDiff<TestBook>({}, { 'book:1': [original, final] }))
		})
	})

	describe('update sequences', () => {
		it('should chain updates together', () => {
			const v1 = createBook('book:1', 'Version 1', 'Author')
			const v2 = createBook('book:1', 'Version 2', 'Author')
			const v3 = createBook('book:1', 'Version 3', 'Author')

			const diff1 = createDiff<TestBook>({}, { 'book:1': [v1, v2] })
			const diff2 = createDiff<TestBook>({}, { 'book:1': [v2, v3] })

			const result = squashRecordDiffs([diff1, diff2])

			expect(result).toEqual(createDiff<TestBook>({}, { 'book:1': [v1, v3] }))
		})

		it('should handle update -> remove sequence', () => {
			const original = createBook('book:1', 'Original', 'Author')
			const updated = createBook('book:1', 'Updated', 'Author')

			const diff1 = createDiff<TestBook>({}, { 'book:1': [original, updated] })
			const diff2 = createDiff<TestBook>({}, {}, { 'book:1': updated })

			const result = squashRecordDiffs([diff1, diff2])

			expect(result).toEqual(createDiff<TestBook>({}, {}, { 'book:1': original }))
		})
	})

	describe('complex scenarios', () => {
		it('should handle multiple records with different operation sequences', () => {
			// Book 1: add -> update
			const book1v1 = createBook('book:1', 'Book 1 v1', 'Author')
			const book1v2 = createBook('book:1', 'Book 1 v2', 'Author')

			// Book 2: remove -> add
			const book2old = createBook('book:2', 'Book 2 old', 'Author')
			const book2new = createBook('book:2', 'Book 2 new', 'Author')

			// Book 3: update -> update
			const book3v1 = createBook('book:3', 'Book 3 v1', 'Author')
			const book3v2 = createBook('book:3', 'Book 3 v2', 'Author')
			const book3v3 = createBook('book:3', 'Book 3 v3', 'Author')

			// Book 4: add -> remove (should cancel out)
			const book4 = createBook('book:4', 'Book 4', 'Author')

			const diff1 = createDiff<TestBook>(
				{
					'book:1': book1v1,
					'book:4': book4,
				},
				{
					'book:3': [book3v1, book3v2],
				},
				{
					'book:2': book2old,
				}
			)

			const diff2 = createDiff<TestBook>(
				{
					'book:2': book2new,
				},
				{
					'book:1': [book1v1, book1v2],
					'book:3': [book3v2, book3v3],
				},
				{
					'book:4': book4,
				}
			)

			const result = squashRecordDiffs([diff1, diff2])

			expect(result).toEqual(
				createDiff<TestBook>(
					{
						'book:1': book1v2,
					},
					{
						'book:2': [book2old, book2new],
						'book:3': [book3v1, book3v3],
					}
				)
			)
		})
	})

	describe('options.mutateFirstDiff', () => {
		it('should not mutate first diff by default', () => {
			const book = createBook('book:1', 'Test', 'Author')
			const diff1 = createDiff<TestBook>({ 'book:1': book })
			const originalDiff1 = JSON.parse(JSON.stringify(diff1))

			squashRecordDiffs([diff1])

			expect(diff1).toEqual(originalDiff1)
		})

		it('should mutate first diff when mutateFirstDiff is true', () => {
			const book1 = createBook('book:1', 'Book 1', 'Author')
			const book2 = createBook('book:2', 'Book 2', 'Author')

			const diff1 = createDiff<TestBook>({ 'book:1': book1 })
			const diff2 = createDiff<TestBook>({ 'book:2': book2 })

			const result = squashRecordDiffs([diff1, diff2], { mutateFirstDiff: true })

			expect(result).toBe(diff1)
			expect((diff1.added as any)['book:1']).toEqual(book1)
			expect((diff1.added as any)['book:2']).toEqual(book2)
		})

		it('should return first diff when only one diff provided with mutateFirstDiff', () => {
			const book = createBook('book:1', 'Test', 'Author')
			const diff = createDiff<TestBook>({ 'book:1': book })

			const result = squashRecordDiffs([diff], { mutateFirstDiff: true })

			expect(result).toBe(diff)
		})
	})

	describe('edge cases', () => {
		it('should handle empty array of diffs', () => {
			const result = squashRecordDiffs([])

			expect(result).toEqual(createEmptyRecordsDiff())
		})

		it('should work with different record types', () => {
			const author1 = createAuthor('author:1', 'Author 1', 1980)
			const author2 = createAuthor('author:2', 'Author 2', 1985)

			const diff1 = createDiff<TestAuthor>({ 'author:1': author1 })
			const diff2 = createDiff<TestAuthor>({ 'author:2': author2 })

			const result = squashRecordDiffs([diff1, diff2])

			expect((result.added as any)['author:1']).toEqual(author1)
			expect((result.added as any)['author:2']).toEqual(author2)
		})

		it('should preserve object identity when no changes needed', () => {
			const book = createBook('book:1', 'Version 1', 'Author')
			const sameBook = createBook('book:1', 'Version 1', 'Author')

			const diff1 = createDiff<TestBook>({}, {}, { 'book:1': book })
			const diff2 = createDiff<TestBook>({ 'book:1': sameBook })

			const result = squashRecordDiffs([diff1, diff2])

			// Since book and sameBook have same content but different identity,
			// this should result in an update
			expect((result.updated as any)['book:1']).toEqual([book, sameBook])
		})
	})
})

describe('squashRecordDiffsMutable', () => {
	describe('mutating behavior', () => {
		it('should mutate the target diff', () => {
			const book = createBook('book:1', 'Test', 'Author')
			const target = createEmptyRecordsDiff<TestBook>()
			const diff = createDiff<TestBook>({ 'book:1': book })

			squashRecordDiffsMutable(target, [diff])

			expect((target.added as any)['book:1']).toEqual(book)
		})

		it('should not return a value', () => {
			const target = createEmptyRecordsDiff<TestBook>()
			const diff = createEmptyRecordsDiff<TestBook>()

			const result = squashRecordDiffsMutable(target, [diff])

			expect(result).toBeUndefined()
		})
	})

	describe('complex mutation scenarios', () => {
		it('should handle add -> update in target', () => {
			const initialBook = createBook('book:1', 'Initial', 'Author')
			const updatedBook = createBook('book:1', 'Updated', 'Author')

			const target = createDiff<TestBook>({ 'book:1': initialBook })
			const diff = createDiff<TestBook>({}, { 'book:1': [initialBook, updatedBook] })

			squashRecordDiffsMutable(target, [diff])

			expect((target.added as any)['book:1']).toEqual(updatedBook)
			expect(Object.keys(target.updated)).toHaveLength(0)
		})

		it('should handle remove -> add in target', () => {
			const originalBook = createBook('book:1', 'Original', 'Author')
			const newBook = createBook('book:1', 'New', 'Author')

			const target = createDiff<TestBook>({}, {}, { 'book:1': originalBook })
			const diff = createDiff<TestBook>({ 'book:1': newBook })

			squashRecordDiffsMutable(target, [diff])

			expect((target.updated as any)['book:1']).toEqual([originalBook, newBook])
			expect(Object.keys(target.removed)).toHaveLength(0)
		})

		it('should handle update -> update chaining', () => {
			const v1 = createBook('book:1', 'Version 1', 'Author')
			const v2 = createBook('book:1', 'Version 2', 'Author')
			const v3 = createBook('book:1', 'Version 3', 'Author')

			const target = createDiff<TestBook>({}, { 'book:1': [v1, v2] })
			const diff = createDiff<TestBook>({}, { 'book:1': [v2, v3] })

			squashRecordDiffsMutable(target, [diff])

			expect((target.updated as any)['book:1']).toEqual([v1, v3])
		})

		it('should handle add -> remove cancellation', () => {
			const book = createBook('book:1', 'Test', 'Author')

			const target = createDiff<TestBook>({ 'book:1': book })
			const diff = createDiff<TestBook>({}, {}, { 'book:1': book })

			squashRecordDiffsMutable(target, [diff])

			expect(Object.keys(target.added)).toHaveLength(0)
			expect(Object.keys(target.updated)).toHaveLength(0)
			expect(Object.keys(target.removed)).toHaveLength(0)
		})

		it('should handle update -> remove', () => {
			const original = createBook('book:1', 'Original', 'Author')
			const updated = createBook('book:1', 'Updated', 'Author')

			const target = createDiff<TestBook>({}, { 'book:1': [original, updated] })
			const diff = createDiff<TestBook>({}, {}, { 'book:1': updated })

			squashRecordDiffsMutable(target, [diff])

			expect((target.removed as any)['book:1']).toEqual(original)
			expect(Object.keys(target.updated)).toHaveLength(0)
		})
	})

	describe('multiple diffs application', () => {
		it('should apply multiple diffs in sequence', () => {
			const v1 = createBook('book:1', 'Version 1', 'Author')
			const v2 = createBook('book:1', 'Version 2', 'Author')
			const v3 = createBook('book:1', 'Version 3', 'Author')

			const target = createEmptyRecordsDiff<TestBook>()

			const diff1 = createDiff<TestBook>({ 'book:1': v1 })
			const diff2 = createDiff<TestBook>({}, { 'book:1': [v1, v2] })
			const diff3 = createDiff<TestBook>({}, { 'book:1': [v2, v3] })

			squashRecordDiffsMutable(target, [diff1, diff2, diff3])

			expect((target.added as any)['book:1']).toEqual(v3)
		})
	})

	describe('edge cases', () => {
		it('should handle empty diffs array', () => {
			const book = createBook('book:1', 'Test', 'Author')
			const target = createDiff<TestBook>({ 'book:1': book })
			const originalTarget = JSON.parse(JSON.stringify(target))

			squashRecordDiffsMutable(target, [])

			expect(target).toEqual(originalTarget)
		})

		it('should handle target with pre-existing changes', () => {
			const book1 = createBook('book:1', 'Existing', 'Author')
			const book2 = createBook('book:2', 'New', 'Author')

			const target = createDiff<TestBook>({ 'book:1': book1 })
			const diff = createDiff<TestBook>({ 'book:2': book2 })

			squashRecordDiffsMutable(target, [diff])

			expect((target.added as any)['book:1']).toEqual(book1)
			expect((target.added as any)['book:2']).toEqual(book2)
		})
	})
})

describe('integration tests', () => {
	it('should work with real-world scenario: create, update, revert, update again', () => {
		const original = createBook('book:1', 'Original Title', 'Author', 100)
		const updated1 = createBook('book:1', 'Updated Title 1', 'Author', 150)
		const updated2 = createBook('book:1', 'Updated Title 2', 'Author', 200)

		// Step 1: Create book
		const createDiffStep = createDiff<TestBook>({ 'book:1': original })

		// Step 2: Update book
		const updateDiffStep = createDiff<TestBook>({}, { 'book:1': [original, updated1] })

		// Step 3: Revert to original (simulate undo)
		const revertDiffStep = reverseRecordsDiff(updateDiffStep)

		// Step 4: Apply different update
		const newUpdateDiffStep = createDiff<TestBook>({}, { 'book:1': [original, updated2] })

		// Combine all operations
		const finalDiff = squashRecordDiffs([
			createDiffStep,
			updateDiffStep,
			revertDiffStep,
			newUpdateDiffStep,
		])

		expect((finalDiff.added as any)['book:1']).toEqual(updated2)
	})

	it('should maintain consistency between squashRecordDiffs and squashRecordDiffsMutable', () => {
		const book1 = createBook('book:1', 'Book 1', 'Author')
		const book2Old = createBook('book:2', 'Book 2 Old', 'Author')
		const book2New = createBook('book:2', 'Book 2 New', 'Author')

		const diff1 = createDiff<TestBook>({ 'book:1': book1 })
		const diff2 = createDiff<TestBook>({}, { 'book:2': [book2Old, book2New] })

		// Test immutable version
		const immutableResult = squashRecordDiffs([diff1, diff2])

		// Test mutable version
		const mutableTarget = createEmptyRecordsDiff<TestBook>()
		squashRecordDiffsMutable(mutableTarget, [diff1, diff2])

		expect(immutableResult).toEqual(mutableTarget)
	})

	it('should handle complex scenarios with same record going through multiple states', () => {
		const states = [
			createBook('book:1', 'State 0', 'Author', 100),
			createBook('book:1', 'State 1', 'Author', 200),
			createBook('book:1', 'State 2', 'Author', 300),
			createBook('book:1', 'State 3', 'Author', 400),
		]

		// Start with remove (simulating book existed before)
		const diff1 = createDiff<TestBook>({}, {}, { 'book:1': states[0] })

		// Add it back with different content
		const diff2 = createDiff<TestBook>({ 'book:1': states[1] })

		// Update it
		const diff3 = createDiff<TestBook>({}, { 'book:1': [states[1], states[2]] })

		// Update it again
		const diff4 = createDiff<TestBook>({}, { 'book:1': [states[2], states[3]] })

		const result = squashRecordDiffs([diff1, diff2, diff3, diff4])

		expect((result.updated as any)['book:1']).toEqual([states[0], states[3]])
	})
})
