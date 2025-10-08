import { objectMapEntries } from '@tldraw/utils'
import { IdOf, UnknownRecord } from './BaseRecord'

/**
 * A diff describing the changes to records, containing collections of records that were added,
 * updated, or removed. This is the fundamental data structure used throughout the store system
 * to track and communicate changes.
 *
 * @example
 * ```ts
 * const diff: RecordsDiff<Book> = {
 *   added: {
 *     'book:1': { id: 'book:1', typeName: 'book', title: 'New Book' }
 *   },
 *   updated: {
 *     'book:2': [
 *       { id: 'book:2', typeName: 'book', title: 'Old Title' }, // from
 *       { id: 'book:2', typeName: 'book', title: 'New Title' }  // to
 *     ]
 *   },
 *   removed: {
 *     'book:3': { id: 'book:3', typeName: 'book', title: 'Deleted Book' }
 *   }
 * }
 * ```
 *
 * @public
 */
export interface RecordsDiff<R extends UnknownRecord> {
	/** Records that were created, keyed by their ID */
	added: Record<IdOf<R>, R>
	/** Records that were modified, keyed by their ID. Each entry contains [from, to] tuple */
	updated: Record<IdOf<R>, [from: R, to: R]>
	/** Records that were deleted, keyed by their ID */
	removed: Record<IdOf<R>, R>
}

/**
 * Creates an empty RecordsDiff with no added, updated, or removed records.
 * This is useful as a starting point when building diffs programmatically.
 *
 * @returns An empty RecordsDiff with all collections initialized to empty objects
 * @example
 * ```ts
 * const emptyDiff = createEmptyRecordsDiff<Book>()
 * // Result: { added: {}, updated: {}, removed: {} }
 * ```
 *
 * @internal
 */
export function createEmptyRecordsDiff<R extends UnknownRecord>(): RecordsDiff<R> {
	return { added: {}, updated: {}, removed: {} } as RecordsDiff<R>
}

/**
 * Creates the inverse of a RecordsDiff, effectively reversing all changes.
 * Added records become removed, removed records become added, and updated records
 * have their from/to values swapped. This is useful for implementing undo operations.
 *
 * @param diff - The diff to reverse
 * @returns A new RecordsDiff that represents the inverse of the input diff
 * @example
 * ```ts
 * const originalDiff: RecordsDiff<Book> = {
 *   added: { 'book:1': newBook },
 *   updated: { 'book:2': [oldBook, updatedBook] },
 *   removed: { 'book:3': deletedBook }
 * }
 *
 * const reversedDiff = reverseRecordsDiff(originalDiff)
 * // Result: {
 * //   added: { 'book:3': deletedBook },
 * //   updated: { 'book:2': [updatedBook, oldBook] },
 * //   removed: { 'book:1': newBook }
 * // }
 * ```
 *
 * @public
 */
export function reverseRecordsDiff(diff: RecordsDiff<any>) {
	const result: RecordsDiff<any> = { added: diff.removed, removed: diff.added, updated: {} }
	for (const [from, to] of Object.values(diff.updated)) {
		result.updated[from.id] = [to, from]
	}
	return result
}

/**
 * Checks whether a RecordsDiff contains any changes. A diff is considered empty
 * if it has no added, updated, or removed records.
 *
 * @param diff - The diff to check
 * @returns True if the diff contains no changes, false otherwise
 * @example
 * ```ts
 * const emptyDiff = createEmptyRecordsDiff<Book>()
 * console.log(isRecordsDiffEmpty(emptyDiff)) // true
 *
 * const nonEmptyDiff: RecordsDiff<Book> = {
 *   added: { 'book:1': someBook },
 *   updated: {},
 *   removed: {}
 * }
 * console.log(isRecordsDiffEmpty(nonEmptyDiff)) // false
 * ```
 *
 * @public
 */
export function isRecordsDiffEmpty<T extends UnknownRecord>(diff: RecordsDiff<T>) {
	return (
		Object.keys(diff.added).length === 0 &&
		Object.keys(diff.updated).length === 0 &&
		Object.keys(diff.removed).length === 0
	)
}

/**
 * Combines multiple RecordsDiff objects into a single consolidated diff.
 * This function intelligently merges changes, handling cases where the same record
 * is modified multiple times across different diffs. For example, if a record is
 * added in one diff and then updated in another, the result will show it as added
 * with the final state.
 *
 * @param diffs - An array of diffs to combine into a single diff
 * @param options - Configuration options for the squashing operation
 *   - mutateFirstDiff - If true, modifies the first diff in place instead of creating a new one
 * @returns A single diff that represents the cumulative effect of all input diffs
 * @example
 * ```ts
 * const diff1: RecordsDiff<Book> = {
 *   added: { 'book:1': { id: 'book:1', title: 'New Book' } },
 *   updated: {},
 *   removed: {}
 * }
 *
 * const diff2: RecordsDiff<Book> = {
 *   added: {},
 *   updated: { 'book:1': [{ id: 'book:1', title: 'New Book' }, { id: 'book:1', title: 'Updated Title' }] },
 *   removed: {}
 * }
 *
 * const squashed = squashRecordDiffs([diff1, diff2])
 * // Result: {
 * //   added: { 'book:1': { id: 'book:1', title: 'Updated Title' } },
 * //   updated: {},
 * //   removed: {}
 * // }
 * ```
 *
 * @public
 */
export function squashRecordDiffs<T extends UnknownRecord>(
	diffs: RecordsDiff<T>[],
	options?: {
		mutateFirstDiff?: boolean
	}
): RecordsDiff<T> {
	const result = options?.mutateFirstDiff
		? diffs[0]
		: ({ added: {}, removed: {}, updated: {} } as RecordsDiff<T>)

	squashRecordDiffsMutable(result, options?.mutateFirstDiff ? diffs.slice(1) : diffs)
	return result
}

/**
 * Applies an array of diffs to a target diff by mutating the target in-place.
 * This is the core implementation used by squashRecordDiffs. It handles complex
 * scenarios where records move between added/updated/removed states across multiple diffs.
 *
 * The function processes each diff sequentially, applying the following logic:
 * - Added records: If the record was previously removed, convert to an update; otherwise add it
 * - Updated records: Chain updates together, preserving the original 'from' state
 * - Removed records: If the record was added in this sequence, cancel both operations
 *
 * @param target - The diff to modify in-place (will be mutated)
 * @param diffs - Array of diffs to apply to the target
 * @example
 * ```ts
 * const targetDiff: RecordsDiff<Book> = {
 *   added: {},
 *   updated: {},
 *   removed: { 'book:1': oldBook }
 * }
 *
 * const newDiffs = [{
 *   added: { 'book:1': newBook },
 *   updated: {},
 *   removed: {}
 * }]
 *
 * squashRecordDiffsMutable(targetDiff, newDiffs)
 * // targetDiff is now: {
 * //   added: {},
 * //   updated: { 'book:1': [oldBook, newBook] },
 * //   removed: {}
 * // }
 * ```
 *
 * @internal
 */
export function squashRecordDiffsMutable<T extends UnknownRecord>(
	target: RecordsDiff<T>,
	diffs: RecordsDiff<T>[]
): void {
	for (const diff of diffs) {
		for (const [id, value] of objectMapEntries(diff.added)) {
			if (target.removed[id]) {
				const original = target.removed[id]
				delete target.removed[id]
				if (original !== value) {
					target.updated[id] = [original, value]
				}
			} else {
				target.added[id] = value
			}
		}

		for (const [id, [_from, to]] of objectMapEntries(diff.updated)) {
			if (target.added[id]) {
				target.added[id] = to
				delete target.updated[id]
				delete target.removed[id]
				continue
			}
			if (target.updated[id]) {
				target.updated[id] = [target.updated[id][0], to]
				delete target.removed[id]
				continue
			}

			target.updated[id] = diff.updated[id]
			delete target.removed[id]
		}

		for (const [id, value] of objectMapEntries(diff.removed)) {
			// the same record was added in this diff sequence, just drop it
			if (target.added[id]) {
				delete target.added[id]
			} else if (target.updated[id]) {
				target.removed[id] = target.updated[id][0]
				delete target.updated[id]
			} else {
				target.removed[id] = value
			}
		}
	}
}
