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

// Tests for SPEC.md §4 (RecordsDiff).
// Rule IDs like [D3] in test names refer to that document.

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
}

function book(id: string, title: string): Book {
	return { id: id as RecordId<Book>, typeName: 'book', title }
}

function diff(
	added: Record<string, Book> = {},
	updated: Record<string, [Book, Book]> = {},
	removed: Record<string, Book> = {}
): RecordsDiff<Book> {
	return { added, updated, removed } as RecordsDiff<Book>
}

describe('empty diffs (D)', () => {
	it('[D1] createEmptyRecordsDiff returns a diff with empty collections', () => {
		expect(createEmptyRecordsDiff()).toEqual({ added: {}, updated: {}, removed: {} })
	})

	it('[D1] isRecordsDiffEmpty is true exactly when all three collections are empty', () => {
		expect(isRecordsDiffEmpty(createEmptyRecordsDiff())).toBe(true)

		expect(isRecordsDiffEmpty(diff({ 'book:1': book('book:1', 'a') }))).toBe(false)
		expect(
			isRecordsDiffEmpty(diff({}, { 'book:1': [book('book:1', 'a'), book('book:1', 'b')] }))
		).toBe(false)
		expect(isRecordsDiffEmpty(diff({}, {}, { 'book:1': book('book:1', 'a') }))).toBe(false)
	})
})

describe('reversing diffs (D)', () => {
	it('[D2] swaps added and removed and reverses updated pairs', () => {
		const added = book('book:1', 'Added')
		const from = book('book:2', 'Old')
		const to = book('book:2', 'New')
		const removed = book('book:3', 'Removed')

		const reversed = reverseRecordsDiff(
			diff({ 'book:1': added }, { 'book:2': [from, to] }, { 'book:3': removed })
		)

		expect(reversed).toEqual(
			diff({ 'book:3': removed }, { 'book:2': [to, from] }, { 'book:1': added })
		)
	})
})

describe('squashing diffs (D)', () => {
	it('[D3] add then update becomes an add with the final value', () => {
		const v1 = book('book:1', 'v1')
		const v2 = book('book:1', 'v2')
		expect(squashRecordDiffs([diff({ 'book:1': v1 }), diff({}, { 'book:1': [v1, v2] })])).toEqual(
			diff({ 'book:1': v2 })
		)
	})

	it('[D3] add then remove cancels out', () => {
		const b = book('book:1', 'a')
		expect(squashRecordDiffs([diff({ 'book:1': b }), diff({}, {}, { 'book:1': b })])).toEqual(
			createEmptyRecordsDiff()
		)
	})

	it('[D3] update then update collapses from the original from to the final to', () => {
		const v1 = book('book:1', 'v1')
		const v2 = book('book:1', 'v2')
		const v3 = book('book:1', 'v3')
		expect(
			squashRecordDiffs([diff({}, { 'book:1': [v1, v2] }), diff({}, { 'book:1': [v2, v3] })])
		).toEqual(diff({}, { 'book:1': [v1, v3] }))
	})

	it('[D3] update then remove becomes a remove of the original from', () => {
		const v1 = book('book:1', 'v1')
		const v2 = book('book:1', 'v2')
		expect(
			squashRecordDiffs([diff({}, { 'book:1': [v1, v2] }), diff({}, {}, { 'book:1': v2 })])
		).toEqual(diff({}, {}, { 'book:1': v1 }))
	})

	it('[D3] remove then add becomes an update', () => {
		const original = book('book:1', 'Original')
		const replacement = book('book:1', 'New')
		expect(
			squashRecordDiffs([diff({}, {}, { 'book:1': original }), diff({ 'book:1': replacement })])
		).toEqual(diff({}, { 'book:1': [original, replacement] }))
	})

	it('[D3] remove then add of the identical object cancels out', () => {
		const same = book('book:1', 'Same')
		expect(squashRecordDiffs([diff({}, {}, { 'book:1': same }), diff({ 'book:1': same })])).toEqual(
			createEmptyRecordsDiff()
		)
	})

	it('[D4] does not mutate its inputs by default', () => {
		const v1 = book('book:1', 'v1')
		const v2 = book('book:1', 'v2')
		const first = diff({ 'book:1': v1 })
		const second = diff({}, { 'book:1': [v1, v2] })

		squashRecordDiffs([first, second])

		expect(first).toEqual(diff({ 'book:1': v1 }))
		expect(second).toEqual(diff({}, { 'book:1': [v1, v2] }))
	})

	it('[D4] mutateFirstDiff applies the result onto the first diff in place', () => {
		const v1 = book('book:1', 'v1')
		const v2 = book('book:1', 'v2')
		const first = diff({ 'book:1': v1 })

		const result = squashRecordDiffs([first, diff({}, { 'book:1': [v1, v2] })], {
			mutateFirstDiff: true,
		})

		expect(result).toBe(first)
		expect(first).toEqual(diff({ 'book:1': v2 }))
	})

	it('[D4] squashRecordDiffsMutable agrees with squashRecordDiffs', () => {
		const added = book('book:1', 'Book 1')
		const from = book('book:2', 'Old')
		const to = book('book:2', 'New')

		const diffs = [diff({ 'book:1': added }), diff({}, { 'book:2': [from, to] })]

		const immutableResult = squashRecordDiffs(diffs)
		const mutableTarget = createEmptyRecordsDiff<Book>()
		squashRecordDiffsMutable(mutableTarget, diffs)

		expect(mutableTarget).toEqual(immutableResult)
	})
})
