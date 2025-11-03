import { IdOf, UnknownRecord } from '@tldraw/store'
import { objectMapEntries } from 'tldraw'

/**
 * A sync diff with per-record clock values for fine-grained persistence.
 * Unlike RecordsDiff, each record operation includes the clock value from
 * when that specific operation was applied.
 *
 * @example
 * ```ts
 * const syncDiff: SyncDiff<Book> = {
 *   added: {
 *     'book:1': [{ id: 'book:1', typeName: 'book', title: 'New Book' }, 42]
 *   },
 *   updated: {
 *     'book:2': [
 *       { id: 'book:2', typeName: 'book', title: 'Old Title' },
 *       { id: 'book:2', typeName: 'book', title: 'New Title' },
 *       43
 *     ]
 *   },
 *   removed: {
 *     'book:3': [{ id: 'book:3', typeName: 'book', title: 'Deleted Book' }, 44]
 *   }
 * }
 * ```
 *
 * @public
 */
export interface SyncDiff<R extends UnknownRecord> {
	/** Records that were added: [record, clockWhenAdded] */
	added: Record<IdOf<R>, readonly [record: R, clock: number]>

	/** Records that were updated: [beforeState, afterState, clockWhenUpdated] */
	updated: Record<IdOf<R>, readonly [from: R, to: R, clock: number]>

	/** Records that were removed: [record, clockWhenRemoved] */
	removed: Record<IdOf<R>, readonly [record: R, clock: number]>

	serverClock: number
	documentClock: number
	tombstoneHistoryStartsAt: number
}

export function emptySyncDiff<R extends UnknownRecord>(): SyncDiff<R> {
	return {
		added: {} as Record<IdOf<R>, readonly [record: R, clock: number]>,
		updated: {} as Record<IdOf<R>, readonly [from: R, to: R, clock: number]>,
		removed: {} as Record<IdOf<R>, readonly [record: R, clock: number]>,
		tombstoneHistoryStartsAt: 0,
		documentClock: 0,
		serverClock: 0,
	}
}

/**
 * Mutably squash an array of SyncDiffs into the target diff.
 * Handles complex scenarios where records move between added/updated/removed.
 * Always keeps the latest (highest) clock value for each record.
 *
 * @param target - The target diff to mutate
 * @param diffs - Array of diffs to squash into the target
 * @public
 */
export function squashSyncDiffsMutable<R extends UnknownRecord>(
	target: SyncDiff<R>,
	diffs: SyncDiff<R>[]
): void {
	for (const diff of diffs) {
		// Process each operation type
		for (const [id, [record, clock]] of objectMapEntries(diff.added)) {
			if (id in target.removed) {
				// Was removed, now added again - becomes an update
				const [removedRecord, removedClock] = target.removed[id]
				delete target.removed[id]
				target.updated[id] = [removedRecord, record, Math.max(removedClock, clock)]
			} else if (id in target.updated) {
				// Was updated, now added again (replace) - keep as update with latest clock
				const [from, _to, prevClock] = target.updated[id]
				target.updated[id] = [from, record, Math.max(prevClock, clock)]
			} else {
				// New addition - keep latest if already present
				if (id in target.added) {
					const [_prevRecord, prevClock] = target.added[id]
					target.added[id] = [record, Math.max(prevClock, clock)]
				} else {
					target.added[id] = [record, clock]
				}
			}
		}

		for (const [id, [from, to, clock]] of objectMapEntries(diff.updated)) {
			if (id in target.added) {
				// Was added earlier, now updated - keep as added with final state and latest clock
				const [_prevRecord, prevClock] = target.added[id]
				target.added[id] = [to, Math.max(prevClock, clock)]
			} else if (id in target.updated) {
				// Was updated before, update again - chain updates with latest clock
				const [origFrom, _prevTo, prevClock] = target.updated[id]
				target.updated[id] = [origFrom, to, Math.max(prevClock, clock)]
			} else if (id in target.removed) {
				// Was removed, now updated? This shouldn't happen, but handle it
				const [removedRecord, removedClock] = target.removed[id]
				delete target.removed[id]
				target.updated[id] = [removedRecord, to, Math.max(removedClock, clock)]
			} else {
				// New update
				target.updated[id] = [from, to, clock]
			}
		}

		for (const [id, [record, clock]] of objectMapEntries(diff.removed)) {
			if (id in target.added) {
				// Was added then removed - cancel out, remove from diff
				delete target.added[id]
			} else if (id in target.updated) {
				// Was updated then removed - becomes removal with latest clock
				const [_from, _to, prevClock] = target.updated[id]
				delete target.updated[id]
				target.removed[id] = [record, Math.max(prevClock, clock)]
			} else {
				// New removal - keep latest if already present
				if (id in target.removed) {
					const [_prevRecord, prevClock] = target.removed[id]
					target.removed[id] = [record, Math.max(prevClock, clock)]
				} else {
					target.removed[id] = [record, clock]
				}
			}
		}

		target.tombstoneHistoryStartsAt = diff.tombstoneHistoryStartsAt
		target.documentClock = diff.documentClock
		target.serverClock = diff.serverClock
	}
}
