import { objectMapEntries } from '@tldraw/utils'
import { IdOf, UnknownRecord } from './BaseRecord'

/**
 * A diff describing the changes to a record.
 *
 * @public
 */
export interface RecordsDiff<R extends UnknownRecord> {
	added: Record<IdOf<R>, R>
	updated: Record<IdOf<R>, [from: R, to: R]>
	removed: Record<IdOf<R>, R>
}

/** @internal */
export function createEmptyRecordsDiff<R extends UnknownRecord>(): RecordsDiff<R> {
	return { added: {}, updated: {}, removed: {} } as RecordsDiff<R>
}

/** @public */
export function reverseRecordsDiff(diff: RecordsDiff<any>) {
	const result: RecordsDiff<any> = { added: diff.removed, removed: diff.added, updated: {} }
	for (const [from, to] of Object.values(diff.updated)) {
		result.updated[from.id] = [to, from]
	}
	return result
}

/**
 * Is a records diff empty?
 * @internal
 */
export function isRecordsDiffEmpty<T extends UnknownRecord>(diff: RecordsDiff<T>) {
	return (
		Object.keys(diff.added).length === 0 &&
		Object.keys(diff.updated).length === 0 &&
		Object.keys(diff.removed).length === 0
	)
}

/**
 * Squash a collection of diffs into a single diff.
 *
 * @param diffs - An array of diffs to squash.
 * @returns A single diff that represents the squashed diffs.
 * @public
 */
export function squashRecordDiffs<T extends UnknownRecord>(
	diffs: RecordsDiff<T>[]
): RecordsDiff<T> {
	const result = { added: {}, removed: {}, updated: {} } as RecordsDiff<T>

	squashRecordDiffsMutable(result, diffs)
	return result
}

/**
 * Apply the array `diffs` to the `target` diff, mutating it in-place.
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
