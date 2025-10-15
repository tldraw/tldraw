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

// Test interface for testing
interface TestBook extends BaseRecord<'book', RecordId<TestBook>> {
	title: string
	author: string
	pages: number
}

// Helper functions to create test records
function createBook(id: string, title: string, author: string, pages: number = 100): TestBook {
	return {
		id: id as RecordId<TestBook>,
		typeName: 'book',
		title,
		author,
		pages,
	}
}

// Helper to create a diff
function createDiff<R extends TestBook>(
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

describe('isRecordsDiffEmpty', () => {
	it('should return true for empty diffs and false for non-empty diffs', () => {
		const emptyDiff = createEmptyRecordsDiff<TestBook>()
		expect(isRecordsDiffEmpty(emptyDiff)).toBe(true)

		const addedDiff = createDiff<TestBook>({ 'book:1': createBook('book:1', 'Test', 'Author') })
		expect(isRecordsDiffEmpty(addedDiff)).toBe(false)

		const oldBook = createBook('book:1', 'Old Title', 'Author')
		const newBook = createBook('book:1', 'New Title', 'Author')
		const updatedDiff = createDiff<TestBook>({}, { 'book:1': [oldBook, newBook] })
		expect(isRecordsDiffEmpty(updatedDiff)).toBe(false)

		const removedDiff = createDiff<TestBook>(
			{},
			{},
			{ 'book:1': createBook('book:1', 'Deleted', 'Author') }
		)
		expect(isRecordsDiffEmpty(removedDiff)).toBe(false)
	})
})

describe('reverseRecordsDiff', () => {
	it('should reverse all operation types correctly', () => {
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

		// Added becomes removed
		expect(reversedDiff.removed['book:1']).toEqual(addedBook)
		// Removed becomes added
		expect(reversedDiff.added['book:3']).toEqual(removedBook)
		// Updated swaps from/to
		expect(reversedDiff.updated['book:2']).toEqual([newUpdatedBook, oldUpdatedBook])
	})
})

describe('squashRecordDiffs', () => {
	it('should handle core diff squashing operations', () => {
		// Add then update becomes single add with final state
		const initialBook = createBook('book:1', 'Initial Title', 'Author')
		const updatedBook = createBook('book:1', 'Updated Title', 'Author')

		const diff1 = createDiff<TestBook>({ 'book:1': initialBook })
		const diff2 = createDiff<TestBook>({}, { 'book:1': [initialBook, updatedBook] })
		const result1 = squashRecordDiffs([diff1, diff2])
		expect(result1).toEqual(createDiff<TestBook>({ 'book:1': updatedBook }))

		// Add then remove cancels out
		const book = createBook('book:1', 'Test Book', 'Author')
		const diff3 = createDiff<TestBook>({ 'book:1': book })
		const diff4 = createDiff<TestBook>({}, {}, { 'book:1': book })
		const result2 = squashRecordDiffs([diff3, diff4])
		expect(result2).toEqual(createEmptyRecordsDiff<TestBook>())

		// Remove then add becomes update
		const originalBook = createBook('book:1', 'Original', 'Author')
		const newBook = createBook('book:1', 'New', 'Author')
		const diff5 = createDiff<TestBook>({}, {}, { 'book:1': originalBook })
		const diff6 = createDiff<TestBook>({ 'book:1': newBook })
		const result3 = squashRecordDiffs([diff5, diff6])
		expect(result3).toEqual(createDiff<TestBook>({}, { 'book:1': [originalBook, newBook] }))

		// Chain updates together
		const v1 = createBook('book:1', 'Version 1', 'Author')
		const v2 = createBook('book:1', 'Version 2', 'Author')
		const v3 = createBook('book:1', 'Version 3', 'Author')
		const diff7 = createDiff<TestBook>({}, { 'book:1': [v1, v2] })
		const diff8 = createDiff<TestBook>({}, { 'book:1': [v2, v3] })
		const result4 = squashRecordDiffs([diff7, diff8])
		expect(result4).toEqual(createDiff<TestBook>({}, { 'book:1': [v1, v3] }))
	})
})

describe('squashRecordDiffsMutable', () => {
	it('should maintain consistency with squashRecordDiffs', () => {
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
})
