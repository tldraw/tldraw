import { objectMapFromEntries } from '@tldraw/utils'
import { IdOf, UnknownRecord } from './BaseRecord'

/**
 * A diff describing the changes to a record.
 *
 * @public
 */
export type RecordsDiff<R extends UnknownRecord> = {
	readonly added: null | { readonly [K in IdOf<R>]: R }
	readonly updated: null | { readonly [K in IdOf<R>]: readonly [from: R, to: R] }
	readonly removed: null | { readonly [K in IdOf<R>]: R }
}

/** @internal */
export class WorkingRecordsDiff<R extends UnknownRecord> {
	static merged<R extends UnknownRecord>(diffs: WorkingRecordsDiff<R>[]): WorkingRecordsDiff<R> {
		const merged = new WorkingRecordsDiff<R>()
		for (const diff of diffs) {
			merged.merge(diff)
		}
		return merged
	}
	constructor(
		public added: null | Map<IdOf<R>, R> = null,
		public updated: null | Map<IdOf<R>, [from: R, to: R]> = null,
		public removed: null | Map<IdOf<R>, R> = null
	) {}

	isEmpty() {
		return (
			(this.added === null || this.added.size === 0) &&
			(this.updated === null || this.updated.size === 0) &&
			(this.removed === null || this.removed.size === 0)
		)
	}

	toJson(): RecordsDiff<R> {
		return {
			added: this.added && this.added.size ? objectMapFromEntries([...this.added.entries()]) : null,
			updated:
				this.updated && this.updated.size
					? objectMapFromEntries([...this.updated.entries()])
					: null,
			removed:
				this.removed && this.removed.size
					? objectMapFromEntries([...this.removed.entries()])
					: null,
		}
	}

	merge(diff: WorkingRecordsDiff<R>) {
		if (diff.added) {
			for (const record of diff.added.values()) {
				this.add(record)
			}
		}
		if (diff.updated) {
			for (const update of diff.updated.values()) {
				this.update(update[0], update[1])
			}
		}
		if (diff.removed) {
			for (const record of diff.removed.values()) {
				this.remove(record)
			}
		}
	}

	add(record: R) {
		const removedOriginal = this.removed?.get(record.id)
		if (removedOriginal) {
			this.removed!.delete(record.id)
			if (removedOriginal !== record) {
				if (!this.updated) this.updated = new Map()
				this.updated.set(record.id, [removedOriginal, record])
			}
		} else {
			if (!this.added) this.added = new Map()
			this.added.set(record.id, record)
		}
	}

	update(prev: R, next: R) {
		if (this.added?.has(prev.id)) {
			this.updated?.delete(prev.id)
			this.removed?.delete(prev.id)
			this.added.set(next.id, next)
			return
		}

		const existingUpdated = this.updated?.get(prev.id)
		if (existingUpdated) {
			existingUpdated[1] = next
			this.removed?.delete(prev.id)
			return
		}

		if (!this.updated) this.updated = new Map()
		this.updated.set(prev.id, [prev, next])
		this.removed?.delete(prev.id)
	}

	remove(record: R) {
		if (this.added?.has(record.id)) {
			this.added.delete(record.id)
			return
		}
		if (!this.removed) this.removed = new Map()
		const updated = this.updated?.get(record.id)
		if (updated) {
			this.updated?.delete(record.id)
			this.removed?.set(record.id, updated[1])
			return
		}
		this.removed.set(record.id, record)
	}
}
