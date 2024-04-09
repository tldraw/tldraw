import { objectMapValues } from '@tldraw/utils'
import { IdOf, UnknownRecord } from './BaseRecord'

/**
 * A diff describing the changes to a record.
 *
 * @public
 */
export type RecordsDiff<R extends UnknownRecord> = {
	added: Record<IdOf<R>, R> | null
	updated: Record<IdOf<R>, [from: R, to: R]> | null
	removed: Record<IdOf<R>, R> | null
}

/** @public */
export const RecordsDiff = {
	/** Create an empty RecordsDiff */
	create<R extends UnknownRecord>(): RecordsDiff<R> {
		return { added: null, updated: null, removed: null } as RecordsDiff<R>
	},

	/**
	 * Reverse a record diff. Applying the reversed diff will undo the changes of the original diff.
	 */
	reverse<R extends UnknownRecord>(diff: RecordsDiff<R>): RecordsDiff<R> {
		const result: RecordsDiff<any> = { added: diff.removed, removed: diff.added, updated: null }
		if (diff.updated) {
			result.updated = {}
			for (const [from, to] of objectMapValues(diff.updated)) {
				result.updated[from.id] = [to, from]
			}
		}
		return result
	},

	/**
	 * Check if a diff is completely empty.
	 */
	isEmpty<R extends UnknownRecord>(diff: RecordsDiff<R>): boolean {
		return !diff.added && !diff.updated && !diff.removed
	},

	/**
	 * Squash a collection of diffs into a single diff.
	 *
	 * @param diffs - An array of diffs to squash.
	 * @returns A single diff that represents the squashed diffs.
	 * @public
	 */
	squash<R extends UnknownRecord>(diffs: RecordsDiff<R>[]): RecordsDiff<R> {
		const result = RecordsDiff.create<R>()
		for (const diff of diffs) {
			RecordsDiff.applyInPlace(result, diff)
		}
		return result
	},

	/**
	 * Apply the array `diffs` to the `target` diff, mutating it in-place.
	 * @internal
	 */
	applyInPlace<T extends UnknownRecord>(target: RecordsDiff<T>, diff: RecordsDiff<T>): void {
		if (diff.added) {
			for (const record of objectMapValues(diff.added)) {
				RecordsDiff.addRecord(target, record)
			}
		}

		if (diff.updated) {
			for (const update of objectMapValues(diff.updated)) {
				RecordsDiff.updateRecord(target, update[0], update[1])
			}
		}

		if (diff.removed) {
			for (const value of objectMapValues(diff.removed)) {
				RecordsDiff.removeRecord(target, value)
			}
		}
	},

	/**
	 * Record `record` as being added in diff `target`. Updates the diff in-place.
	 * @internal
	 */
	addRecord<R extends UnknownRecord>(target: RecordsDiff<R>, record: R): void {
		const id: IdOf<R> = record.id
		if (target.removed?.[id]) {
			const original = target.removed[id]
			delete target.removed[id]
			if (original !== record) {
				if (!target.updated) target.updated = {} as Record<IdOf<R>, [R, R]>
				target.updated[id] = [original, record]
			}
		} else {
			if (!target.added) target.added = {} as Record<IdOf<R>, R>
			target.added[id] = record
		}
	},

	/**
	 * Record `record` as being updated in diff `target`. Updates the diff in-place.
	 * @internal
	 */
	updateRecord<R extends UnknownRecord>(target: RecordsDiff<R>, from: R, to: R) {
		const id: IdOf<R> = from.id
		if (target.added?.[id]) {
			target.added[id] = to
			if (target.updated) delete target.updated[id]
			if (target.removed) delete target.removed[id]
			return
		}
		if (target.updated?.[id]) {
			target.updated[id][1] = to
			if (target.removed) delete target.removed[id]
			return
		}

		if (!target.updated) target.updated = {} as Record<IdOf<R>, [R, R]>
		target.updated[id] = [from, to]
		if (target.removed) delete target.removed[id]
	},

	/**
	 * Record `record` as being removed in diff `target`. Updates the diff in-place.
	 * @internal
	 */
	removeRecord<R extends UnknownRecord>(target: RecordsDiff<R>, record: R) {
		const id: IdOf<R> = record.id
		// the same record was added in this diff sequence, just drop it
		if (target.added?.[id]) {
			delete target.added[id]
			return
		}
		if (target.updated?.[id]) {
			delete target.updated[id]
		}
		if (!target.removed) target.removed = {} as Record<IdOf<R>, R>
		target.removed[id] = record
	},
}
